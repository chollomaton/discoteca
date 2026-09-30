import {chromium} from 'playwright';
import {createServer} from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
const root=process.cwd(), profile=fs.mkdtempSync(path.join(os.tmpdir(),'discoteca-credentials-'));
let version=0;
const server=createServer((req,res)=>{try{
 let file=path.join(root,new URL(req.url,'http://local').pathname);if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 let body=fs.readFileSync(file);if(file.endsWith('/sw.js'))body=Buffer.from(body.toString().replace(/discoteca-v\d+/,`discoteca-v${900+version}`));
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(body);
}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/`;
let context,page;
const expected={owner:'fixture',repo:'collection',token:'fixture-token',discogs:'fixture-discogs',anthropic:'fixture-anthropic',lastfm:'fixture-lastfm',ticketmaster:'fixture-ticketmaster',audd:'fixture-audd'};
const open=async()=>{
 context=await chromium.launchPersistentContext(profile,{headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 await context.route('https://**/*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(r.request().url().includes('/contents/')?{sha:'fixture',content:Buffer.from(JSON.stringify({version:4,discos:[],borrados:[]})).toString('base64')}:{private:true,permissions:{push:true}})}));
 page=await context.newPage();page.on('dialog',d=>d.accept());await page.goto(url);await page.waitForFunction(()=>typeof cargaColeccion!=='undefined'&&cargaColeccion!=='loading');
};
const check=async label=>{await page.waitForFunction(()=>typeof CFG!=='undefined'&&CFG.token);const cfg=await page.evaluate(()=>CFG);for(const [k,v] of Object.entries(expected))assert.equal(cfg[k],v,`${label}: ${k}`);console.log('✓ '+label);};
try{
 await open();await page.evaluate(()=>pantallaSync());
 for(const [id,k] of Object.entries({sOwner:'owner',sRepo:'repo',sToken:'token',sDisc:'discogs',sAntropic:'anthropic',sLastfm:'lastfm',sTM:'ticketmaster',sAudd:'audd'}))await page.locator('#'+id).fill(expected[k]);
 if(await page.locator('#sRecordar').count())await page.locator('#sRecordar').uncheck();
 await page.locator('#sOk').click();await page.waitForFunction(()=>CFG.token==='fixture-token'&&!configuracionEnCurso);await page.evaluate(()=>guardarCfg());
 await page.reload();await check('guardar desde UI → boot tras reload normal');
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
 for(let n=1;n<=3;n++){
  version++;await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
  await page.getByRole('button',{name:'Actualizar',exact:true}).click();await page.waitForURL(/app-update=/);await check('nuevo SW + botón Actualizar '+n);
  await page.reload();await check('reload posterior '+n);
 }
 await context.close();await open();await check('cierre/reapertura de navegador con mismo perfil');
 await page.evaluate(async()=>{await idbSet(K_CFG,{});});await page.reload();await check('IDB vacío, localStorage válido');
 await context.addInitScript(()=>{indexedDB.open=()=>{throw Error('fixture IDB unavailable');};});
 await page.reload();await check('IDB fallando, localStorage válido');
 await page.evaluate(async()=>{for(const k of CLAVES_CFG.concat(['owner','repo']))CFG[k]='';await guardarCfg();});await check('vacíos no sustituyen credenciales válidas');
 await page.reload();await check('fallback persiste tras reload');
 await context.close();await open();await check('recuperación de IDB');
 await page.evaluate(()=>pantallaSync());await page.locator('#sOff').click();
 await page.waitForFunction(()=>!CFG.token);await page.waitForFunction(async()=>!(await idbGet(K_CFG)).token);
 const cleared=await page.evaluate(async()=>({idb:await idbGet(K_CFG),local:JSON.parse(localStorage.getItem(LS_CFG)),session:sessionStorage.getItem(SS_CFG_UPDATE)}));
 for(const storage of [cleared.idb,cleared.local])for(const k of Object.keys(expected).filter(k=>!['owner','repo'].includes(k)))assert.equal(storage[k],'');assert.equal(cleared.session,null);
 await page.reload();assert.equal(await page.evaluate(()=>CFG.token),'');console.log('✓ Desconectar limpia las tres copias y no resucita tras reload');
}finally{await context?.close();server.close();fs.rmSync(profile,{recursive:true,force:true});}
