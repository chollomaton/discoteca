import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {webcrypto, createHash} from 'node:crypto';
function fn(file,name){const src=fs.readFileSync(file,'utf8'),at=src.indexOf('function '+name+'(');assert(at>=0);return src.slice(at,src.indexOf('\n}',at)+2);}
const mem=new Map();let day='2026-09-26';
const ctx=vm.createContext({console,Date,Set,Map,Math,JSON,Number,Promise,clearTimeout,plain:s=>s.toLowerCase(),hoyISO:()=>day,nowISO:()=>day+'T12:00:00.000Z',fdate:s=>s,localStorage:{getItem:k=>mem.get(k),setItem:(k,v)=>mem.set(k,v)}});
for(const [file,names] of [['core',['totalEscuchas','rngShuffle','similitud']],['quality',['diagnosticoColeccion']],['stats',['resumenUso']],['insights',['sugerenciasDelDia']],['transfer',['nucleoTitulo','validarCopia','restaurarCheckpoint']]])for(const n of names)vm.runInContext(fn('js/'+file+'.js',n),ctx);
const records=Array.from({length:24},(_,i)=>({id:'d'+i,artista:'Artist '+i,titulo:'Album '+i,formato:'CD',genero:'Genre '+i,año:'1980',portada:'',tracklist:[],valoracion:5,escuchas:0,escuchasFechas:[],fechaAlta:'2026-09-01'}));
ctx.coleccion=()=>records;
const initial=JSON.stringify(records);
const a=ctx.sugerenciasDelDia(),b=ctx.sugerenciasDelDia();
assert.equal(JSON.stringify(a),JSON.stringify(b),'same-day ranking stable after recording history');
assert.equal(new Set(a.map(x=>x.d.id)).size,4);assert.equal(new Set(a.map(x=>x.d.artista)).size,4);assert.equal(new Set(a.map(x=>x.d.genero)).size,4);assert(a.every(x=>x.motivo));
assert.equal(JSON.stringify(records),initial,'recommendations never change records');
assert.equal(ctx.sugerenciasDelDia([records[0]],1).length,1);
for(let i=1;i<=30;i++){day='2026-10-'+String(i).padStart(2,'0');ctx.sugerenciasDelDia();}assert(JSON.parse(mem.get('discoteca.recomendaciones.v1')).length<=56);
const broken=[...records,{...records[0],id:'broken',año:'oops',mbid:'bad',enlazado:'absent',tracklist:[{titulo:''}]}];
const snapshot=JSON.stringify(broken),diagnostic=ctx.diagnosticoColeccion(broken);
for(const type of ['Duplicado exacto','Posible duplicado','Portada ausente','Tracklist vacío','Año inválido','Identificador externo incoherente','Edición enlazada ausente','Pistas sin título'])assert(diagnostic.some(x=>x.tipo===type),type);
assert.equal(JSON.stringify(broken),snapshot);
assert(ctx.diagnosticoColeccion([{...records[0],titulo:'Dark Side of the Moon'},{...records[0],id:'similar',titulo:'Dark Side of Moon'}]).some(x=>x.tipo==='Posible duplicado'),'similar titles detected at import threshold');
const large=Array.from({length:5000},(_,i)=>({...records[i%24],id:'scale'+i}));const started=Date.now();assert(ctx.diagnosticoColeccion(large).length);assert(Date.now()-started<3000,'indexed diagnostic at 5000');
const metrics=ctx.resumenUso([{...records[0],escuchas:3,escuchasFechas:['2026-09-01','2026-08-01'],valoracion:4},records[1]],'2026-09-26');
assert.deepEqual(JSON.parse(JSON.stringify(metrics)),{total:2,escuchados:1,pendientes:1,mes:1,anio:2,media:4.5,recientes:2});
assert.equal(ctx.resumenUso([],'2026-09-26').media,null);
assert.throws(()=>ctx.validarCopia({version:5,discos:[]}));assert.throws(()=>ctx.validarCopia({version:4,discos:[records[0],records[0]]}));assert.throws(()=>ctx.validarCopia({version:4,discos:[],borrados:[{id:'x',fecha:'bad'}]}));
const tomb={id:'old',fecha:'2020-01-01T00:00:00Z'};assert.equal(ctx.validarCopia({version:4,discos:records,borrados:[tomb]}).borrados[0],tomb);
let checkpoint={version:4,discos:[records[0]],borrados:[tomb]},fail=false,writes=0;
Object.assign(ctx,{DB:{version:4,discos:[records[1]],borrados:[{id:'newer-deletion',fecha:'2026-09-01T00:00:00Z'}]},configuracionEnCurso:false,pullPromiseActual:null,pushPromiseActual:null,saveTimer:null,revisionDatos:0,leerPuntoRecuperacion:async()=>checkpoint,confirm:()=>true,crearPuntoRecuperacion:async()=>{if(fail)throw Error('quota');},normDisc:d=>({...d}),indexarFirmas:()=>{},guardarLocal:async()=>{writes++;},configurado:()=>false,renderAll:()=>{},toast:()=>{}});
await ctx.restaurarCheckpoint();assert.equal(ctx.DB.discos[0].id,'d0');assert(ctx.DB.borrados.some(x=>x.id==='d1'));assert(ctx.DB.borrados.some(x=>x.id==='old'));assert(ctx.DB.borrados.some(x=>x.id==='newer-deletion'),'unrelated later tombstones survive recovery');
const before=JSON.stringify(ctx.DB);fail=true;await ctx.restaurarCheckpoint();assert.equal(JSON.stringify(ctx.DB),before);assert.equal(writes,1,'failed checkpoint prevents mutation');
fail=false;ctx.guardarLocal=async()=>{throw Error('disk full');};await ctx.restaurarCheckpoint();assert.equal(JSON.stringify(ctx.DB),before,'failed persistence rolls memory back');assert.equal(ctx.configuracionEnCurso,false);
// Execute the actual worker install: mismatched assets must write nothing and never activate.
const sw=fs.readFileSync('sw.js','utf8');let events={},puts=0,skips=0,corrupt=false;
const swctx=vm.createContext({URL,Request,Response,Uint8Array,Array,Promise,Error,crypto:webcrypto,self:{registration:{scope:'https://example.test/'},addEventListener:(n,f)=>events[n]=f,skipWaiting:()=>skips++,clients:{claim:()=>{}}},location:{origin:'https://example.test'},fetch:async req=>new Response(corrupt?'bad':fs.readFileSync(new URL(req.url).pathname.slice(1))),caches:{open:async()=>({put:async()=>puts++}),keys:async()=>[]}});
// Relative Request URLs need a base in Node (browsers resolve against worker URL).
swctx.Request=class extends Request{constructor(url,opts){super(new URL(url,'https://example.test/'),opts);}};
vm.runInContext(sw,swctx);let pending;corrupt=true;events.install({waitUntil:p=>pending=p});await assert.rejects(pending);assert.equal(puts,0);assert.equal(skips,0);
corrupt=false;events.install({waitUntil:p=>pending=p});await pending;assert.equal(puts,swctx.SHELL.length);assert.equal(skips,0);
for(const p of ['https://example.test/datos.json','https://example.test/backups/a.json','https://api.github.com/a']){let intercepted=false;events.fetch({request:new Request(p),respondWith:()=>intercepted=true});assert(!intercepted,p);}
let intercepted=false;events.fetch({request:new Request('https://example.test/styles.css',{headers:{Authorization:'Bearer fake'}}),respondWith:()=>intercepted=true});assert(!intercepted);
const event=process.env.GITHUB_EVENT_PATH ? JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8')) : {};
const dataAt=ref=>execFileSync('git',['show',ref+':datos.json'],{maxBuffer:10*1024*1024});
const expected='46da5cd12915b45b11d368087c6290b9797a49f411302f6704bf00e3a2afc49b';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(dataAt('3e338ac3d908dd09686cad38a2ec9e5cca83e318')),expected,'initial collection recorded');
if(event.pull_request && event.pull_request.head.ref==='fase-13-producto'){
 assert.equal(hash(dataAt(event.pull_request.head.sha)),expected,'phase 13 branch leaves original bytes intact');
 assert.equal(hash(fs.readFileSync('datos.json')),hash(dataAt('HEAD^1')),'PR merge keeps current main collection');
}else if(!process.env.GITHUB_ACTIONS){
 assert.equal(hash(fs.readFileSync('datos.json')),expected,'local phase 13 collection unchanged');
}
// Main may receive legitimate collection saves independently of product development.

console.log('✓ Fase 13: discovery, diagnostics, statistics, backup rollback, atomic PWA and immutable collection');
