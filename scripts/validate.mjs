import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const fail = (m) => { console.error('✗ ' + m); process.exitCode = 1; };
const ok = (m) => console.log('✓ ' + m);
const assert = (c,m) => c ? ok(m) : fail(m);

const required = [
  'index.html','manifest.webmanifest','sw.js','datos.json','zxing-0.21.3.js',
  'apple-touch-icon-v2.png','icon-192-v2.png','icon-512-v2.png','icon-512-maskable.png'
];
required.forEach((f) => assert(fs.existsSync(path.join(root,f)), 'existe ' + f));
assert(!fs.existsSync(path.join(root,'apple-touch-icon.png')), 'no queda apple-touch-icon.png obsoleto');

const index = read('index.html');
const sw = read('sw.js');
const leeme = read('LEEME.md');
let manifest, datos;
try { manifest = JSON.parse(read('manifest.webmanifest')); ok('manifest.webmanifest es JSON válido'); }
catch(e){ fail('manifest.webmanifest inválido: ' + e.message); }
try { datos = JSON.parse(read('datos.json')); ok('datos.json es JSON válido'); }
catch(e){ fail('datos.json inválido: ' + e.message); }

try {
  const scripts = [...index.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m)=>m[1]).filter((s)=>s.trim());
  assert(scripts.length > 0, 'index.html contiene JavaScript inline');
  scripts.forEach((src,i)=>new vm.Script(src,{filename:'index-inline-' + (i+1) + '.js'}));
  ok('JavaScript de index.html compila');
} catch(e){ fail('JavaScript de index.html no compila: ' + e.message); }
try { new vm.Script(sw,{filename:'sw.js'}); ok('sw.js compila'); }
catch(e){ fail('sw.js no compila: ' + e.message); }

const version = (index.match(/var\s+VERSION\s*=\s*'([^']+)'/) || [])[1];
assert(!!version, 'VERSION está definida');
if(version) assert(leeme.includes('**Versión de esta entrega:** ' + version), 'LEEME.md usa la misma VERSION');
const cache = (sw.match(/var\s+CACHE\s*=\s*'([^']+)'/) || [])[1];
assert(/^discoteca-v\d+$/.test(cache || ''), 'CACHE tiene versión explícita');

if(manifest){
  assert(manifest.start_url === './index.html', 'manifest apunta a ./index.html');
  assert(Array.isArray(manifest.icons) && manifest.icons.length >= 3, 'manifest declara iconos PWA');
  (manifest.icons || []).forEach((i)=>assert(fs.existsSync(path.join(root,i.src)), 'asset PWA existe: ' + i.src));
  const mask=(manifest.icons||[]).find((i)=>String(i.purpose||'').split(/\s+/).includes('maskable'));
  assert(!!mask, 'manifest declara icono maskable');
  if(mask && fs.existsSync(path.join(root,mask.src))){
    const b=fs.readFileSync(path.join(root,mask.src));
    const png=b.length>24 && b.toString('ascii',1,4)==='PNG';
    assert(png, mask.src + ' es PNG');
    if(png) assert(b.readUInt32BE(16)===512 && b.readUInt32BE(20)===512, mask.src + ' mide 512x512');
  }
}

const shell = sw.match(/var\s+SHELL\s*=\s*(\[[\s\S]*?\]);/);
assert(!!shell, 'SHELL del service worker es detectable');
if(shell){
  assert(!/datos\.json/i.test(shell[1]), 'datos.json no está en precache');
  assert(!/zxing/i.test(shell[1]), 'ZXing no está en precache');
  assert(!/["']\.\/["']/.test(shell[1]), 'no se duplica ./ junto a ./index.html');
}
assert(/e\.request\.mode\s*===\s*['"]navigate['"]/.test(sw), 'fallback offline solo para navegación');
assert(/if\s*\(r\s*&&\s*r\.ok\)/.test(sw), 'runtime cache solo guarda respuestas correctas');

if(datos){
  assert(Array.isArray(datos.discos), 'datos.discos es array');
  assert(Array.isArray(datos.borrados), 'datos.borrados es array');
  if(Array.isArray(datos.discos)){
    const ids=datos.discos.map((d)=>d&&d.id).filter(Boolean);
    assert(ids.length===datos.discos.length, 'todos los discos tienen id');
    assert(new Set(ids).size===ids.length, 'no hay ids duplicados');
    assert(datos.discos.every((d)=>d.lista==='coleccion'||d.lista==='deseos'), 'lista solo usa colección/deseos');
    assert(datos.discos.every((d)=>Array.isArray(d.tracklist)), 'todos los tracklist son arrays');
    assert(datos.discos.every((d)=>!/discogs\.comhttps?:/i.test(String(d.discogs||''))), 'sin URLs Discogs concatenadas');
    assert(datos.discos.every((d)=>!/^http:\/\//i.test(String(d.fotoDisco||''))), 'sin fotoDisco HTTP inseguro');
    console.log('  Base actual: ' + datos.discos.length + ' fichas, ' + datos.discos.reduce((n,d)=>n+(d.tracklist||[]).length,0) + ' pistas.');
  }
}

const dbStart=index.indexOf('function paintDb(){');
const dbEnd=index.indexOf('/* ============================================================\n   14. EVENTOS',dbStart);
assert(dbStart>=0 && dbEnd>dbStart, 'se localiza paintDb()');
if(dbStart>=0 && dbEnd>dbStart){
  const db=index.slice(dbStart,dbEnd);
  const actionIds=new Set();
  for(const m of db.matchAll(/accion\([\s\S]*?\)/g)){
    const strings=[...m[0].matchAll(/'([^'\\]*(?:\\.[^'\\]*)*)'/g)].map((x)=>x[1]);
    if(strings.length>=5) actionIds.add(strings[strings.length-3]);
  }
  const handlers=new Set([...db.matchAll(/\bon\(\s*'([^']+)'\s*,/g)].map((m)=>m[1]));
  const missing=[...actionIds].filter((id)=>id&&!handlers.has(id));
  assert(missing.length===0,'todos los botones accion(...) de Ajustes tienen handler' + (missing.length?': '+missing.join(', '):''));
  assert(handlers.has('sesion'),'Qué escucho ahora sigue enlazado');
}

const ss=index.indexOf('function serializarDiscLigero');
const se=index.indexOf('function discosLigeros',ss);
if(ss>=0 && se>ss){
  const part=index.slice(ss,se);
  assert(!/if\s*\(\s*!t\.preview\s*\)\s*return\s+t/.test(part),'serialización no conserva preview vacío');
  assert(/j\s*!==\s*['"]preview['"]/.test(part),'serialización excluye preview');
}
assert(!/function\s+refrescarFaltan\s*\([^)]*\)\s*\{[\s\S]{0,200}?if\s*\(\s*!d\s*\|\|\s*!d\.faltan\s*\)/.test(index),'refrescarFaltan distingue completa de no revisada');

if(process.exitCode){
  console.error('\nValidación FALLIDA.');
  process.exit(process.exitCode);
}
console.log('\nValidación OK.');
