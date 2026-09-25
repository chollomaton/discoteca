import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readAppSource} from './app-source.mjs';
const src=readAppSource();
const block=(a,b)=>{ const start=src.indexOf(a), end=src.indexOf(b,start); assert(start>=0&&end>start); return src.slice(start,end); };
const clone=x=>JSON.parse(JSON.stringify(x));
const storage=new Map(), records=new Map();
let idbFails=false, localFails=false;
const ctx=vm.createContext({console, Date, Set, Number, JSON, Object, String, Array, Promise, Math,
  CFG:{owner:'u',repo:'private-data',branch:'main',path:'datos.json',token:'example-secret-value',discogs:'discogs-secret',recordarClaves:false},
  DB:{version:4,discos:[],borrados:[],actualizado:''}, LS_CFG:'config-local', K_CFG:'config', K_FALLOS:'fallos',
  nowISO:()=> '2026-09-25T20:00:00.000Z', uid:()=> 'new-id',
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(localFails) throw Error('quota'); storage.set(k,v);}},
  idbSet:async(k,v)=>{if(idbFails) throw Error('quota');records.set(k,clone(v));},
  idbGet:async k=>{if(idbFails) throw Error('blocked');return records.get(k)||null;}
});
vm.runInContext(block('var CLAVES_CFG','/* ============================================================\n   4.'),ctx);
vm.runInContext(block('function validarCopia(o){','function descargarCopia'),ctx);
vm.runInContext(block('function limpiaNombre','function hoyISO'),ctx);
vm.runInContext(block('function fechaMasReciente','/* ---------- descarga ---------- */'),ctx);
vm.runInContext(block('function fusionarCopiaRecuperacion','function importBackup'),ctx);
vm.runInContext(block('function apuntarFallo','window.addEventListener'),ctx);
await ctx.guardarCfg();
assert.equal(records.get('config').token,''); assert.equal(JSON.parse(storage.get('config-local')).discogs,'');
ctx.CFG.recordarClaves=true; await ctx.guardarCfg();
assert.equal(records.get('config').token,'example-secret-value'); assert.equal(JSON.parse(storage.get('config-local')).token,'');
ctx.CFG.recordarClaves=false; await ctx.guardarCfg(); assert.equal(records.get('config').token,'');
idbFails=true; await assert.rejects(ctx.guardarCfg()); idbFails=false;
console.log('✓ claves de sesión, consentimiento, limpieza y fallo de almacenamiento');
ctx.apuntarFallo('test','Bearer example-secret-value https://api.test/?api_key=other-secret','?token=discogs-secret');
const logs=storage.get('fallos');
for(const secret of ['example-secret-value','discogs-secret','other-secret']) assert(!logs.includes(secret));
assert(!ctx.ocultarSecretos('github_pat_example123').includes('example123'));
console.log('✓ mensajes, cabeceras y parámetros sensibles censurados antes de guardar');
ctx.validarConfig(ctx.CFG);
for(const delta of [{path:'../datos.json'},{path:'a//datos.json'},{path:'index.html'},{owner:'evil.test/x'},{branch:'../main'},{token:'a b'}])
  assert.throws(()=>ctx.validarConfig({...ctx.CFG,...delta}));
console.log('✓ destinos de configuración inválidos rechazados');
const disc={id:'d1',titulo:'Uno',artista:'Artista',lista:'coleccion',tracklist:[],mod:'2026-09-01T12:00:00Z'};
const doc={version:4,discos:[disc],borrados:[]};
assert.equal(ctx.validarCopia(doc).discos.length,1);
assert.equal(ctx.validarCopia([disc]).discos.length,1);
const actual=JSON.parse(fs.readFileSync('datos.json','utf8'));
assert.equal(ctx.validarCopia(actual).discos.length,actual.discos.length);
for(const bad of [null,{}, {...doc,version:99}, {...doc,discos:[disc,disc]}, {...doc,discos:[{...disc,id:'__proto__'}]}, {...doc,borrados:[{id:'x',fecha:'bad'}]}, {...doc,discos:[{...disc,tracklist:{}}]}])
  assert.throws(()=>ctx.validarCopia(bad));
