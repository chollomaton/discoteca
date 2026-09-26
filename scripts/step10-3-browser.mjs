// Referencia Fase 13 autorizada tras revisar las 5 escenas en 1440/390. Tolerancias intactas.
import {compareScreenshots} from './visual-compare.mjs';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
const root=path.resolve('.visual-check'),outputs=path.resolve('visual-results');
fs.mkdirSync(root,{recursive:true});fs.mkdirSync(outputs,{recursive:true});
const {execFileSync}=await import('node:child_process');
for(const [name,ref] of [['baseline','336d036183c842be5bb6e4cc48d3906446dbb011'],['discoteca','HEAD']]){
 const dest=path.join(root,name);fs.mkdirSync(dest,{recursive:true});
 const archive=execFileSync('git',['archive',ref],{maxBuffer:20*1024*1024});
 execFileSync('tar',['-x','-C',dest],{input:archive});
}
const server=createServer((req,res)=>{try{let f=path.join(root,new URL(req.url,'http://local').pathname);if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.json')?'application/json':f.endsWith('.png')?'image/png':'text/html');res.end(fs.readFileSync(f));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(8766,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--disable-gpu','--disable-skia-runtime-opts','--disable-partial-raster']});
const doc=JSON.parse(fs.readFileSync('datos.json','utf8'));
try{for(const width of [1440,390]){
 const shots={};
 for(const version of ['baseline','discoteca']){
 const context=await browser.newContext({viewport:{width,height:width===390?844:1000},serviceWorkers:'block',colorScheme:'light',reducedMotion:'reduce'});
 await context.addInitScript(doc=>{localStorage.setItem('discoteca.local.v4',JSON.stringify(doc));Math.random=()=>0.4;},doc);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://**/*',r=>r.abort());
 await page.goto(`http://127.0.0.1:8766/${version}/`);await page.waitForFunction(()=>typeof DB!=='undefined'&&DB.discos.length===220&&document.querySelector('.tile'));
 await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'});
 // Se usan los mismos datos locales y no se consulta ni modifica el repositorio remoto.
 for(const scene of ['coleccion','ficha','importacion','tecnica','revision']){
 await page.evaluate(()=>{document.querySelectorAll('.scrim').forEach(n=>n.remove());});
 if(scene==='ficha')await page.evaluate(()=>openDetail(DB.discos[0].id));
 if(scene==='importacion')await page.evaluate(()=>pantallaImportacion({nuevos:[],identicos:[],dudosos:[]},0));
 if(scene==='tecnica')await page.evaluate(()=>{const s=sheet('Ficha técnica','<div id="pruebaTecnica"></div>');pintaTecnica(s.querySelector('#pruebaTecnica'),DB.discos.find(d=>d.tecnica)||DB.discos[0]);});
 if(scene==='revision')await page.evaluate(()=>pantallaRevision());
 // Las portadas fallidas reintentan a los 900 ms: comparar solo el estado estable.
 await page.waitForFunction(()=>[...document.querySelectorAll('img[data-img-retry]')].every(img=>img.complete && !img.dataset.reintento));
 await page.waitForTimeout(250);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${scene} ${width}: overflow`);
 const png=await page.screenshot({animations:'disabled',path:path.join(outputs,`${version}-${scene}-${width}.png`)});
 if(version==='baseline')shots[scene]=png;else await compareScreenshots(page,png,shots[scene],`${scene} ${width}`);
 }
 assert.deepEqual(errors,[]);console.log(`✓ ${version} ${width}px: 220 discos, 5 pantallas sin errores`);await context.close();
 }
 console.log(`✓ ${width}px: comparación visual superada (máx. 5 píxeles con delta 1/255)`);
}}finally{await browser.close();server.close();}
