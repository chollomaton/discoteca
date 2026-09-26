import {chromium} from 'playwright';
import {createServer} from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(), source=JSON.parse(fs.readFileSync('datos.json','utf8'));
const server=createServer((req,res)=>{try{let f=path.join(root,new URL(req.url,'http://local').pathname);if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webmanifest':'application/manifest+json'})[path.extname(f)]||'text/html');res.end(fs.readFileSync(f));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
fs.mkdirSync('visual-results',{recursive:true});
try{
for(const width of [1440,390])for(const size of [250,1000,5000]){
 const doc={version:4,borrados:[],discos:Array.from({length:size},(_,i)=>({id:'p13-'+i,artista:'Artist '+(i%97),titulo:'Album '+i,año:'2000',formato:i%2?'CD':'Vinilo',lista:'coleccion',genero:'Genre '+(i%5),portada:'',sinFoto:1,tracklist:Array.from({length:16},(_,j)=>({titulo:'Track '+j,duracion:'03:00'})),etiquetas:[],escuchasFechas:[],mod:'2020-01-01T00:00:00Z'}))};
 const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'});
 await context.addInitScript(doc=>{if(!localStorage.getItem('discoteca.local.v4'))localStorage.setItem('discoteca.local.v4',JSON.stringify(doc));},doc);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('https://**/*',r=>r.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}));
 await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForSelector('.tile');
 await page.evaluate(()=>{window.__before=JSON.stringify(DB);window.__renders=0;window.__paint=paintCol;paintCol=function(){window.__renders++;return window.__paint();};const q=document.getElementById('q');for(let i=0;i<10;i++){q.value='Album '+i;q.dispatchEvent(new Event('input'));}});
 await page.waitForTimeout(220);assert.equal(await page.evaluate(()=>__renders),1,'10 inputs -> one render');
 await page.evaluate(()=>{document.getElementById('q').value='';document.getElementById('q').dispatchEvent(new Event('input'));});assert.equal(await page.evaluate(()=>__renders),2,'clear immediately');
 await page.evaluate(()=>{__renders=0;fType='CD';solicitarBiblioteca();fGen='Genre 1';solicitarBiblioteca();sortBy='title';document.getElementById('sortBy').value=sortBy;solicitarBiblioteca();});await page.waitForTimeout(80);
 assert.equal(await page.evaluate(()=>__renders),1,'selectors coalesced');assert(await page.evaluate(()=>filtrados(coleccion()).every(d=>d.formato==='CD'&&d.genero==='Genre 1')));
 await page.reload();await page.waitForSelector('.tile');assert(await page.evaluate(()=>fType==='CD'&&fGen==='Genre 1'&&sortBy==='title'&&document.getElementById('q').value===''),'local restore without search');
 await page.evaluate(()=>{fType='all';fGen='';grupo='genero';document.getElementById('selGroup').value=grupo;paintCol();});
 assert((await page.locator('.tile').count())<=160,'grouped bounded');
 await page.locator('[data-pagina="1"]').click();assert((await page.locator('.tile').count())<=160,'second page bounded');
 await page.evaluate(()=>{window.scrollTo(0,300);document.getElementById('q').focus({preventScroll:true});window.__scroll=scrollY;window.__ids=ordenVisualBiblioteca().map(d=>d.id);openDetail(__ids[1]);});
 await page.waitForSelector('.detalle-nav');assert.equal(await page.locator('.album-sheet .detalle-nav span').textContent(),`2 de ${size}`);
 await page.locator('.album-sheet .detalle-nav button').nth(1).focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.album-sheet .detalle-nav span').textContent(),`3 de ${size}`);
 assert.equal(await page.locator('#dTL details').count(),1,'long tracklist collapsible');
 await page.keyboard.press('Escape');await page.waitForTimeout(60);assert(await page.evaluate(()=>document.activeElement.id==='q'&&scrollY===__scroll),'exact focus and scroll return');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'library overflow');
 await page.evaluate(()=>{window.__snapshot=JSON.stringify(DB);abrirDiagnostico();});assert(await page.locator('.calidad-aviso').count()>0);assert(await page.evaluate(()=>JSON.stringify(DB)===__snapshot),'non-destructive diagnosis');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'diagnosis overflow');await page.keyboard.press('Escape');
 await page.evaluate(()=>setView('stats'));assert(await page.locator('[aria-label="Uso de tu colección"]').count());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'stats overflow');
 await page.screenshot({path:`visual-results/phase13-stats-${width}-${size}.png`,fullPage:true});
 await page.evaluate(()=>{setView('col');fType='all';fGen='';grupo='none';modo='grid';paintCol();});
 await page.screenshot({path:`visual-results/phase13-library-${width}-${size}.png`,fullPage:true});
 assert(await page.evaluate(()=>[...document.querySelectorAll('#segType button,#segMode button')].every(b=>b.getAttribute('aria-pressed')===String(b.classList.contains('on')))),'ARIA consistent');
 if(size===5000){
   await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;});await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
   assert(await page.evaluate(async()=>{for(const k of await caches.keys())for(const req of await(await caches.open(k)).keys())if(/datos\.json|backups/.test(req.url))return false;return true;}));
   await context.setOffline(true);await page.reload();await page.waitForSelector('.tile');assert((await page.locator('.tile').count())<=160,'offline bounded');
 }
 assert.deepEqual(errors,[],`no errors ${width}/${size}`);console.log(`✓ Phase13 ${width}/${size}: debounce, state, filtered navigation, focus, scroll, diagnosis, stats, bounded DOM, ARIA and offline`);
 await context.close();
}
}finally{await browser.close();server.close();}
