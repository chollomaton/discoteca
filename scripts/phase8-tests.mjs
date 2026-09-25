import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const insights = fs.readFileSync('js/insights.js','utf8');
const core = fs.readFileSync('js/core.js','utf8');
let ds = Array.from({length:21},(_,i)=>({id:'d'+i, titulo:'Álbum '+i, artista:'Artista '+i,
  formato:i%2?'CD':'Vinilo', valoracion:i%3?5:2, genero:'Jazz', sello:'Blue',
  año:1970+i, escuchas:i%4?0:2, ultimaEscucha:i%4?'':'2020-01-01', escuchasFechas:[]}));
const ctx = vm.createContext({console,Date,Set,Math,coleccion:()=>ds,readOnly:false,
  hoyISO:()=> '2026-09-25',totalEscuchas:d=>d.escuchas||0,fdate:s=>s,
  escuchadoHoy:d=>(d.escuchasFechas||[]).includes('2026-09-25'),
  esc:s=>String(s||'').replace(/"/g,'&quot;'),coverHtml:()=>'',I:{check:'✓',playF:'▶'}});
vm.runInContext(core.slice(core.indexOf('function rngShuffle('),core.indexOf('\n}',core.indexOf('function rngShuffle('))+2),ctx);
vm.runInContext(insights.slice(insights.indexOf('function sugerenciasDelDia('),insights.indexOf('function explorarColeccion(')),ctx);
const snapshot=JSON.stringify(ds);
for(const mode of ['hoy','joyas','nunca','parecidos','decadas']){
  for(const format of ['', 'Vinilo','CD']){
    const all=ctx.seleccionExplorar(mode,123,format);
    assert(all.every(x=>ds.includes(x.d) && (!format||x.d.formato===format)));
    assert.equal(new Set(all.map(x=>x.d.id)).size,all.length);
    if(mode==='nunca') assert(all.every(x=>!x.d.escuchas));
    if(mode==='joyas') assert(all.every(x=>x.d.valoracion>=4));
    let seen=[],collected=[];
    do {
      const r=ctx.tandaExplorar(all,seen,6);
      if(!r.items.length) break;
      assert(!r.reinicio);
      collected.push(...r.items.map(x=>x.d.id));seen=r.vistos;
      if(!r.restantes) break;
    } while(true);
    assert.equal(new Set(collected).size,all.length);
    if(all.length) assert(ctx.tandaExplorar(all,seen,6).reinicio);
  }
}
assert.equal(JSON.stringify(ds),snapshot,'seleccionar nunca modifica datos');
const repeated=[{d:ds[0]},{d:ds[0]},{d:ds[1]}];
assert.equal(ctx.tandaExplorar(repeated,[],6).items.length,2);
ds=[{id:'small',titulo:'Sin portada',formato:'CD',escuchas:0}];
assert.equal(ctx.seleccionExplorar('hoy',1,'CD').length,1);
assert.equal(ctx.seleccionExplorar('hoy',1,'Vinilo').length,0);
assert.equal(ctx.seleccionExplorar('parecidos',1,'').length,0);
assert.equal(ctx.seleccionExplorar('decadas',1,'').length,0);
assert(ctx.itemExplorarHtml(ds.map(d=>({d}))[0]).includes('data-explore-listen'));
ctx.readOnly=true;
assert(!ctx.itemExplorarHtml({d:ds[0]}).includes('data-explore-listen'));
ds=[];assert.equal(ctx.seleccionExplorar('hoy',1,'').length,0);
// Motion support is optional, reduced-motion never calls animate, repeated feedback cancels its predecessor.
let reduce=false,calls=0,cancelled=0,options;
ctx.window={matchMedia:()=>({matches:reduce})};
vm.runInContext(core.slice(core.indexOf('function microFeedback(')),ctx);
const el={animate:(frames,opts)=>{calls++;options=opts;return {cancel(){cancelled++;}};}};
ctx.microFeedback(null);ctx.microFeedback({});
ctx.microFeedback(el);assert.equal(calls,1);assert.equal(options.iterations,1);assert(options.duration<=240);
ctx.microFeedback(el,'reveal');assert.equal(cancelled,1);
el._microFeedback.onfinish();assert.equal(el._microFeedback,null);
reduce=true;ctx.microFeedback(el);assert.equal(calls,2);
assert(!/\b(fetch|persist)\s*\(/.test(insights.slice(insights.indexOf('function seleccionExplorar('),insights.indexOf('function explorarColeccion('))));
console.log('✓ Fase 8: formatos, cinco modos, tandas completas sin duplicados, reinicio, vacíos, colección pequeña, solo lectura y movimiento reducido');
