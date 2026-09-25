import fs from 'node:fs';
import vm from 'node:vm';
import { readAppSource } from './app-source.mjs';

const src=readAppSource();
const fail=(m)=>{console.error('✗ '+m);process.exitCode=1;};
const ok=(m)=>console.log('✓ '+m);
const assert=(c,m)=>c?ok(m):fail(m);

assert(src.includes('data-collection-action="explorar"'),'Colección ofrece acceso compacto a Explorar');
assert(src.includes("else if(a === 'explorar') explorarColeccion()"),'Explorar está enlazado');
assert(/function\s+explorarColeccion\s*\(/.test(src),'existe Explorar la colección');
['hoy','joyas','nunca','parecidos','decadas'].forEach((m)=>
  assert(src.includes("['"+m+"'") || src.includes("modo === '"+m+"'"),'modo de exploración '+m+' existe'));
assert(!/\bpintarSugerencias\(\);/.test(src),'las sugerencias ya no se pintan automáticamente en Colección');

const ei=src.indexOf('function diasDesdeEscucha');
const ej=src.indexOf('function pintarSugerencias',ei);
assert(ei>=0 && ej>ei,'se puede aislar el bloque de exploración');
if(ei>=0 && ej>ei){
  const part=src.slice(ei,ej);
  assert(!/\bfetch\s*\(|\bmbGet\s*\(|\bdgGet\s*\(|\bitGet\s*\(/.test(part),
    'Explorar no hace llamadas externas');
}

/* Prueba real del algoritmo de sesión por tiempo. */
const a=src.indexOf('function duracionSesion(d){');
const b=src.indexOf('function recomendadoColeccion(seed){',a);
assert(a>=0 && b>a,'se puede aislar el algoritmo de sesión');
if(a>=0 && b>a){
  const ctx=vm.createContext({
    console, Date, Math, Array, String, Object,
    plain:(s)=>String(s||'').toLowerCase(),
    totalEscuchas:(d)=>d.escuchas||0,
    rngShuffle:(x)=>x.slice(),
    coleccion:()=>[
      {id:'a1',artista:'Artista A',tracklist:[{duracion:'45:00'}],escuchas:0},
      {id:'a2',artista:'Artista A',tracklist:[{duracion:'40:00'}],escuchas:0},
      {id:'b1',artista:'Artista B',tracklist:[{duracion:'40:00'}],escuchas:0}
    ]
  });
  vm.runInContext(src.slice(a,b),ctx);
  const r=ctx.construirSesion(90,'');
  assert(r.discos.length===2,'sesión de 90 min elige dos álbumes');
  assert(new Set(r.discos.map(d=>d.artista)).size===2,'sesión prioriza artistas distintos');
  assert(r.segundos===85*60,'sesión aprovecha el tiempo cerca del objetivo');
}

if(process.exitCode){
  console.error('\nPruebas de Fase 6 FALLIDAS.');
  process.exit(process.exitCode);
}
console.log('\nPruebas de Fase 6 OK.');
