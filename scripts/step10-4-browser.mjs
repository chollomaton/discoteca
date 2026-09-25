import {chromium} from 'playwright';
import {createServer} from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(), doc=JSON.parse(fs.readFileSync('datos.json','utf8'));
const server=createServer((req,res)=>{
 try{
  let f=path.join(root,new URL(req.url,'http://local').pathname);
  if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');
  const types={'.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
  res.setHeader('Content-Type',types[path.extname(f)]||'text/html');res.end(fs.readFileSync(f));
 }catch{res.statusCode=404;res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'});
  await context.addInitScript(doc=>localStorage.setItem('discoteca.local.v4',JSON.stringify(doc)),doc);
  const page=await context.newPage(), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  // External covers and metadata are replaced locally; no remote collection writes.
  await page.route('https://**/*',r=>r.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForSelector('.tile');
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.evaluate(()=>{readOnly=false;paintCol();});
  async function toggle(selector){
   const button=page.locator(selector).first();
   const before=await button.getAttribute('aria-pressed');
   assert(['true','false'].includes(before),selector+' initial state');
   await button.focus();await page.keyboard.press('Enter');
   assert.equal(await button.getAttribute('aria-pressed'),String(before!=='true'));
   assert(await button.evaluate(b=>document.activeElement===b),selector+' keeps focus');
   assert.equal(await button.evaluate(b=>b.getAnimations().length),0,'reduced motion');
   await page.keyboard.press('Space');
   assert.equal(await button.getAttribute('aria-pressed'),before,selector+' reversible');
  }
  await toggle('.tile [data-oir]');
  await page.locator('[data-collection-action="explorar"]').click();
  await toggle('[data-explore-listen]');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Explorar overflow');
  await page.keyboard.press('Escape');
  await page.evaluate(()=>openDetail(DB.discos.find(d=>!d.enlazado).id));
  await toggle('#escuchado');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'detail overflow');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>{
   const original=window.scrollTo;let behavior;
   window.scrollTo=o=>behavior=o.behavior;setView('col');window.scrollTo=original;return behavior;
  }),'auto','navigation respects reduced motion');
  await page.emulateMedia({reducedMotion:'no-preference'});
  assert(await page.evaluate(()=>{
   const b=document.querySelector('.tile [data-oir]');microFeedback(b);
   return b.getAnimations().length===1;
  }),'lightweight feedback enabled');
  await page.emulateMedia({reducedMotion:'reduce'});
  // Real service worker install and offline reload, including collection JSON exclusion.
  await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;});
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  assert(await page.evaluate(async()=>{
   const cache=await caches.open('discoteca-v60'),keys=await cache.keys();
   return keys.some(r=>r.url.endsWith('/index.html'))&&!keys.some(r=>r.url.includes('datos.json'));
  }),'PWA shell cached without collection data');
  await context.setOffline(true);await page.reload();await page.waitForSelector('.tile');
  assert.equal(await page.evaluate(()=>VERSION),'2026.09.25-phase10.4');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'offline overflow');
  assert.deepEqual(errors,[],'console and runtime errors');
  console.log(`✓ UX/PWA ${width}x844: reversible actions, focus, reduced motion, offline and console`);
  await context.close();
 }
}finally{await browser.close();server.close();}
