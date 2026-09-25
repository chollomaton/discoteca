import fs from 'node:fs';
import vm from 'node:vm';
import { readAppSource } from './app-source.mjs';

const src = readAppSource();
const fail = (m) => { console.error('✗ ' + m); process.exitCode = 1; };
const ok = (m) => console.log('✓ ' + m);
const assert = (c,m) => c ? ok(m) : fail(m);
const eq = (a,b,m) => assert(JSON.stringify(a)===JSON.stringify(b), m + (JSON.stringify(a)===JSON.stringify(b) ? '' : '\n  obtenido: ' + JSON.stringify(a) + '\n  esperado: ' + JSON.stringify(b)));

function sliceBetween(a,b){
  const i=src.indexOf(a), j=src.indexOf(b,i);
  if(i<0 || j<0) throw new Error('No se pudo extraer bloque: ' + a);
  return src.slice(i,j);
}

const ctx = vm.createContext({
  console, JSON, Date, Math, Number, String, Object, Array, RegExp,
  uid: ()=> 'test-id',
  nowISO: ()=> ctx.__now || '2026-09-25T12:00:00.000Z',
  DB:{discos:[],borrados:[]},
  firmas:{}, firmasCampos:{}
});

/* Utilidades + modelo + firmas exactos de producción. */
vm.runInContext(sliceBetween('function limpiaNombre','function hoyISO'), ctx);
/* Serializador exacto de producción. */
vm.runInContext(sliceBetween('var CAMPOS_LIGEROS','function coleccion'), ctx);
/* Persistencia/sellado exacto de producción. */
vm.runInContext(sliceBetween('function sellarCambios','/* revisionDatos sube'), ctx);
/* Fusión exacta de producción. */
vm.runInContext(sliceBetween('function fechaMasReciente','/* ---------- descarga ---------- */'), ctx);

const clone = (x)=>JSON.parse(JSON.stringify(x));
const T0='2026-09-25T08:00:00.000Z', T1='2026-09-25T09:00:00.000Z',
      T2='2026-09-25T10:00:00.000Z', T3='2026-09-25T11:00:00.000Z';

function baseDisc(){
  return ctx.normDisc({
    id:'d1', lista:'coleccion', artista:'Artista', titulo:'Álbum', año:'2000',
    formato:'CD', genero:'Rock', sello:'Sello', numeroCatalogo:'CAT-1', pais:'ES',
    portada:'https://example.test/a.jpg', tracklist:[{titulo:'Uno',duracion:'3:00'}],
    notas:'', etiquetas:[], editado:{}, escuchas:0, escuchasFechas:[],
    fechaAlta:T0, mod:T0
  });
}

/* 1. Estado idéntico: convergencia sin falsos cambios. */
{
  const a=baseDisc(), b=clone(a);
  const r=ctx.fusionar([a],[],[b],[]);
  eq([r.aLocal,r.aRemoto],[0,0],'estado idéntico no genera cambios');
  assert(!r.discos[0].modsBase && Object.keys(r.discos[0].modsCampos || {}).length===0,
    'una lectura idéntica de datos antiguos no infla la ficha con metadata');
}

/* 2. Compatibilidad: sin metadata granular se conserva el LWW histórico. */
{
  const l=baseDisc(), r=clone(l);
  l.titulo='Título local'; l.mod=T2;
  r.notas='Nota remota'; r.mod=T3;
  const m=ctx.fusionar([l],[],[r],[]).discos[0];
  eq([m.titulo,m.notas],['Álbum','Nota remota'],'cliente antiguo mantiene last-write-wins por ficha');
}

/* 3. Dos dispositivos modernos editan CAMPOS DISTINTOS: ambos sobreviven. */
{
  const l=baseDisc(), r=clone(l);
  l.modsBase=T0; r.modsBase=T0;
  l.titulo='Título local'; l.modsCampos={titulo:T2}; l.mod=T2;
  r.notas='Nota remota'; r.modsCampos={notas:T3}; r.mod=T3;
  const z=ctx.fusionar([l],[],[r],[]);
  eq([z.discos[0].titulo,z.discos[0].notas],['Título local','Nota remota'],'ediciones concurrentes en campos distintos se combinan');
  assert(z.aLocal>0 && z.aRemoto>0,'la combinación se propaga a ambos lados');
}

/* 4. Mismo campo: gana su propia marca más reciente, no el mod global. */
{
  const l=baseDisc(), r=clone(l);
  l.modsBase=T0; r.modsBase=T0;
  l.titulo='Local'; l.modsCampos={titulo:T3}; l.mod=T3;
  r.titulo='Remoto'; r.modsCampos={titulo:T2}; r.notas='Otra cosa más nueva';
  r.modsCampos.notas='2026-09-25T12:00:00.000Z'; r.mod='2026-09-25T12:00:00.000Z';
  const m=ctx.fusionar([l],[],[r],[]).discos[0];
  assert(m.titulo==='Local','el campo título respeta su timestamp aunque la ficha remota tenga mod global posterior');
}

