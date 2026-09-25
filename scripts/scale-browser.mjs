import {chromium} from 'playwright';
import {createServer} from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=process.cwd();
const original=JSON.parse(fs.readFileSync('datos.json','utf8'));
assert(Array.isArray(original.discos)&&original.discos.length,'datos.json debe contener discos');

function dataset(size){
  const discos=[];
  for(let i=0;i<size;i++){
    const base=original.discos[i%original.discos.length];
    discos.push({...base,id:`scale-${size}-${i}`,artista:`${base.artista||'Artista'} ${i%97}`,titulo:`${base.titulo||'Álbum'} ${i}`,portada:'',fotoDisco:'',mbid:'',discogs:'',mod:base.mod||new Date(0).toISOString()});
  }
  return {...original,discos,borrados:[]};
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
    await context.addInitScript(doc=>localStorage.setItem('discoteca.local.v4',JSON.stringify(doc)),data);
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
    await page.route('https://**/*',r=>r.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}));
    const started=Date.now();
    await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForSelector('.tile',{timeout:30000});
    const elapsed=Date.now()-started;
    assert.equal(await page.evaluate(()=>DB.discos.length),size,`carga ${size}`);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`sin overflow ${size}`);
    assert.deepEqual(errors,[],`sin errores ${size}`);

    // Ejercita el render real con búsqueda, cambio de vista y restauración.
    const search=page.locator('#q');
    if(await search.count()){
      await search.fill('Artista');
      await page.waitForTimeout(80);
      await search.fill('');
    }
    await page.evaluate(()=>{ if(typeof setView==='function') setView('col'); if(typeof paintCol==='function') paintCol(); });
    await page.waitForSelector('.tile',{timeout:30000});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`sin overflow tras rerender ${size}`);
    console.log(`✓ escala ${size}: carga y rerender reales en ${elapsed} ms, sin errores/overflow`);
    await context.close();
  }
}finally{
  await browser.close();
  server.close();
}
