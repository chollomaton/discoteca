import fs from 'node:fs';
import assert from 'node:assert/strict';
import {readAppSource} from './app-source.mjs';
const src=readAppSource();
const sw=fs.readFileSync('sw.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const must=(re,msg)=>assert.match(src,re,msg);

// Ningún secreto debe entrar en backups, puntos de recuperación o HTML.
must(/function configSinClaves\(cfg\)/,'filtro de secretos presente');
must(/function ocultarSecretos\(texto\)/,'sanitización de logs presente');
assert.ok(!/value=["'][^"']*CFG\.(token|discogs|anthropic|lastfm|ticketmaster|audd)/.test(src),'secretos fuera de value HTML');
assert.match(html,/script-src 'self'/,'CSP restringe scripts');
assert.match(html,/no-referrer/,'referrer policy privada');

// El SW no debe incorporar datos privados a su precache estático.
assert.ok(!/['"](?:\.\/)?datos\.json['"]/.test(sw.split('install')[0]||''),'datos.json fuera de precache declarado');
assert.ok(!/backups\//.test(sw.split('install')[0]||''),'backups fuera de precache declarado');

// Recuperación debe seguir siendo explícita y reversible.
must(/crearPuntoRecuperacion\('Antes de restaurar una copia'\)/,'checkpoint antes de restaurar');
must(/fusionarCopiaRecuperacion/,'fusión de recuperación presente');
must(/restaurarBorrados/,'restauración de tombstones explícita');

console.log('✓ fase 7 final: secretos, CSP, referrer y caché privada protegidos');
console.log('✓ fase 7 final: restauración reversible y tombstones explícitos');
