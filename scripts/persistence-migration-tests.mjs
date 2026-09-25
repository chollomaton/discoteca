import fs from 'node:fs';
import assert from 'node:assert/strict';
import {readAppSource} from './app-source.mjs';
const src=readAppSource();
const core=fs.readFileSync('js/core.js','utf8');
const transfer=fs.readFileSync('js/transfer.js','utf8');
const has=(s,r,m)=>assert(r.test(s),m);

// Migraciones y lectura conservadora.
has(core,/var LS_KEY = 'discoteca\.local\.v4'/,'clave local versionada');
has(core,/DB = \{ version: 4/,'esquema DB explícito');
has(core,/if\(typeof cfg\.recordarClaves !== 'boolean'\) CFG\.recordarClaves = true/,'migración de configuración antigua');
has(core,/DB\.discos = loc\.discos\.map\(normDisc\)/,'datos locales antiguos se normalizan al arrancar');
has(transfer,/doc\.version != null[\s\S]*doc\.version < 1 \|\| doc\.version > 4/,'copias declaran rango compatible');
has(transfer,/var doc = Array\.isArray\(o\) \? \{discos:o, borrados:\[\]\} : o/,'copias históricas en array siguen soportadas');

// Escritura interrumpida/fallback: la primaria es IndexedDB y el respaldo no sustituye una escritura fallida silenciosamente.
has(core,/tx\.oncomplete = function\(\)\{ res\(true\); \}/,'IndexedDB confirma commit de transacción');
has(core,/tx\.onabort = function\(\)\{ rej\(/,'abort de IndexedDB se propaga');
has(core,/return idbSet\(K_DATOS, payload\)\.catch/,'fallo primario activa fallback');
has(core,/localStorage\.setItem\(LS_KEY, JSON\.stringify\(payload\)\)/,'fallback conserva payload completo');
has(core,/throw e; \}/,'fallo del fallback no se oculta');

// Ninguna optimización ligera puede eliminar identidad o datos bibliográficos.
has(core,/NUNCA incluye[\s\S]*identificadores ni datos bibliográficos/,'contrato de serialización conservadora documentado');
has(core,/function serializarDiscLigero/,'serialización ligera centralizada');
has(core,/if\(j !== 'preview'\) c\[j\] = t\[j\]/,'solo preview efímero se elimina de pistas');

console.log('✓ migraciones conservadoras y copias históricas protegidas');
console.log('✓ escritura transaccional y fallback verificables');
console.log('✓ serialización ligera preserva identidad y datos bibliográficos');
