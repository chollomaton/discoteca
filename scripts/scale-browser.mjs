import {chromium} from 'playwright';
import {createServer} from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=process.cwd();
const original=JSON.parse(fs.readFileSync('datos.json','utf8'));
assert(Array.isArray(original.discos)&&original.discos.length,'datos.json debe contener discos');

/* Esta prueba mide escala de UI, no la cuota del navegador. Clonar fichas reales
   completas multiplica tracklists/metadata y puede superar localStorage antes de
   que arranque la app, confundiendo cuota con rendimiento de render. */
function dataset(size){
  const discos=[];
  for(let i=0;i<size;i++){
    const base=original.discos[i%original.discos.length];
    discos.push({
      id:`scale-${size}-${i}`,
      lista:'coleccion',
      artista:`${base.artista||'Artista'} ${i%97}`,
      titulo:`${base.titulo||'Álbum'} ${i}`,
      'año':base['año']||'2000',
      formato:i%3===0?'Vinilo':'CD',
      genero:base.genero||'',
      pais:base.pais||'',
      sello:base.sello||'',
      portada:'',fotoDisco:'',mbid:'',discogs:'',
      tracklist:[{titulo:'Pista de prueba',duracion:'03:30'}],
      etiquetas:[],escuchasFechas:[],
      mod:base.mod||new Date(0).toISOString()
    });
  }
  return {version:original.version||1,discos,borrados:[]};
}

const server=createServer((req,res)=>{
  try{
    let f=path.join(root,new URL(req.url,'http://local').pathname);
    if(fs.statSync(f).isDirectory()) f=path.join(f,'index.html');
    const types={'.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
    res.setHeader('Content-Type',types[path.extname(f)]||'text/html');
    res.end(fs.readFileSync(f));
  }catch{res.statusCode=404;res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});

try{
  for(const size of [250,1000,5000]){
    const context=await browser.newContext({viewport:{width:1440,height:844},reducedMotion:'reduce'});
    const data=dataset(size);
    const serialized=JSON.stringify(data);
    await context.addInitScript(({doc,expected})=>{
      localStorage.setItem('discoteca.local.v4',doc);
      window.__scaleSeedOk=localStorage.getItem('discoteca.local.v4')?.length===expected;
    },{doc:serialized,expected:serialized.length});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
    await page.route('https://**/*',r=>r.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}));
    const started=Date.now();
    await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded',timeout:30000});
    assert.equal(await page.evaluate(()=>window.__scaleSeedOk),true,`semilla localStorage ${size}`);
    await page.waitForSelector('.tile',{timeout:30000});
    const elapsed=Date.now()-started;
    assert.equal(await page.evaluate(()=>DB.discos.length),size,`carga ${size}`);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`sin overflow ${size}`);
    assert.deepEqual(errors,[],`sin errores ${size}`);

    const initialTiles=await page.locator('.tile').count();
    assert(initialTiles>0&&initialTiles<=160,`render inicial acotado ${size}: ${initialTiles}`);

    // Busca por el título sintético inequívoco del primer disco. Esperamos al
    // resultado en vez de usar una pausa fija: CI puede procesar el input más lento.
    const search=page.locator('#q');
    if(await search.count()){
      await search.fill('Álbum 0');
      await page.waitForFunction(()=>{
        const tiles=[...document.querySelectorAll('.tile')];
        return tiles.length>0 && tiles.some(t=>(t.textContent||'').includes('Álbum 0'));
      },null,{timeout:5000});
      assert(await page.locator('.tile').count()>0,`búsqueda ${size}`);
      await search.fill('');
      await page.waitForFunction(()=>document.querySelectorAll('.tile').length>0,null,{timeout:5000});
    }
    const rerenderStarted=Date.now();
    await page.evaluate(()=>{ if(typeof setView==='function') setView('col'); if(typeof paintCol==='function') paintCol(); });
    await page.waitForSelector('.tile',{timeout:30000});
    const rerenderElapsed=Date.now()-rerenderStarted;
    const rerenderTiles=await page.locator('.tile').count();
    assert(rerenderTiles>0&&rerenderTiles<=160,`rerender acotado ${size}: ${rerenderTiles}`);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`sin overflow tras rerender ${size}`);
    assert.deepEqual(errors,[],`sin errores tras interacción ${size}`);
    console.log(`✓ escala ${size}: carga ${elapsed} ms, rerender ${rerenderElapsed} ms, ${initialTiles}/${rerenderTiles} nodos, búsqueda OK, semilla ${(serialized.length/1024).toFixed(0)} KiB`);
    await context.close();
  }
}finally{
  await browser.close();
  server.close();
}
