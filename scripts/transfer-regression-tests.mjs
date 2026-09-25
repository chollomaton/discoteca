import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const src=fs.readFileSync('js/transfer.js','utf8');
const cut=src.indexOf('function importCsv');
assert(cut>0,'transfer.js debe conservar el núcleo de importación antes de importCsv');

const ctx={
  console,
  DB:{discos:[]},
  uid:(()=>{let n=0;return()=>`test-${++n}`;})(),
  nowISO:()=> '2026-09-25T00:00:00.000Z',
  plain:s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(),
  clasificar:s=>String(s||''),
  normDisc:d=>Object.assign({tracklist:[],etiquetas:[],escuchasFechas:[]},d),
  key:d=>`${String(d.artista||'').toLowerCase()}|${String(d.titulo||'').toLowerCase()}|${d.formato||''}`,
  similitud:(a,b)=>{
    a=String(a||'').toLowerCase(); b=String(b||'').toLowerCase();
    if(a===b)return 1;
    if(a.includes(b)||b.includes(a))return .8;
    return 0;
  }
};
vm.createContext(ctx);
vm.runInContext(src.slice(0,cut),ctx);

const csv='Artist,Title,Collection Notes\r\n"AC, DC","Back ""In"" Black","línea 1\n línea 2"\r\nHéroes del Silencio,Senderos de traición,España\r\n';
const rows=ctx.parseCSV(csv);
assert.equal(rows.length,2,'CSV con CRLF y salto dentro de comillas');
assert.equal(rows[0].Artist,'AC, DC','coma entrecomillada');
assert.equal(rows[0].Title,'Back "In" Black','comillas escapadas');
assert.match(rows[0]['Collection Notes'],/línea 2/,'salto entrecomillado');
assert.equal(rows[1].Artist,'Héroes del Silencio','Unicode preservado');

const bom=ctx.parseCSV('\uFEFFArtist,Title\nBjörk,Debut\n');
assert.equal(bom[0].Artist,'Björk','BOM y Unicode');
assert.equal(ctx.csvCell('a,b'),'"a,b"','exporta comas');
assert.equal(ctx.csvCell('a"b'),'"a""b"','exporta comillas');
assert.equal(ctx.csvCell('a\nb'),'"a\nb"','exporta saltos');

assert.equal(ctx.filaADisco({Artist:'',Title:''}),null,'fila vacía ignorada');
const cd=ctx.filaADisco({Artist:'Pearl Jam',Title:'Ten',Format:'CD, Album',Released:'1991'});
assert.equal(cd.formato,'CD','detecta CD');
const lp=ctx.filaADisco({Artist:'New Order',Title:'Power, Corruption & Lies',Format:'LP',Released:'1983'});
assert.equal(lp.formato,'Vinilo','detecta vinilo');

ctx.DB.discos=[ctx.normDisc({id:'a',artista:'Pearl Jam',titulo:'Ten',formato:'CD',numeroCatalogo:'',tracklist:[]})];
let an=ctx.analizarImportacion([{Artist:'Pearl Jam',Title:'Ten',Format:'CD'}]);
assert.equal(an.identicos.length,1,'duplicado exacto detectado');
assert.equal(an.nuevos.length,0,'duplicado exacto no se añade');

ctx.DB.discos=[ctx.normDisc({id:'b',artista:'Pet Shop Boys',titulo:'Behaviour',formato:'CD',numeroCatalogo:'CAT-1',tracklist:[]})];
an=ctx.analizarImportacion([{'Artist':'Pet Shop Boys','Title':'Behaviour Deluxe Edition','Format':'CD','Catalog#':'CAT-2'}]);
assert.equal(an.dudosos.length,1,'edición distinta se revisa, no se pisa');
assert.match(an.dudosos[0].motivo,/edición distinta|parecidos/,'motivo de revisión');

ctx.DB.discos=[ctx.normDisc({id:'c',artista:'Artista A',titulo:'Disco A',formato:'Vinilo',numeroCatalogo:'XYZ-7',tracklist:[]})];
an=ctx.analizarImportacion([{'Artist':'Otro artista','Title':'Otro título','Format':'LP','Catalog#':'XYZ-7'}]);
assert.equal(an.dudosos.length,1,'catálogo coincidente obliga a revisión');
assert.equal(an.nuevos.length,0,'catálogo coincidente no crea duplicado silencioso');

ctx.DB.discos=[];
an=ctx.analizarImportacion([
  {Artist:'Dover',Title:'Devil Came to Me',Format:'CD'},
  {Artist:'Dover',Title:'Devil Came to Me',Format:'CD'},
  {Artist:'Bon Jovi',Title:'Slippery When Wet',Format:'CD'}
]);
assert.equal(an.nuevos.length,2,'duplicados dentro del mismo CSV no se duplican');
assert.equal(an.identicos.length,1,'duplicado interno se clasifica como idéntico');

console.log('✓ CSV robusto: BOM, CRLF, comas, comillas, saltos y Unicode');
console.log('✓ Importación robusta: vacíos, formato, exactos, ediciones, catálogo y duplicados internos');
