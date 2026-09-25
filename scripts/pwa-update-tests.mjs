import fs from 'node:fs';

const sw=fs.readFileSync('sw.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const fail=(m)=>{console.error('✗ '+m);process.exitCode=1;};
const ok=(m)=>console.log('✓ '+m);
const assert=(c,m)=>c?ok(m):fail(m);

assert(/var CACHE = 'discoteca-v49'/.test(sw),'service worker usa discoteca-v49');
assert(/caches\.open\(CACHE\)\.then\(function\(c\)\{\s*return c\.match\('\.\/index\.html'\)/s.test(sw),
  'navegación busca index.html solo en la caché activa');
assert(!/caches\.match\('\.\/index\.html'\)/.test(sw),
  'no queda búsqueda global de index.html entre cachés viejas');
assert(/caches\.open\(CACHE\)\.then\(function\(c\)\{ return c\.match\(e\.request\); \}\)/.test(sw),
  'assets runtime parten de la caché activa');
assert(/location\.replace\(base\.href\)/.test(index),
  'tras controllerchange se navega explícitamente a la versión nueva');
assert(/searchParams\.set\('app-update', Date\.now\(\)\)/.test(index),
  'la navegación de actualización lleva marca anti-cache');
assert(/sw\.postMessage\('saltar'\)/.test(index),
  'el botón sigue ordenando skipWaiting al worker nuevo');

if(process.exitCode){
  console.error('\nPruebas PWA FALLIDAS.');
  process.exit(process.exitCode);
}
console.log('\nPruebas PWA OK.');
