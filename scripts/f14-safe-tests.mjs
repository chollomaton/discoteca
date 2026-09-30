import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const core=fs.readFileSync('js/core.js','utf8'),transfer=fs.readFileSync('js/transfer.js','utf8');
const cut=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
const disc={id:'one',artista:'Talking Heads',titulo:'Remain in Light'};
function context(){
 const c=vm.createContext({document:{body:{classList:{add(){},remove(){}}}}, console,AbortController,setTimeout,clearTimeout,TextDecoder,TextEncoder,atob,btoa,TypeError,SyntaxError,JSON,
 CFG:{owner:'owner',repo:'repo',branch:'main',path:'datos.json',token:'token'},DB:{discos:[disc],borrados:[]},SHA:'old',lastSync:'',revisionDatos:0,
 marcar(){},renderAll(){},indexarFirmas(){},nowISO:()=>new Date().toISOString(),normDisc:x=>x,programarPush(){},toast(){},
 fusionar:(l,b,r,br)=>({discos:r,borrados:br,aLocal:1,aRemoto:0}),crearPuntoRecuperacion:()=>Promise.resolve(),guardarLocal:()=>Promise.resolve()});
 vm.runInContext(cut(transfer,'function validarCopia','function descargarCopia'),c);
 vm.runInContext(cut(core,'var cargaColeccion','function guardarLocal'),c);
 vm.runInContext(cut(core,'function destinoConfig','function crearPuntoRecuperacion'),c);
 vm.runInContext(cut(core,"var GH =",'function pintarSync'),c);
 vm.runInContext(cut(core,'function pullReal','/* ---------- subida'),c);
 vm.runInContext(cut(core,'function pushInterno','var pushPromiseActual'),c);
 c.aceptarColeccion(c.DB,'cache');return c;
}
for(const status of [401,403,404,429,500,503]){
 const c=context();let puts=0;c.fetch=async(u,o)=>{if(o.method==='PUT')puts++;return{status,ok:false}};
 assert.equal(await c.pullReal(true),false);assert.equal(await c.pushInterno(),false);assert.equal(puts,0);assert.equal(c.DB.discos.length,1);
}
for(const payload of ['', 'null', '{','{}','[]',JSON.stringify({discos:[]}),JSON.stringify({discos:[{id:'bad'}]})]){
 const c=context();c.fetch=async()=>({ok:true,status:200,json:async()=>({sha:'new',content:btoa(payload)}) ,text:async()=>payload});
 assert.equal(await c.pullReal(true),false);assert.equal(c.escrituraSegura(true),false);assert.equal(c.DB.discos.length,1);
}
for(const error of [new TypeError('offline'),new DOMException('timeout','AbortError')]){
 const c=context();c.fetch=async()=>{throw error};assert.equal(await c.pullReal(true),false);assert.equal(c.escrituraSegura(true),false);assert.equal(c.DB.discos.length,1);
}
{
 const c=context();c.CFG.token='';c.fetch=()=>{throw Error('unexpected fetch')};assert.equal(await c.pullReal(),false);assert.equal(c.cargaColeccion,'auth_required');
}
{
 const c=context();c.fetch=async()=>({ok:true,status:200,json:async()=>({sha:'new',content:btoa(JSON.stringify({discos:[disc]}))})});
 assert.equal(await c.pullReal(),true);assert.equal(c.escrituraSegura(true),true);
 c.DB.discos=[];assert.equal(c.escrituraSegura(false),false);assert.equal(await c.pushInterno(),false);
 c.CFG.token='changed';assert.equal(c.escrituraSegura(true),false);
}
console.log('F14-SAFE: HTTP, auth, offline, timeout, corruption, empty and write barriers OK');
