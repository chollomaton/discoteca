import {chromium} from 'playwright';
import {createServer} from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd();
const server=createServer((req,res)=>{try{let f=path.join(root,new URL(req.url,'http://local').pathname);if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.json')?'application/json':f.endsWith('.png')?'image/png':'text/html');res.end(fs.readFileSync(f));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
const doc=JSON.parse(fs.readFileSync('datos.json','utf8'));
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
 await context.addInitScript(doc=>localStorage.setItem('discoteca.local.v4',JSON.stringify(doc)),doc);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://**/*',r=>r.abort());
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 await page.waitForFunction(()=>document.querySelector('.tile'));
 const check=async(fn,label)=>assert(await page.evaluate(fn),label);
 await check(()=>document.querySelectorAll('[aria-current="page"]').length===2,'initial navigation');
 for(const v of ['wish','stats','db','col']){
  await page.evaluate(v=>setView(v),v);
  await check(()=>[...document.querySelectorAll('#tabs button,#tabbar button[data-v]')].every(b=>(b.getAttribute('aria-current')==='page')===b.classList.contains('on')),'navigation state');
 }
 await page.locator('#segType [data-f="CD"]').click();
 await page.locator('#segMode [data-m="list"]').click();
 await check(()=>[...document.querySelectorAll('.seg button')].every(b=>b.getAttribute('aria-pressed')===String(b.classList.contains('on'))),'segmented state');
 await page.locator('#segType [data-f="all"]').click();
 await page.locator('#segMode [data-m="grid"]').click();
 // Dynamic controls and changed tooltip names, preserving explicit names.
 await page.evaluate(()=>{const b=document.createElement('button');b.id='dynamicTip';b.dataset.tip='Primero';document.body.appendChild(b);});
 await page.waitForFunction(()=>document.querySelector('#dynamicTip').getAttribute('aria-label')==='Primero');
 await page.evaluate(()=>document.querySelector('#dynamicTip').dataset.tip='Segundo');
 await page.waitForFunction(()=>document.querySelector('#dynamicTip').getAttribute('aria-label')==='Segundo');
 await page.evaluate(()=>document.querySelector('#dynamicTip').remove());
 await check(()=>[...document.querySelectorAll('button[data-tip]')].every(b=>b.textContent.trim()||b.getAttribute('aria-label')||b.getAttribute('aria-labelledby')),'icon button names');
 // Both command shortcuts; selection, empty results, Enter, and all close paths.
 for(const shortcut of ['Control+k','Meta+k']){
  await page.locator('#btnPal').focus();await page.keyboard.press(shortcut);
  await page.waitForSelector('#pq');
  await check(()=>document.querySelector('#pq').getAttribute('aria-activedescendant')==='pal-option-0','initial option');
  await page.keyboard.press('ArrowDown');
  await check(()=>document.querySelector('#pq').getAttribute('aria-activedescendant')==='pal-option-1'&&document.querySelectorAll('[role="option"][aria-selected="true"]').length===1,'arrow selection');
  await page.keyboard.press('ArrowUp');
  await page.locator('#pq').fill('zzzz-no-match-123456');
  await check(()=>!document.querySelector('#pq').hasAttribute('aria-activedescendant')&&!document.querySelector('[role="option"]'),'empty results');
  await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await page.keyboard.press('Escape');
  await check(()=>document.activeElement.id==='btnPal'&&!document.querySelector('.pal'),'palette focus restoration');
 }
 await page.locator('#btnPal').click();await page.locator('#pq').fill('Estadísticas');await page.keyboard.press('Enter');
 await check(()=>view==='stats'&&!document.querySelector('.pal'),'palette executes selection');
 await page.evaluate(()=>setView('col'));
 for(const close of ['button','backdrop']){
  await page.locator('#btnPal').click();
  if(close==='button')await page.locator('#palCerrar').click();else await page.locator('.pal').click({position:{x:2,y:2}});
  await page.locator('#q').focus();
  await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  await check(()=>!document.querySelector('.pal,.scrim'),'no stale palette keyboard handler');
 }
 // Nested lightbox must keep sheet open and restore the real opener.
 await page.evaluate(()=>{ readOnly=false; DB.discos[0].valoracion=0; openDetail(DB.discos[0].id); });await page.waitForTimeout(50);
 await page.locator('#covZoom').focus();
 await page.evaluate(()=>lightbox('https://example.com/cover.png'));
 await page.keyboard.press('Tab');await check(()=>document.activeElement.className==='lightbox','lightbox focus containment');
 await page.keyboard.press('Escape');
 await check(()=>!!document.querySelector('.scrim')&&!document.querySelector('.lightbox')&&document.activeElement.id==='covZoom','lightbox Escape restoration');
 await page.evaluate(()=>lightbox('https://example.com/cover.png'));await page.locator('.lightbox').click();
 await check(()=>document.activeElement.id==='covZoom','lightbox click restoration');
 // Real rating controls: keyboard persists value, toggles off, and retains focus after rerender.
 const stars=page.locator('.scrim .stars.big [data-v="3"]').first();
 await stars.focus();await page.keyboard.press('Enter');
 await check(()=>document.activeElement.dataset.v==='3'&&document.activeElement.getAttribute('aria-pressed')==='true'&&DB.discos[0].valoracion===3&&!!document.activeElement.closest('.stars.big'),'rating Enter and focus');
 await page.keyboard.press('Space');
 await check(()=>document.activeElement.dataset.v==='3'&&document.activeElement.getAttribute('aria-pressed')==='false','rating Space clears');
 await page.keyboard.press('Tab');await check(()=>document.activeElement.dataset.v==='4','rating tab order');
 await page.keyboard.press('Escape');
 await page.evaluate(()=>{readOnly=true;openDetail(DB.discos[0].id);});
 await check(()=>[...document.querySelectorAll('.scrim .stars.big [role=button]')].every(b=>b.tabIndex===-1&&b.getAttribute('aria-disabled')==='true'),'read-only ratings are not interactive');
 await page.keyboard.press('Escape');await page.evaluate(()=>readOnly=false);
 // Repeated progress within one sync state must not flood the live region.
 await page.evaluate(()=>{marcar('busy','Uno');marcar('busy','Dos');marcar('ok');toast('Guardado');toast('Guardado');});
 await page.waitForTimeout(450);
 await check(()=>avisosAccesibles.sync.region.textContent==='Al día'&&avisosAccesibles.aviso.region.textContent==='Guardado'&&document.querySelectorAll('[role="status"]').length===2,'coalesced polite announcements');
 await page.evaluate(()=>marcar('ok','Detalle nuevo'));
 await page.waitForTimeout(450);
 await check(()=>avisosAccesibles.sync.region.textContent==='Al día','same state stays quiet');
 await check(()=>document.documentElement.scrollWidth<=innerWidth,'no horizontal overflow');
 assert.deepEqual(errors,[]);console.log(`✓ Accesibilidad ${width}px: navegación, filtros, paleta, foco, estrellas, avisos y nombres dinámicos`);
 await context.close();
}}finally{await browser.close();server.close();}