/* 5. Etiquetas acumulativas. */
{
  const l=baseDisc(), r=clone(l);
  l.etiquetas=['A']; r.etiquetas=['B']; l.modsBase=r.modsBase=T0;
  l.modsCampos={etiquetas:T2}; r.modsCampos={etiquetas:T3}; l.mod=T2; r.mod=T3;
  const z=ctx.fusionar([l],[],[r],[]);
  eq(z.discos[0].etiquetas,['A','B'],'etiquetas se unen');
  assert(z.aLocal>0 && z.aRemoto>0,'unión de etiquetas marca ambos lados');
}

/* 6. Protecciones manuales no se pierden. */
{
  const l=baseDisc(), r=clone(l);
  l.editado={pais:true}; r.editado={numeroCatalogo:true};
  l.modsBase=r.modsBase=T0; l.modsCampos={editado:T2}; r.modsCampos={editado:T3};
  l.mod=T2; r.mod=T3;
  const m=ctx.fusionar([l],[],[r],[]).discos[0];
  assert(m.editado.pais && m.editado.numeroCatalogo,'protecciones editado se combinan');
}

/* 7. Escuchas: mismo calendario pero contador histórico diferente. */
{
  const l=baseDisc(), r=clone(l);
  l.escuchasFechas=['2026-09-20']; r.escuchasFechas=['2026-09-20'];
  l.escuchas=7; r.escuchas=1; l.ultimaEscucha=r.ultimaEscucha='2026-09-20';
  l.mod=T2; r.mod=T3;
  const m=ctx.fusionar([l],[],[r],[]).discos[0];
  assert(m.escuchas===7,'se conserva el máximo histórico de escuchas aunque no aparezcan fechas nuevas');
}

/* 8. Escuchas concurrentes en días distintos. */
{
  const l=baseDisc(), r=clone(l);
  l.escuchasFechas=['2026-09-20']; r.escuchasFechas=['2026-09-21'];
  l.escuchas=1; r.escuchas=1; l.ultimaEscucha='2026-09-20'; r.ultimaEscucha='2026-09-21';
  const m=ctx.fusionar([l],[],[r],[]).discos[0];
  eq(m.escuchasFechas,['2026-09-20','2026-09-21'],'fechas de escucha se unen');
  assert(m.escuchas===2 && m.ultimaEscucha==='2026-09-21','contador y última escucha siguen la unión');
}

/* 9. Tombstone posterior elimina; edición posterior al tombstone revive. */
{
  const d=baseDisc(); d.mod=T1;
  const a=ctx.fusionar([d],[{id:'d1',fecha:T2}],[],[]);
  assert(a.discos.length===0,'borrado posterior elimina la ficha');
  const nuevo=baseDisc(); nuevo.mod=T3;
  const b=ctx.fusionar([nuevo],[{id:'d1',fecha:T2}],[],[]);
  assert(b.discos.length===1,'edición posterior a borrado puede recuperar la ficha');
}

/* 10. Al primer cambio moderno solo se marca el campo tocado y una base común. */
{
  const d=baseDisc();
  ctx.DB={discos:[d],borrados:[]}; ctx.firmas={}; ctx.firmasCampos={};
  vm.runInContext('indexarFirmas()',ctx);
  d.titulo='Título editado'; ctx.__now=T2;
  const n=vm.runInContext('sellarCambios()',ctx);
  assert(n===1,'sellarCambios detecta una edición');
  assert(d.modsBase===T0,'primera edición conserva mod anterior como modsBase');
  eq(Object.keys(d.modsCampos),['titulo'],'solo el campo realmente editado recibe marca propia');
  assert(d.modsCampos.titulo===T2 && d.mod===T2,'marca de campo y mod global se actualizan');
}

/* 11. Metadata vacía no infla datos.json; metadata real sí sobrevive. */
{
  const d=baseDisc();
  d.modsBase=''; d.modsCampos={};
  let light=ctx.serializarDiscLigero(d);
  assert(!Object.prototype.hasOwnProperty.call(light,'modsBase') && !Object.prototype.hasOwnProperty.call(light,'modsCampos'),'metadata granular vacía se omite');
  d.modsBase=T0; d.modsCampos={titulo:T2};
  light=ctx.serializarDiscLigero(d);
  assert(light.modsBase===T0 && light.modsCampos.titulo===T2,'metadata granular no vacía se persiste');
}

/* 12. La fusión no muta los argumentos de entrada. */
{
  const l=baseDisc(), r=clone(l);
  l.modsBase=r.modsBase=T0; l.titulo='L'; r.notas='R'; l.modsCampos={titulo:T2}; r.modsCampos={notas:T3}; l.mod=T2; r.mod=T3;
  const lb=JSON.stringify(l), rb=JSON.stringify(r);
  ctx.fusionar([l],[],[r],[]);
  assert(JSON.stringify(l)===lb && JSON.stringify(r)===rb,'fusionar es pura respecto a las fichas de entrada');
}


/* 13-17. Cola global y comportamiento de push/pull con red simulada.
   Se evalúa el bloque REAL de producción, sustituyendo solo red/UI/almacén. */
