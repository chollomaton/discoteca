import fs from 'node:fs';
import assert from 'node:assert/strict';

const core=fs.readFileSync('js/core.js','utf8');
const meta=fs.readFileSync('js/metadata.js','utf8');
const transfer=fs.readFileSync('js/transfer.js','utf8');

function has(src,re,msg){ assert(re.test(src),msg); }

// Persistencia: IndexedDB es principal y localStorage solo respaldo/fallback.
has(core,/indexedDB\.open\(/,'IndexedDB disponible');
has(core,/localStorage\.setItem\(/,'respaldo localStorage disponible');
has(core,/try\s*\{[\s\S]*localStorage\.setItem/,'escritura localStorage protegida');
has(core,/catch\s*\([^)]*\)\s*\{[\s\S]*localStorage/,'fallback de almacenamiento protegido');

// Sincronización: red, auth, conflicto y exclusión mutua no deben degradarse.
has(core,/var colaSincro\s*=\s*Promise\.resolve/,'cola global de sincronización');
has(core,/if\(r\.status === 401 \|\| r\.status === 403\)/,'errores de autenticación explícitos');
has(core,/r\.status === 409 \|\| r\.status === 422/,'conflictos GitHub tratados');
has(core,/MAX_REINTENTOS_PUSH\s*=\s*3/,'reintentos de conflicto acotados');
has(core,/e instanceof TypeError[\s\S]*marcar\('off'\)/,'fallo de red pasa a offline');
has(core,/cache:'no-store'/,'pull evita caché HTTP obsoleta');

// Metadata: parámetros externos codificados, caché y enlaces seguros.
has(meta,/encodeURIComponent\(termino\)/,'Wikipedia codifica búsqueda');
has(meta,/var wikiCache\s*=\s*\{\}/,'Wikipedia tiene caché de sesión');
has(meta,/rel="noopener"/,'enlaces externos aislados con noopener');
has(meta,/Promise\.reject\(new Error\('sin mbid'\)\)/,'MusicBrainz falla explícitamente sin MBID');
has(meta,/Promise\.reject\(new Error\('sin token'\)\)/,'Discogs falla explícitamente sin token');
has(meta,/encodeURIComponent\(d\.numeroCatalogo\)/,'catálogo Discogs codificado');
has(meta,/\.catch\(function\(\)/,'metadata expone degradación controlada');

// Transferencia: el bloque anterior debe seguir presente tras futuras refactorizaciones.
has(transfer,/function parseCSV\(/,'parser CSV presente');
has(transfer,/function analizarImportacion\(/,'analizador de importación presente');

console.log('✓ persistencia: IndexedDB + fallback local protegido');
console.log('✓ sincronización: cola, offline, auth y conflictos acotados');
console.log('✓ metadata: codificación, caché, credenciales y degradación controlada');
console.log('✓ transferencia: contratos de importación preservados');
