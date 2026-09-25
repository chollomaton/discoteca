import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync('js/features.js','utf8');
let discs=[{id:'a',tracklist:[{duracion:'40:00'}],escuchasFechas:[]},{id:'b',tracklist:[{duracion:'20:00'}],escuchasFechas:['2026-09-25']}];
const original=JSON.stringify(discs);
let storage=new Map(),fail=false;
const ctx=vm.createContext({CFG:{owner:'user',repo:'records',branch:'main',path:'datos.json',token:'NEVER-SAVE'},
  coleccion:()=>discs,escuchadoHoy:d=>d.escuchasFechas.includes('2026-09-25'),
  sessionStorage:{getItem:k=>{if(fail)throw Error('blocked');return storage.get(k)||null;},
    setItem:(k,v)=>{if(fail)throw Error('quota');storage.set(k,v);},removeItem:k=>{if(fail)throw Error('blocked');storage.delete(k);}}});
vm.runInContext(source.slice(source.indexOf('function duracionSegundos(d){'),source.indexOf('function candidatosSesion(')),ctx);
vm.runInContext(source.slice(source.indexOf('var K_SESION_ESCUCHA'),source.indexOf('function sesionEscucha(){')),ctx);
let state=ctx.cargarSesionEscucha();assert.equal(state.minutos,45);assert.equal(state.modo,'uno');
state={...state,modo:'tiempo',minutos:60,filtro:'vinilo',ids:['a','b','a','missing'],generada:true,uno:'b',unoGenerado:true,token:'INJECTED'};
ctx.guardarSesionEscucha(state);
const saved=storage.get('discoteca.sesionEscucha.v1');assert(!saved.includes('NEVER-SAVE'));assert(!saved.includes('INJECTED'));assert(!saved.includes('tracklist'));
ctx.sesionEscuchaMemoria=null;state=ctx.cargarSesionEscucha();
assert.equal(state.modo,'tiempo');assert.equal(state.minutos,60);assert.equal(state.filtro,'vinilo');
assert.deepEqual(Array.from(state.ids),['a','b']);assert.equal(state.uno,'b');
let rows=ctx.discosSesionEscucha(state,discs);assert.equal(rows[0],discs[0]);
let progress=ctx.progresoSesionEscucha(rows);assert.equal(progress.escuchados,1);assert.equal(progress.segundosPendientes,2400);
state.modo='uno';assert.equal(ctx.discosSesionEscucha(state,discs)[0].id,'b');
state.modo='tiempo';assert.deepEqual(Array.from(ctx.discosSesionEscucha(state,discs),d=>d.id),['a','b']);
assert.equal(JSON.stringify(discs),original);
// Deletion or move to wishlist removes IDs from the current collection, without recreating the session.
discs=discs.slice(0,1);state=ctx.cargarSesionEscucha();assert.deepEqual(Array.from(state.ids),['a']);assert.equal(state.uno,'');assert(state.unoGenerado);
ctx.CFG.repo='other';state=ctx.cargarSesionEscucha();assert.equal(state.ids.length,0);assert.equal(state.uno,'');
ctx.sesionEscuchaMemoria=null;storage.set('discoteca.sesionEscucha.v1','{invalid');assert.equal(ctx.cargarSesionEscucha().modo,'uno');
const dest=ctx.destinoSesionEscucha();
for(const invalid of [null,[],{}, {version:9,destino:dest}, {version:1,destino:'other'}]) assert.equal(ctx.normalizarSesionEscucha(invalid,discs,dest).ids.length,0);
const bad=ctx.normalizarSesionEscucha({version:1,destino:dest,minutos:-100,filtro:'bad',modo:'bad',ids:['a',{},'a'],generada:'true'},discs,dest);
assert.equal(bad.minutos,45);assert.equal(bad.filtro,'todos');assert.equal(bad.modo,'uno');assert.equal(bad.generada,false);assert.deepEqual(Array.from(bad.ids),['a']);
fail=true;ctx.guardarSesionEscucha({...bad,ids:['a'],modo:'tiempo',generada:true});assert.equal(ctx.sesionEscuchaDurable,false);assert.equal(ctx.cargarSesionEscucha().ids[0],'a');
ctx.terminarSesionEscucha();assert.equal(ctx.cargarSesionEscucha().ids.length,0);
fail=false;ctx.guardarSesionEscucha({...bad,ids:['a'],modo:'tiempo'});ctx.terminarSesionEscucha();assert.equal(storage.has('discoteca.sesionEscucha.v1'),false);
assert.equal(JSON.stringify(discs),JSON.stringify(JSON.parse(original).slice(0,1)));
console.log('✓ Fase 9: recarga, modo/tiempo/filtro, orden, progreso, solo IDs, destinos aislados, bajas, datos corruptos, cuota y terminar sin borrar escuchas');