const syncBlock = sliceBetween('var colaSincro = Promise.resolve();','function sincronizarAhora');
const sleep = (ms)=>new Promise((r)=>setTimeout(r,ms));
function netContext(fetchImpl){
  const c=vm.createContext({
    console, JSON, Date, Math, Number, String, Object, Array, Promise, TypeError,
    setTimeout, clearTimeout,
    CFG:{owner:'u',repo:'r',branch:'main',path:'datos.json',token:'t'},
    DB:{discos:[{id:'d1',titulo:'A',artista:''}],borrados:[],actualizado:''},
    configuracionEnCurso:false, SHA:'s0', lastSync:'', readOnly:false, revisionDatos:1, syncState:'ok',
    fetch:fetchImpl,
    configurado:()=>true,
    ghUrl:()=> 'https://api.github.test/datos.json',
    ghHeaders:()=>({}),
    marcar:(estado)=>{ c.syncState=estado; },
    b64enc:(x)=>Buffer.from(x,'utf8').toString('base64'),
    b64dec:(x)=>Buffer.from(x,'base64').toString('utf8'),
    discosLigeros:()=>c.DB.discos,
    nowISO:()=> '2026-09-25T12:00:00.000Z',
    guardarLocal:()=>Promise.resolve(true),
    renderAll:()=>{}, toast:()=>{}, indexarFirmas:()=>{}, programarPush:()=>{},
    normDisc:(d)=>d,
    fusionar:(locales,borrLoc,remotos,borrRem)=>({discos:locales,borrados:borrLoc||[],aLocal:0,aRemoto:0})
  });
  vm.runInContext(sliceBetween('function validarCopia(o){','function descargarCopia'),c);
  vm.runInContext(syncBlock,c);
  return c;
}
function resOkJson(j,status=200){ return {status,ok:status>=200&&status<300,json:async()=>j}; }

/* pull + push pedidos a la vez nunca tienen dos fetch simultáneos. */
{
  let activos=0,max=0,metodos=[];
  const remote=Buffer.from(JSON.stringify({discos:[{id:'d1',titulo:'A',artista:''}],borrados:[]})).toString('base64');
  const c=netContext(async (url,opt={})=>{
    activos++; max=Math.max(max,activos); metodos.push(opt.method||'GET');
    await sleep(20); activos--;
    return (opt.method==='PUT')
      ? resOkJson({content:{sha:'s2'}})
      : resOkJson({sha:'s1',content:remote});
  });
  await Promise.all([c.pull(true),c.push()]);
  assert(max===1,'pull y push comparten exclusión mutua global');
  eq(metodos,['GET','PUT'],'pull solicitado primero termina antes de empezar el push');
}

/* Tres push sin cambios intermedios = un PUT. */
{
  let puts=0;
  const c=netContext(async (url,opt={})=>{
    if(opt.method==='PUT'){ puts++; await sleep(15); return resOkJson({content:{sha:'s'+puts}}); }
    throw new Error('GET inesperado');
  });
  await Promise.all([c.push(),c.push(),c.push()]);
  assert(puts===1,'tres push simultáneos sin cambios generan un solo PUT');
}

/* Cambio mientras el PUT ya está en vuelo = segundo PUT posterior. */
{
  let puts=0, resolverPrimero;
  const c=netContext((url,opt={})=>{
    if(opt.method!=='PUT') throw new Error('GET inesperado');
    puts++;
    if(puts===1) return new Promise((resolve)=>{ resolverPrimero=()=>resolve(resOkJson({content:{sha:'s1'}})); });
    return Promise.resolve(resOkJson({content:{sha:'s2'}}));
  });
  const p=c.push();
  while(!resolverPrimero) await sleep(1);
  c.revisionDatos=2;
  resolverPrimero();
  await p;
  assert(puts===2,'un cambio producido durante un PUT provoca exactamente un segundo PUT');
}

/* 409 + pull fallido: no se reintenta el PUT a ciegas. */
{
  let puts=0,gets=0;
  const c=netContext(async (url,opt={})=>{
    if(opt.method==='PUT'){ puts++; return resOkJson({},409); }
    gets++; throw new TypeError('sin red');
  });
  const r=await c.push();
  assert(r===false && puts===1 && gets===1,'409 seguido de pull fallido no hace otro PUT');
}

/* 409 + pull correcto: actualiza SHA y reintenta de forma acotada. */
{
  let puts=0,gets=0;
  const remote=Buffer.from(JSON.stringify({discos:[{id:'d1',titulo:'A',artista:''}],borrados:[]})).toString('base64');
  const c=netContext(async (url,opt={})=>{
    if(opt.method==='PUT'){
      puts++;
      return puts===1 ? resOkJson({},409) : resOkJson({content:{sha:'s2'}});
    }
    gets++; return resOkJson({sha:'s1',content:remote});
  });
  const r=await c.push();
  assert(r===true && puts===2 && gets===1,'409 con pull correcto hace un único reintento exitoso');
}

if(process.exitCode){
  console.error('\nPruebas de sincronización FALLIDAS.');
  process.exit(process.exitCode);
}
console.log('\nPruebas de sincronización OK.');
