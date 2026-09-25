import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const src=fs.readFileSync('js/features.js','utf8');
let discs=[];
const ctx=vm.createContext({coleccion:()=>discs,plain:s=>s.toLowerCase(),totalEscuchas:d=>d.escuchas||0,rngShuffle:a=>a.slice()});
vm.runInContext(src.slice(src.indexOf('function duracionSesion(d){'),src.indexOf('function recomendadoColeccion(seed){')),ctx);
const disc=(id,sec,extra={})=>({id,artista:id,tracklist:[{duracion:Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0')}],...extra});
for(const target of [20,30,45,60,90]){
 discs=[disc('greedy',(target-5)*60),disc('a',target*30),disc('b',target*30)];
 const r=ctx.construirSesion(target,'');assert.equal(r.segundos,target*60);assert.equal(new Set(r.discos.map(d=>d.id)).size,r.discos.length);
}
discs=[disc('over',31*60),disc('under',29*60)];assert.equal(ctx.construirSesion(30,'').segundos,29*60);
discs=[disc('over',30*60+1)];assert.equal(ctx.construirSesion(30,'').segundos,1801);assert.match(ctx.resumenTiempoSesion(discs,30),/Excede el objetivo en 0 min 1 s/);
discs=[disc('long',40*60)];assert.equal(ctx.construirSesion(30,'').discos.length,0);
for(const tracklist of [[],[{duracion:'0:00'}],[{duracion:'3:99'}],[{duracion:'20:00'},{duracion:''}]]){
 discs=[{id:'missing',tracklist}];assert.equal(ctx.duracionSesion(discs[0]).completa,false);assert.equal(ctx.construirSesion(30,'').discos.length,0);assert.match(ctx.resumenTiempoSesion(discs,30),/Faltan duraciones/);
}
discs=[disc('v',1800,{formato:'Vinilo',valoracion:5}),disc('c',1800,{formato:'CD',escuchas:1})];
for(const [filter,id] of [['vinilo','v'],['cd','c'],['favoritos','v'],['noescuchados','v']])assert.equal(ctx.construirSesion(30,filter).discos[0].id,id);
// Compare exact totals with exhaustive subsets, including seconds and ties.
let seed=1234;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed;};
for(let run=0;run<40;run++){
 const target=[20,30,45,60,90][run%5],goal=target*60,limit=goal+Math.max(300,goal*.12);
 discs=Array.from({length:9},(_,i)=>disc(String(i),60+rnd()%3000));
 const original=JSON.stringify(discs);let best=0;
 for(let mask=1;mask<512;mask++){
  const sum=discs.reduce((n,d,i)=>n+((mask>>i)&1?ctx.duracionSegundos(d):0),0);
  if(sum<=limit&&(!best||Math.abs(sum-goal)<Math.abs(best-goal)||(Math.abs(sum-goal)===Math.abs(best-goal)&&sum<best)))best=sum;
 }
 assert.equal(ctx.construirSesion(target,'').segundos,best);assert.equal(JSON.stringify(discs),original);
}
assert.match(ctx.resumenTiempoSesion([disc('x',3480)],60),/58 min de 60 min/);
console.log('✓ Paso 10.1: objetivos, combinaciones óptimas, empates, segundos, exceso, datos incompletos, filtros e inmutabilidad');
