import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const s=fs.readFileSync('js/insights.js','utf8');const c=vm.createContext({totalEscuchas:d=>d.escuchas||0,diasDesdeEscucha:d=>d.days||Infinity});vm.runInContext(s.slice(s.indexOf('function recomendarLocal'),s.indexOf('function registrarRecomendacion')),c);
const ds=[{id:'a',escuchas:2,days:120,valoracion:5},{id:'b',escuchas:0},{id:'c',escuchas:2,days:1},{id:'w',lista:'deseos',valoracion:5}],before=JSON.stringify(ds);
assert.equal(c.recomendarLocal(ds,'favorites').id,'a');assert.equal(c.recomendarLocal(ds,'old').id,'a');assert.equal(c.recomendarLocal(ds,'unheard').id,'b');assert.equal(c.recomendarLocal(ds,'random',0).id,'a');assert.equal(JSON.stringify(ds),before);assert.equal(c.recomendarLocal([],'random'),null);
console.log('W6: local voluntary recommendations exclude wishes, preserve collection and need no network');