ctx.DB=clone(doc); await ctx.crearPuntoRecuperacion('test'); ctx.DB.discos[0].titulo='Dos';
assert.equal((await ctx.leerPuntoRecuperacion()).discos[0].titulo,'Uno');
assert(!JSON.stringify(await ctx.leerPuntoRecuperacion()).includes('example-secret'));
idbFails=true; await ctx.crearPuntoRecuperacion('fallback'); assert.equal((await ctx.leerPuntoRecuperacion()).discos[0].titulo,'Dos');
localFails=true; await assert.rejects(ctx.crearPuntoRecuperacion('fail')); localFails=false; idbFails=false;
ctx.DB={discos:[],borrados:[{id:'d1',fecha:'2026-09-24T12:00:00Z'}]};
assert.equal(ctx.fusionarCopiaRecuperacion(doc,false).discos.length,0);
const restored=ctx.fusionarCopiaRecuperacion(doc,true);
assert.equal(restored.discos.length,1); assert.equal(restored.borrados.length,0);
const next=ctx.fusionar(restored.discos,restored.borrados,[],ctx.DB.borrados);
assert.equal(next.discos.length,1);
console.log('✓ validación, copia independiente, fallback, cuota y recuperación tras borrados multicliente');
// Red real de producción: fichero grande privado y datos corruptos.
Object.assign(ctx,{configuracionEnCurso:false, configurado:()=>true, readOnly:false, revisionDatos:1,
  SHA:'original', ultimoPull:0, lastSync:'', ghUrl:()=> 'https://api.github.com/repos/u/private-data/contents/datos.json',
  ghHeaders:()=>({Authorization:'Bearer test-fixture'}), b64dec:s=>Buffer.from(s,'base64').toString(),
  marcar:s=>{ctx.syncState=s;}, indexarFirmas:()=>{}, guardarLocal:()=>Promise.resolve(),
  renderAll:()=>{},toast:()=>{},programarPush:()=>{}, normDisc:d=>d,setTimeout,clearTimeout});
vm.runInContext(block('var colaSincro = Promise.resolve();','function sincronizarAhora'),ctx);
ctx.DB=clone(doc); const requests=[];
ctx.fetch=async(url,opts)=>{ requests.push({url,opts}); return requests.length===1
  ? {ok:true,status:200,json:async()=>({sha:'private-sha',download_url:'https://unexpected.invalid/leak'})}
  : {ok:true,status:200,text:async()=>JSON.stringify(doc)}; };
assert.equal(await ctx.pull(true),true);
assert.equal(requests.length,2); assert(requests.every(r=>r.url.startsWith('https://api.github.com/')));
assert.equal(requests[1].opts.headers.Accept,'application/vnd.github.raw+json');
assert.equal(requests[1].opts.headers.Authorization,'Bearer test-fixture');
const before=JSON.stringify(ctx.DB);ctx.SHA='safe';
ctx.fetch=async()=>({ok:true,status:200,json:async()=>({sha:'bad',content:Buffer.from('{}').toString('base64')})});
assert.equal(await ctx.pull(true),false);assert.equal(JSON.stringify(ctx.DB),before);assert.equal(ctx.SHA,'safe');
ctx.configuracionEnCurso=true;requests.length=0;ctx.fetch=async()=>{throw Error('unexpected');};
assert.equal(await ctx.pull(true),false);assert.equal(await ctx.push(),false);
console.log('✓ datos privados grandes por API autenticada, corrupción sin pérdida y bloqueo al cambiar configuración');
// Ejecutar el filtro real del service worker, no solo buscar cadenas.
const handlers={};const scope='https://example.test/discoteca/';
const swctx=vm.createContext({URL,self:{registration:{scope},addEventListener:(n,f)=>handlers[n]=f},location:{origin:'https://example.test'}});
vm.runInContext(fs.readFileSync('sw.js','utf8'),swctx);
for(const path of ['datos.json','backups/coleccion.json','otra-cosa.txt']){
  let intercepted=false;handlers.fetch({request:{url:scope+path,method:'GET',headers:{has:()=>false}},respondWith:()=>{intercepted=true;}});
  assert.equal(intercepted,false);
}
let intercepted=false;handlers.fetch({request:{url:scope+'styles.css',method:'GET',headers:{has:()=>true}},respondWith:()=>{intercepted=true;}});assert(!intercepted);
assert(!block('function boot(){','function probarDiscogs').includes("fetch('datos.json"));
const index=fs.readFileSync('index.html','utf8');assert(index.includes("script-src 'self';"));
assert(!/\bon(?:error|click|load)=/i.test(src));
assert(index.includes('name="referrer" content="no-referrer"'));
assert(!/value="' \+ esc\(CFG\.(?:token|discogs|anthropic|lastfm|ticketmaster|audd)/.test(src));
console.log('✓ caché limitada a app, sin carga pública inicial, CSP sin inline y claves fuera de atributos HTML');
console.log('\nPruebas de Fase 7 OK.');
