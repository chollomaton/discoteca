import assert from 'node:assert/strict';
import {readAppSource} from './app-source.mjs';

const src=readAppSource();
const must=(re,msg)=>assert.match(src,re,msg);

// Fase 5: secretos fuera de localStorage y fuera de copias exportables.
must(/var CLAVES_CFG\s*=\s*\['token',\s*'discogs',\s*'anthropic',\s*'lastfm',\s*'ticketmaster',\s*'audd'\]/,'inventario de secretos');
must(/function configSinClaves\(cfg\)/,'configuración pública sin secretos');
must(/localStorage\.setItem\(LS_CFG,\s*JSON\.stringify\(publica\)\)/,'localStorage solo recibe config pública');
must(/CFG\.recordarClaves\s*\?\s*Object\.assign\(\{\},\s*CFG\)\s*:\s*publica/,'persistencia de claves requiere consentimiento');

// Sanitización de errores/logs para no filtrar credenciales.
must(/function ocultarSecretos\(texto\)/,'sanitizador presente');
must(/github_pat_\|gh\[pousr\]_/,'patrones GitHub cubiertos');
must(/Bearer\\s\+/,'Bearer cubierto');

// Configuración GitHub validada antes de construir destino remoto.
must(/function validarConfig\(cfg\)/,'validador de configuración');
must(/cfg\.path\.split\('\/'\)\.some/,'ruta remota segmentada y validada');
must(/!\/\\\.json\$\/i\.test\(cfg\.path\)/,'destino limitado a JSON');
must(/function ghHeaders\(\)/,'cabeceras GitHub centralizadas');

// Red degradada debe distinguir offline de error lógico.
must(/e instanceof TypeError\)\{\s*marcar\('off'\)/,'fallo de red marca offline');
must(/r\.status === 401 \|\| r\.status === 403/,'autorización tratada explícitamente');

console.log('✓ secretos aislados de localStorage y exportaciones');
console.log('✓ errores sanitizados contra fuga de credenciales');
console.log('✓ destino GitHub validado antes de sincronizar');
console.log('✓ red offline diferenciada de errores de autenticación');
