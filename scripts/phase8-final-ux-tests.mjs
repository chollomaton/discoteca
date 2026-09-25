import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const insights=fs.readFileSync('js/insights.js','utf8');
const core=fs.readFileSync('js/core.js','utf8');
const css=fs.readFileSync('styles.css','utf8');

// Descubrimiento debe seguir siendo local: nunca convertir recomendaciones en telemetría.
const start=insights.indexOf('function seleccionExplorar('), end=insights.indexOf('function explorarColeccion(');
assert.ok(start>=0&&end>start,'motor explorar presente');
const engine=insights.slice(start,end);
assert.ok(!/\bfetch\s*\(/.test(engine),'explorar no llama a red');
assert.ok(!/localStorage|sessionStorage|indexedDB/.test(engine),'selección no persiste efectos laterales');
assert.match(engine,/joyas|nunca|parecidos|decadas/,'modos de descubrimiento preservados');

// El filtro de formato se comprueba por comportamiento, no por literales de UI.
const ctx=vm.createContext({
  console,Date,Set,Math,
  coleccion:()=>[
    {id:'v',titulo:'Vinilo',artista:'A',formato:'Vinilo',valoracion:5,genero:'Rock',sello:'S',año:1990,escuchas:0,ultimaEscucha:'',escuchasFechas:[]},
    {id:'c',titulo:'CD',artista:'B',formato:'CD',valoracion:5,genero:'Rock',sello:'S',año:1991,escuchas:0,ultimaEscucha:'',escuchasFechas:[]}
  ],
  hoyISO:()=> '2026-09-25',
  totalEscuchas:d=>d.escuchas||0,
  diasDesdeEscucha:()=>Infinity,
  sugerenciasDelDia:ds=>ds.map(d=>({d, motivo:'local'})),
  rngShuffle:ds=>ds.slice()
});
vm.runInContext(engine.slice(0,engine.indexOf('/* Recorre candidatos')),ctx);
assert.deepEqual(Array.from(ctx.seleccionExplorar('hoy',1,'Vinilo'),x=>x.d.id),['v'],'filtro Vinilo preservado');
assert.deepEqual(Array.from(ctx.seleccionExplorar('hoy',1,'CD'),x=>x.d.id),['c'],'filtro CD preservado');
assert.deepEqual(Array.from(ctx.seleccionExplorar('hoy',1,''),x=>x.d.id),['v','c'],'sin filtro conserva ambos formatos');

// Microanimaciones breves y compatibles con reduced motion.
assert.match(core,/prefers-reduced-motion/,'respeta reducción de movimiento');
assert.match(core,/function microFeedback\(/,'microfeedback centralizado');
assert.match(css,/@media\s*\(prefers-reduced-motion:\s*reduce\)/,'CSS respeta reduced motion');

console.log('✓ fase 8 final: descubrimiento local, sin telemetría ni persistencia lateral');
console.log('✓ fase 8 final: filtros probados por comportamiento, modos y reduced-motion protegidos');
