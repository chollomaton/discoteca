import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const core=fs.readFileSync('js/core.js','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const source=core.slice(core.indexOf('var CLAVES_CFG'),core.indexOf('function validarConfig'));
const local=new Map(), session=new Map();
const storage=m=>({getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)});
let record=null, fail=false;
const fresh=(update=false)=>{
 const c=vm.createContext({CFG:{},localStorage:storage(local),sessionStorage:storage(session),LS_CFG:'cfg',K_CFG:'cfg',URL,location:{href:'https://example.test/index.html'+(update?'?app-update=1':'')},idbSet:async(k,v)=>{if(fail)throw Error('IDB unavailable');record=JSON.parse(JSON.stringify(v));}});
 vm.runInContext(source,c);return c;
};
let c=fresh();
const secrets=Object.fromEntries(c.CLAVES_CFG.map(k=>[k,'test-only-'+k]));
const check=cfg=>{for(const k of c.CLAVES_CFG)assert.equal(cfg[k],secrets[k]);};
c.CFG={...secrets,recordarClaves:true};await c.guardarCfg();
c=fresh();check(c.restaurarCfg(record));check(c.restaurarCfg(null));
check(c.restaurarCfg({...record,token:'',discogs:'',ticketmaster:''}));
local.set('cfg',JSON.stringify({...record,token:'',discogs:'',ticketmaster:''}));check(c.restaurarCfg(record));
c.CFG={...secrets,recordarClaves:true};fail=true;await assert.rejects(c.guardarCfg());check(fresh().restaurarCfg(null));fail=false;
console.log('✓ recordar=true, reload, IDB fallback y valores vacíos');
for(const remember of [true,false]){
 c=fresh();c.CFG={...secrets,recordarClaves:remember};await c.guardarCfg();
 // Execute the actual update navigation callback, including its stash hook.
 let navigated='';c.setTimeout=fn=>fn();c.location.replace=url=>navigated=url;
 const start=bootstrap.indexOf('        setTimeout(function(){',bootstrap.indexOf('var finalizarActualizacion'));
 vm.runInContext(bootstrap.slice(start,bootstrap.indexOf('}, 120);',start)+8),c);
 assert(navigated.includes('app-update='));
 c=fresh(true);check(c.restaurarCfg(record));assert.equal(session.size,0);
 if(!remember){c=fresh();for(const k of c.CLAVES_CFG)assert.equal(c.restaurarCfg(record)[k],'');}
}
console.log('✓ app-update one-shot; recordar=false no persiste en reload normal');
c.CFG={...secrets,recordarClaves:true};await c.guardarCfg();c.prepararCfgActualizacion();
// Execute the credential-clearing portion of the real disconnect handler.
c.SHA='';c.toast=()=>{};
const off=core.indexOf('    CFG = configSinClaves(CFG);',core.indexOf("if($('#sOff'))"));
vm.runInContext(core.slice(off,core.indexOf('    readOnly = true;',off)),c);
await Promise.resolve();
for(const k of c.CLAVES_CFG){assert.equal(record[k],'');assert.equal(JSON.parse(local.get('cfg'))[k],'');}
assert.equal(session.size,0);
assert.deepEqual(fs.readFileSync('datos.json'),execFileSync('git',['show','HEAD:datos.json'],{maxBuffer:20*1024*1024}));
console.log('✓ desconectar limpia IDB/local/session; datos.json byte-identical');
