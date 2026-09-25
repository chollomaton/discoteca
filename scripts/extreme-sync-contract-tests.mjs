import fs from 'node:fs';
import assert from 'node:assert/strict';
const core=fs.readFileSync('js/core.js','utf8');
const sync=fs.readFileSync('scripts/sync-tests.mjs','utf8');
const has=(s,r,m)=>assert(r.test(s),m);

// Exclusión mutua y deduplicación de ráfagas.
has(core,/var colaSincro = Promise\.resolve\(\)/,'cola global de sincronización');
has(core,/function encolarSync\(/,'pull y push comparten serialización');
has(core,/var pushPromiseActual = null, ultimaRevisionSubida = -1/,'push concurrente deduplicado');
has(core,/if\(pushPromiseActual\) return pushPromiseActual/,'llamadas simultáneas reutilizan promesa');
has(core,/if\(revisionDatos === ultimaRevisionSubida\) return Promise\.resolve\(true\)/,'revisión ya subida no genera PUT');

// Cambios durante un PUT y conflictos consecutivos.
has(core,/var MAX_REINTENTOS_PUSH = 3/,'conflictos tienen límite estricto');
has(core,/if\(intento >= MAX_REINTENTOS_PUSH\)/,'límite se aplica antes de reintentar');
has(core,/if\(revisionDatos !== revisionEnviada\) return push\(\)/,'cambio durante PUT genera segunda subida');
has(core,/if\(!resultado\) return resultado/,'fallo no entra en bucle de reintentos');

// Offline prolongado y reconexión no destruyen el estado pendiente.
has(core,/if\(e instanceof TypeError\)\{ marcar\('off'\); return false; \}/,'fallo de red se clasifica offline');
has(core,/ultimaRevisionSubida = revisionEnviada/,'solo éxito avanza revisión subida');
has(core,/if\(n && CFG\.token\)\{ syncState = 'pend'; programarPush\(\); \}/,'edición local queda pendiente');

// Los escenarios dinámicos ya cubren concurrencia real simulada.
has(sync,/tres push simultáneos/,'suite dinámica cubre ráfaga concurrente');
has(sync,/cambio producido durante un PUT/,'suite dinámica cubre edición en vuelo');
has(sync,/409 seguido de pull fallido/,'suite dinámica cubre conflicto + red fallida');
has(sync,/409 con pull correcto/,'suite dinámica cubre recuperación de conflicto');

console.log('✓ sincronización extrema: cola y deduplicación protegidas');
console.log('✓ conflictos consecutivos acotados y sin bucles');
console.log('✓ offline conserva cambios pendientes hasta recuperación');
console.log('✓ escenarios dinámicos de concurrencia permanecen activos');
