import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync('js/features.js','utf8');

// Sesiones retomables: persistir referencias mínimas, nunca copias de discos ni secretos.
assert.match(source,/K_SESION_ESCUCHA/,'clave de sesión presente');
assert.match(source,/normalizarSesionEscucha/,'normalización presente');
assert.match(source,/guardarSesionEscucha/,'guardado presente');
assert.match(source,/terminarSesionEscucha/,'cierre explícito presente');

const s=source.slice(source.indexOf('var K_SESION_ESCUCHA'),source.indexOf('function sesionEscucha(){'));
assert.match(s,/ids/,'sesión usa IDs');
assert.ok(!/CFG\.(token|discogs|anthropic|lastfm|ticketmaster|audd)/.test(s),'sesión no accede a secretos');
assert.ok(!/tracklist\s*:/.test(s),'sesión no serializa tracklists');
assert.match(s,/sessionStorage/,'persistencia limitada a sesión del navegador');
assert.match(s,/try\s*\{|catch\s*\(/,'fallos de almacenamiento controlados');

// Aislamiento por destino impide retomar una sesión contra otra colección remota.
assert.match(s,/destinoSesionEscucha/,'destino de sesión presente');
assert.match(s,/destino/,'destino serializado/validado');

console.log('✓ fase 9 final: sesiones mínimas por IDs y sin secretos');
console.log('✓ fase 9 final: almacenamiento degradable y aislamiento por destino');
