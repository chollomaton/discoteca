import fs from 'node:fs';
import { readAppSource } from './app-source.mjs';

const sw=fs.readFileSync('sw.js','utf8');
const app=readAppSource();
const fail=(m)=>{console.error('✗ '+m);process.exitCode=1;};
const ok=(m)=>console.log('✓ '+m);
const assert=(c,m)=>c?ok(m):fail(m);

assert(/var CACHE = 'discoteca-v51'/.test(sw),'service worker usa discoteca-v51');
assert(/caches\.open\(CACHE\)\.then\(function\(c\)\{\s*return c\.match\('\.\/index\.html'\)/s.test(sw),
  'navegación busca index.html solo en la caché activa');
assert(!/caches\.match\('\.\/index\.html'\)/.test(sw),
  'no queda búsqueda global de index.html entre cachés viejas');
assert(/caches\.open\(CACHE\)\.then\(function\(c\)\{ return c\.match\(e\.request\); \}\)/.test(sw),
  'assets runtime parten de la caché activa');
assert(/location\.replace\(base\.href\)/.test(app),
  'tras controllerchange se navega explícitamente a la versión nueva');
assert(/searchParams\.set\('app-update', Date\.now\(\)\)/.test(app),
  'la navegación de actualización lleva marca anti-cache');
assert(/sw\.postMessage\('saltar'\)/.test(app),
  'el botón sigue ordenando skipWaiting al worker nuevo');

if(process.exitCode){
  console.error('\nPruebas PWA FALLIDAS.');
  process.exit(process.exitCode);
}
console.log('\nPruebas PWA OK.');
