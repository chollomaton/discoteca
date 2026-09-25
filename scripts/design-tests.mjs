import fs from 'node:fs';

const src=fs.readFileSync('index.html','utf8');
const fail=(m)=>{console.error('✗ '+m);process.exitCode=1;};
const ok=(m)=>console.log('✓ '+m);
const assert=(c,m)=>c?ok(m):fail(m);

assert(src.includes('id="musicHome"'),'existe el contenedor Apple Music de la colección');
assert(/function\s+pintarAppleHome\s*\(/.test(src),'existe pintarAppleHome()');
assert(/var base = coleccion\(\);\s*pintarAppleHome\(\);/.test(src),'paintCol actualiza la portada Apple Music');
assert(src.includes('data-collection-action="sesion"'),'colección ofrece acceso compacto a Qué escucho ahora');
assert(src.includes('data-collection-action="recientes"'),'colección ofrece acceso compacto a Recién añadidos');
assert(src.includes('data-collection-action="volver"'),'colección ofrece acceso compacto a Vuelve a ponerlos');
assert(!src.includes('data-home-action="radar"'),'Radar ya no ocupa la portada de colección');
assert(src.includes("if(a === 'sesion') sesionEscucha()"),'Qué escucho ahora está enlazado');
assert(src.includes("abrirSeleccionColeccion('recientes')"),'Recién añadidos abre una selección bajo demanda');
assert(src.includes("abrirSeleccionColeccion('volver')"),'Vuelve a ponerlos abre una selección bajo demanda');
assert(src.includes("s.classList.add('album-sheet')"),'ficha de álbum activa el layout amplio');
assert(src.includes('<div class="dmeta"><h3>'),'ficha agrupa metadatos en dmeta');
assert(src.includes('.album-sheet .dhero{display:grid'),'ficha usa layout de dos columnas en escritorio');
assert(src.includes('@media (max-width:760px)') && src.includes('.album-sheet .dhero{display:block'),'ficha vuelve a layout vertical en móvil');
assert(src.includes('.collection-actions{display:flex'),'los accesos de colección son compactos');
assert(src.includes('overflow-x:auto'),'los accesos compactos funcionan en iPhone sin ocupar varias filas');
assert(src.includes('.quick-albums{display:grid'),'las selecciones se muestran solo al pedirlas');
assert(src.includes('@media (prefers-reduced-motion: reduce)'),'se mantiene soporte reduced-motion');

/* Los accesos y la recomendación trabajan solo con datos locales. */
const i=src.indexOf('function quickAlbumHtml(d){');
const j=src.indexOf('\nfunction paintCol(){',i);
assert(i>=0 && j>i,'se puede aislar la barra compacta de colección');
if(i>=0 && j>i){
  const part=src.slice(i,j);
  assert(!/\bfetch\s*\(|\bmbGet\s*\(|\bdgGet\s*\(|\bitGet\s*\(/.test(part),
    'los accesos compactos no hacen consultas externas');
}
const si=src.indexOf('function recomendadoColeccion(seed){');
const sj=src.indexOf('\n\n/* ============================================================\n   ADN MUSICAL',si);
assert(si>=0 && sj>si,'se puede aislar Qué escucho ahora');
if(si>=0 && sj>si){
  const part=src.slice(si,sj);
  assert(!/\bfetch\s*\(|\bmbGet\s*\(|\bdgGet\s*\(|\bitGet\s*\(/.test(part),
    'Qué escucho ahora no hace consultas externas');
  assert(/hoyISO\(\)/.test(part) && /rngShuffle\(/.test(part),
    'Recomendado para hoy está integrado y es local');
  assert(/data-modo-escucha="uno"/.test(part) && /data-modo-escucha="tiempo"/.test(part),
    'Qué escucho ahora unifica recomendación y selección por tiempo');
}
assert(src.includes("seccion(I.aguja, 'Salud de la colección'"),'Radar vive en Salud de la colección dentro de Ajustes');

/* Evita que una futura edición vuelva a meter un sexto destino móvil:
   esta fase cambia el aspecto, no la arquitectura de navegación. */
const tabbar=(src.match(/<nav class="tabbar"[\s\S]*?<\/nav>/)||[''])[0];
const destinos=[...tabbar.matchAll(/data-v="([^"]+)"/g)].map(x=>x[1]);
assert(JSON.stringify(destinos)===JSON.stringify(['col','wish','stats','db']),
  'la navegación móvil conserva sus cuatro destinos existentes');

if(process.exitCode){
  console.error('\nPruebas de diseño FALLIDAS.');
  process.exit(process.exitCode);
}
console.log('\nPruebas de diseño OK.');
