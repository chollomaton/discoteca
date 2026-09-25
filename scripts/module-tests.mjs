import fs from 'node:fs';
import { APP_JS_FILES } from './app-source.mjs';

const fail=(m)=>{ console.error('✗ '+m); process.exitCode=1; };
const ok=(m)=>console.log('✓ '+m);
const assert=(c,m)=>c?ok(m):fail(m);
const read=(f)=>fs.readFileSync(f,'utf8');

const expected=[
  'js/core.js','js/library.js','js/features.js','js/insights.js',
  'js/stats.js','js/settings.js','js/bootstrap.js'
];
assert(JSON.stringify(APP_JS_FILES)===JSON.stringify(expected),'orden modular canónico no ha cambiado');

const html=read('index.html');
assert(html.length<50000,'index.html sigue siendo un shell pequeño');
assert(!/<style>[\s\S]*?<\/style>/i.test(html),'CSS principal no vuelve a index.html');
assert(!/<script(?![^>]*\bsrc=)[^>]*>[\s\S]+?<\/script>/i.test(html),'JS principal no vuelve a index.html');

let previous=-1;
expected.forEach((file)=>{
  const src=read(file);
  assert(src.length>0,file+' no está vacío');
  assert(src.length<190000,file+' sigue en un tamaño mantenible');
  const at=html.indexOf('<script src="'+file+'"></script>');
  assert(at>previous,file+' mantiene su posición de carga');
  previous=at;
});

const core=read('js/core.js');
const library=read('js/library.js');
const features=read('js/features.js');
const insights=read('js/insights.js');
const stats=read('js/stats.js');
const settings=read('js/settings.js');
const bootstrap=read('js/bootstrap.js');

assert(/var VERSION = '2026\.09\.25-phase5'/.test(core),'VERSION vive en core.js');
assert(/function fusionar\(/.test(core),'sincronización base vive en core.js');
assert(/function paintCol\(/.test(library),'colección vive en library.js');
assert(/function openDetail\(/.test(library),'ficha vive en library.js');
assert(/function diagnosticarEdicion\(/.test(library),'Detective de la ficha vive en library.js');
assert(/function radarColeccion\(/.test(features),'Radar vive en features.js');
assert(/function maquinaDelTiempo\(/.test(insights),'Máquina del tiempo vive en insights.js');
assert(/function paintStats\(/.test(stats),'estadísticas viven en stats.js');
assert(/function paintDb\(/.test(settings),'Ajustes viven en settings.js');
assert(/function montarEventos\(/.test(bootstrap),'eventos viven en bootstrap.js');
assert(/serviceWorker\.register\('sw\.js'\)/.test(bootstrap),'registro PWA vive en bootstrap.js');
assert((APP_JS_FILES.filter((f)=>/\bboot\(\);/.test(read(f))).length)===1,'boot() solo se ejecuta una vez');
assert(/\bboot\(\);/.test(bootstrap),'boot() se ejecuta desde bootstrap.js');

if(process.exitCode){
  console.error('\nPruebas de modularización FALLIDAS.');
  process.exit(process.exitCode);
}
console.log('\nPruebas de modularización OK.');
