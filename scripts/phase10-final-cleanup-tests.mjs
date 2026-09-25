import fs from 'node:fs';
import assert from 'node:assert/strict';
import {APP_JS_FILES,readAppSource} from './app-source.mjs';
const src=readAppSource();
const html=fs.readFileSync('index.html','utf8');

// Limpieza técnica: módulos únicos, sin scripts inexistentes ni crecimiento accidental extremo.
assert.equal(new Set(APP_JS_FILES).size,APP_JS_FILES.length,'sin módulos JS duplicados');
for(const f of APP_JS_FILES){
  assert.ok(fs.existsSync(f),`${f} existe`);
  assert.ok(fs.statSync(f).size>0,`${f} no está vacío`);
  assert.ok(html.includes(f),`${f} cargado por index`);
}
assert.ok(!/<script[^>]+src=["'][^"']+["'][^>]*>\s*[^<]+<\/script>/i.test(html),'scripts externos sin cuerpo accidental');

// Solo comentarios de deuda explícitos; palabras normales dentro de strings/UI no son deuda técnica.
const debtComment=/(?:\/\/[^\n]*\b(?:TODO|FIXME|HACK)\b|\/\*[\s\S]*?\b(?:TODO|FIXME|HACK)\b[\s\S]*?\*\/)/i;
assert.ok(!debtComment.test(src),'sin comentarios TODO/FIXME/HACK pendientes en código de producción');

// No reintroducir funciones críticas duplicadas.
for(const name of ['validarCopia','fusionar','guardarLocal','pull','push','microFeedback']){
  const n=(src.match(new RegExp(`function\\s+${name}\\s*\\(`,'g'))||[]).length;
  assert.equal(n,1,`${name} debe tener una única implementación`);
}
console.log('✓ fase 10: módulos, referencias y funciones críticas sin duplicación');
console.log('✓ fase 10: sin comentarios TODO/FIXME/HACK pendientes en producción');
