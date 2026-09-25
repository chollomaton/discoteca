import fs from 'node:fs';

const src=fs.readFileSync('index.html','utf8');
const fail=(m)=>{console.error('✗ '+m);process.exitCode=1;};
const ok=(m)=>console.log('✓ '+m);
const assert=(c,m)=>c?ok(m):fail(m);

assert(src.includes('id="musicHome"'),'existe el contenedor Apple Music de la colección');
assert(/function\s+pintarAppleHome\s*\(/.test(src),'existe pintarAppleHome()');
assert(/var base = coleccion\(\);\s*pintarAppleHome\(\);/.test(src),'paintCol actualiza la portada Apple Music');
assert(src.includes('data-home-action="radar"'),'portada ofrece acceso a Radar');
assert(src.includes('data-home-action="sesion"'),'portada ofrece Qué escucho ahora');
assert(src.includes("if(a === 'radar') radarColeccion()"),'acción Radar está enlazada');
assert(src.includes("else if(a === 'sesion') sesionEscucha()"),'acción Qué escucho está enlazada');
assert(src.includes("s.classList.add('album-sheet')"),'ficha de álbum activa el layout amplio');
assert(src.includes('<div class="dmeta"><h3>'),'ficha agrupa metadatos en dmeta');
assert(src.includes('.album-sheet .dhero{display:grid'),'ficha usa layout de dos columnas en escritorio');
assert(src.includes('@media (max-width:760px)') && src.includes('.album-sheet .dhero{display:block'),'ficha vuelve a layout vertical en móvil');
assert(src.includes('.mh-scroll{display:grid;grid-auto-flow:column'),'carruseles son horizontales y desplazables');
assert(src.includes('scroll-snap-type:x proximity'),'carruseles tienen scroll snap');
assert(src.includes('@media (prefers-reduced-motion: reduce)'),'se mantiene soporte reduced-motion');

/* La portada debe trabajar solo con DB local: nada de red nueva. */
const i=src.indexOf('function pintarAppleHome(){');
const j=src.indexOf('\nfunction paintCol(){',i);
assert(i>=0 && j>i,'se puede aislar pintarAppleHome');
if(i>=0 && j>i){
  const part=src.slice(i,j);
  assert(!/\bfetch\s*\(|\bmbGet\s*\(|\bdgGet\s*\(|\bitGet\s*\(/.test(part),
    'la portada Apple Music no hace consultas externas');
  assert(/hoyISO\(\)/.test(part) && /rngShuffle\(/.test(part),
    'la recomendación diaria es local y determinista por fecha');
}

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
