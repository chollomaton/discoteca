import fs from 'node:fs';
import assert from 'node:assert/strict';
import {APP_JS_FILES,readAppSource,readCss} from './app-source.mjs';

const src=readAppSource(), css=readCss();
const html=fs.readFileSync('index.html','utf8');

// Fase 6: arquitectura modular real; index no vuelve a convertirse en monolito.
assert.ok(APP_JS_FILES.length >= 8,'la app debe seguir modularizada');
for(const f of APP_JS_FILES){
  assert.ok(fs.existsSync(f),`${f} existe`);
  assert.ok(fs.statSync(f).size > 0,`${f} no está vacío`);
  assert.ok(html.includes(f),`${f} está cargado por index.html`);
}
assert.ok(Buffer.byteLength(html) < 120000,'index.html debe seguir siendo ligero');
assert.ok(Buffer.byteLength(css) > 1000,'estilos externos presentes');

// No reintroducir manejadores inline masivos ni un bundle JS pegado al HTML.
assert.ok(!/<script>(?:.|\n){5000,}<\/script>/i.test(html),'sin bundle monolítico inline');

// Contratos de PWA y recuperación de actualización.
assert.ok(fs.existsSync('sw.js'),'service worker presente');
assert.ok(fs.existsSync('manifest.webmanifest') || fs.existsSync('manifest.json'),'manifest presente');
const sw=fs.readFileSync('sw.js','utf8');
assert.match(src,/serviceWorker/,'registro/uso de service worker presente');
assert.match(sw,/caches\./,'service worker usa caché');
assert.match(sw,/fetch/,'service worker intercepta red');

// Límites básicos de tamaño: detectar regresiones accidentales gigantes.
for(const f of APP_JS_FILES) assert.ok(fs.statSync(f).size < 350000,`${f} no debe crecer sin límite`);

console.log(`✓ ${APP_JS_FILES.length} módulos cargados y separados`);
console.log('✓ index ligero y sin bundle monolítico inline');
console.log('✓ contratos PWA presentes');
console.log('✓ límites de crecimiento arquitectónico protegidos');
