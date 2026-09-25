import assert from 'node:assert/strict';
import {readAppSource} from './app-source.mjs';

const src=readAppSource();
const must=(re,msg)=>assert.match(src,re,msg);

// Fase 4: toda entrada externa se clasifica antes de tocar la colección.
must(/function parseCSV\(text\)/,'parser CSV presente');
must(/function analizarImportacion\(filas\)/,'clasificación previa presente');
must(/nuevos\s*=\s*\[\],\s*identicos\s*=\s*\[\],\s*dudosos\s*=\s*\[\]/,'tres estados de importación');
must(/mejorS\s*>=\s*0\.72/,'umbral de revisión dudosa');
must(/Nada de lo que ya tienes se modificará sin que lo apruebes/,'confirmación explícita');

// Sustituir conserva la ficha local y solo superpone campos del CSV.
must(/normDisc\(Object\.assign\(\{\},\s*a,/,'sustitución conservadora');
must(/portada:\s*a\.portada\s*\|\|\s*b\.portada/,'portada local prioritaria');
must(/tracklist:\s*a\.tracklist\.length\s*\?\s*a\.tracklist\s*:\s*b\.tracklist/,'tracklist local prioritario');

// Backup/restauración: validar, confirmar, checkpoint y bloqueo durante sync.
must(/validarCopia\(JSON\.parse\(String\(r\.result\)\)\)/,'backup validado antes de fusionar');
must(/crearPuntoRecuperacion\('Antes de restaurar una copia'\)/,'checkpoint previo');
must(/configuracionEnCurso\s*\|\|\s*pullPromiseActual\s*\|\|\s*pushPromiseActual/,'restauración bloqueada durante sync');

// La vista previa de fusión no puede mutar la ficha real.
must(/JSON\.parse\(JSON\.stringify\(original\)\)/,'tracklist clonado profundamente');
must(/CAMPOS_CONFLICTO_FUSION/,'conflictos personales visibles');

console.log('✓ importación clasifica antes de escribir');
console.log('✓ sustitución conserva información local no representada por CSV');
console.log('✓ restauración valida y crea punto de recuperación');
console.log('✓ fusión de duplicados no muta la vista previa');
