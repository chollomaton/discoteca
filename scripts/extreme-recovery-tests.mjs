import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readAppSource} from './app-source.mjs';

const src=readAppSource();
const block=(a,b)=>{const s=src.indexOf(a),e=src.indexOf(b,s);assert(s>=0&&e>s,`bloque ${a}`);return src.slice(s,e);};
const clone=x=>JSON.parse(JSON.stringify(x));
const ctx=vm.createContext({console,Date,Set,Map,Number,JSON,Object,String,Array,Promise,Math,
 DB:{version:4,discos:[],borrados:[]},nowISO:()=> '2026-09-25T22:00:00.000Z',uid:(()=>{let n=0;return()=>`id-${++n}`;})(),
 plain:s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(),
 normDisc:d=>Object.assign({lista:'coleccion',tracklist:[],etiquetas:[],escuchasFechas:[]},d)});
vm.runInContext(block('function validarCopia(o){','function descargarCopia'),ctx);
vm.runInContext(block('function fechaMasReciente','/* ---------- descarga ---------- */'),ctx);
vm.runInContext(block('function fusionarCopiaRecuperacion','function importBackup'),ctx);

const base={id:'x',artista:'A',titulo:'T',lista:'coleccion',tracklist:[],mod:'2026-09-01T00:00:00Z'};
const valid={version:4,discos:[base],borrados:[]};
assert.equal(ctx.validarCopia(valid).discos.length,1);

// Límites y tipos hostiles: nunca aceptar una estructura que pueda romper render/sync.
for(const bad of [
 {version:4,discos:'no-array',borrados:[]},
 {version:4,discos:[],borrados:{}},
 {version:4,discos:[{...base,id:''}],borrados:[]},
 {version:4,discos:[{...base,lista:'otra'}],borrados:[]},
 {version:4,discos:[{...base,tracklist:null}],borrados:[]},
 {version:4,discos:[{...base,tracklist:[{titulo:'ok'},null]}],borrados:[]},
 {version:4,discos:[base],borrados:[{id:'x',fecha:'not-a-date'}]},
 {version:4,discos:[base,{...base}],borrados:[]}
]) assert.throws(()=>ctx.validarCopia(bad));

// Unicode y texto grande deben sobrevivir sin mutación silenciosa.
const unicode={...base,id:'unicode',artista:'Björk 日本語',titulo:'Héroes — “Álbum”',notas:'ñ'.repeat(20000)};
const checked=ctx.validarCopia({version:4,discos:[unicode],borrados:[]});
assert.equal(checked.discos[0].artista,unicode.artista);
assert.equal(checked.discos[0].titulo,unicode.titulo);
assert.equal(checked.discos[0].notas.length,20000);

// Recuperación respeta tombstones salvo restauración explícita.
ctx.DB={version:4,discos:[],borrados:[{id:'x',fecha:'2026-09-20T00:00:00Z'}]};
let merged=ctx.fusionarCopiaRecuperacion(valid,false);
assert.equal(merged.discos.length,0);
assert.equal(merged.borrados.length,1);
merged=ctx.fusionarCopiaRecuperacion(valid,true);
assert.equal(merged.discos.length,1);
assert.equal(merged.borrados.length,0);

// Una copia con varios registros conserva IDs y no altera el documento fuente.
const many={version:4,discos:Array.from({length:1000},(_,i)=>({...base,id:`d-${i}`,titulo:`Disco ${i}`,tracklist:[{titulo:`Pista ${i}`}] })),borrados:[]};
const snapshot=JSON.stringify(many);
const out=ctx.validarCopia(many);
assert.equal(out.discos.length,1000);
assert.equal(new Set(out.discos.map(d=>d.id)).size,1000);
assert.equal(JSON.stringify(many),snapshot,'validar no muta la copia fuente');

console.log('✓ estructuras hostiles rechazadas antes de entrar en DB');
console.log('✓ Unicode y campos grandes sobreviven a validación');
console.log('✓ tombstones y restauración explícita mantienen semántica');
console.log('✓ copia de 1000 registros validada sin mutar el origen');
