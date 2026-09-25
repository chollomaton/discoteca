import fs from 'node:fs';
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
assert.match(engine,/Vinilo|CD/,'filtro de formato preservado');
assert.match(engine,/joyas|nunca|parecidos|decadas/,'modos de descubrimiento preservados');

// Microanimaciones breves y compatibles con reduced motion.
assert.match(core,/prefers-reduced-motion/,'respeta reducción de movimiento');
assert.match(core,/function microFeedback\(/,'microfeedback centralizado');
assert.match(css,/@media\s*\(prefers-reduced-motion:\s*reduce\)/,'CSS respeta reduced motion');

console.log('✓ fase 8 final: descubrimiento local, sin telemetría ni persistencia lateral');
console.log('✓ fase 8 final: filtros/modos y reduced-motion protegidos');
