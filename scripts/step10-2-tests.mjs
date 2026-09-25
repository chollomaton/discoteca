import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {APP_JS_FILES} from './app-source.mjs';
const read=f=>fs.readFileSync(f,'utf8');
const expected=['core','library','transfer','features','metadata','insights','stats','settings','bootstrap'].map(n=>`js/${n}.js`);
assert.deepEqual(APP_JS_FILES,expected);
assert.deepEqual([...read('index.html').matchAll(/<script src="(js\/[^" ]+)"/g)].map(m=>m[1]),expected);
const shell=read('sw.js').match(/var SHELL = (\[[^;]+\])/)[1];
assert.deepEqual(JSON.parse(JSON.stringify(vm.runInNewContext(shell))).filter(s=>s.startsWith('./js/')).map(s=>s.slice(2)),expected);
const responsibilities={transfer:['parseCSV','csvCell','filaADisco','analizarImportacion','importCsv','pantallaImportacion','revisarDudosos','exportarCsv','validarCopia','exportBackup','importBackup','fusionarCopiaRecuperacion','fusionaProfunda','fusionaTracklists','fusionarDuplicados'],metadata:['wikiBuscar','verWikipedia','cargarExtra','pintaExtra','cargarDiscogs','consistenciaIdentificadores','pintaTecnica','pantallaRevision','revisarTodo','revisarDisco']};
for(const [module,names] of Object.entries(responsibilities)) for(const name of names){
 const pattern=new RegExp(`(?:async )?function ${name}\\(`,'g');
 assert.equal([...read(`js/${module}.js`).matchAll(pattern)].length,1,name);
 for(const old of ['library','features']) assert(!pattern.test(read(`js/${old}.js`)),`${name} no vuelve a ${old}`);
}
// Un 7–10 % de margen para mantenimiento; ampliar requiere revisar arquitectura.
for(const [name,bytes,lines] of [['library',160000,3000],['features',145000,2700]]){
 const s=read(`js/${name}.js`);assert(Buffer.byteLength(s)<=bytes);assert(s.split('\n').length<=lines);
}
for(const name of ['inventarioUbicaciones','verArtista','sesionEscucha','radarColeccion']) assert(read('js/features.js').includes(`function ${name}(`));
// Evalúa cada script por separado y en orden, como las etiquetas HTML.
const ctx=vm.createContext({console,URL,URLSearchParams,localStorage:{getItem:()=>null},navigator:{},document:{addEventListener(){}},window:{addEventListener(){}},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0});
for(const file of expected.slice(0,-1)) vm.runInContext(read(file),ctx,{filename:file});
let boots=0;ctx.boot=()=>{boots++;for(const names of Object.values(responsibilities))for(const name of names)assert.equal(typeof ctx[name],'function',name);};
vm.runInContext(read('js/bootstrap.js'),ctx,{filename:'js/bootstrap.js'});assert.equal(boots,1);
const plain=x=>JSON.parse(JSON.stringify(x));
assert.deepEqual(plain(ctx.parseCSV('\uFEFFTitle,Artist\r\n"A, B","C"\r\n"D""E",F')), [{Title:'A, B',Artist:'C'},{Title:'D"E',Artist:'F'}]);
ctx.DB.discos=[ctx.normDisc({id:'original',artista:'Grupo',titulo:'Álbum',formato:'CD',numeroCatalogo:'CAT1'})];
const before=JSON.stringify(ctx.DB);
const r=ctx.analizarImportacion([{Title:'Álbum',Artist:'Grupo',Format:'CD'},{Title:'Álbum deluxe',Artist:'Grupo',Format:'CD','Catalog#':'CAT1'},{Title:'Otro',Artist:'Otro grupo',Format:'CD'}]);
assert.equal(r.identicos.length,1);assert.equal(r.dudosos.length,1);assert.equal(r.nuevos.length,1);assert.equal(JSON.stringify(ctx.DB),before);
const tracks=[[{titulo:'Tema',duracion:'3:00'}],[{titulo:'Tema',fav:1}]],saved=JSON.stringify(tracks);
assert.equal(ctx.fusionaTracklists(tracks)[0].fav,1);assert.equal(JSON.stringify(tracks),saved);
// Contrato entre metadata y la ficha, usando una respuesta externa controlada.
let persisted=0;ctx.persist=()=>{persisted++;};
ctx.mbGet=async()=>({'release-group':{},relations:[],media:[],genres:[]});
const d={mbid:'test',tracklist:[]};await ctx.cargarExtra(d);assert(d.extra);assert.equal(persisted,1);assert.equal(typeof ctx.duracionTotal,'function');
assert.equal(ctx.codigoDePaisDiscogs('Spain'),'ES');
console.log('✓ Paso 10.2: orden HTML/cache, límites, responsabilidades, carga global, CSV/duplicados sin mutación y metadata');
