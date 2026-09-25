import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync('index.html','utf8');
const fail = (m) => { console.error('✗ ' + m); process.exitCode = 1; };
const ok = (m) => console.log('✓ ' + m);
const assert = (c,m) => c ? ok(m) : fail(m);
const eq = (a,b,m) => assert(JSON.stringify(a)===JSON.stringify(b), m + (JSON.stringify(a)===JSON.stringify(b) ? '' : '\n  obtenido: ' + JSON.stringify(a) + '\n  esperado: ' + JSON.stringify(b)));

function sliceBetween(a,b){
  const i=src.indexOf(a), j=src.indexOf(b,i);
  if(i<0 || j<0) throw new Error('No se pudo extraer bloque: ' + a);
  return src.slice(i,j);
}

const ctx = vm.createContext({
  console, JSON, Date, Math, Number, String, Object, Array, RegExp,
  uid: ()=> 'test-id',
  nowISO: ()=> ctx.__now || '2026-09-25T12:00:00.000Z',
  DB:{discos:[],borrados:[]},
  firmas:{}, firmasCampos:{}
});

/* Utilidades + modelo + firmas exactos de producción. */
vm.runInContext(sliceBetween('function limpiaNombre','function hoyISO'), ctx);
/* Serializador exacto de producción. */
vm.runInContext(sliceBetween('var CAMPOS_LIGEROS','function coleccion'), ctx);
/* Persistencia/sellado exacto de producción. */
vm.runInContext(sliceBetween('function sellarCambios','/* revisionDatos sube'), ctx);
/* Fusión exacta de producción. */
vm.runInContext(sliceBetween('function fechaMasReciente','/* ---------- descarga ---------- */'), ctx);

const clone = (x)=>JSON.parse(JSON.stringify(x));
const T0='2026-09-25T08:00:00.000Z', T1='2026-09-25T09:00:00.000Z',
      T2='2026-09-25T10:00:00.000Z', T3='2026-09-25T11:00:00.000Z';

function baseDisc(){
  return ctx.normDisc({
    id:'d1', lista:'coleccion', artista:'Artista', titulo:'Álbum', año:'2000',
    formato:'CD', genero:'Rock', sello:'Sello', numeroCatalogo:'CAT-1', pais:'ES',
    portada:'https://example.test/a.jpg', tracklist:[{titulo:'Uno',duracion:'3:00'}],
    notas:'', etiquetas:[], editado:{}, escuchas:0, escuchasFechas:[],
    fechaAlta:T0, mod:T0
  });
}

/* 1. Estado idéntico: convergencia sin falsos cambios. */
{
  const a=baseDisc(), b=clone(a);
  const r=ctx.fusionar([a],[],[b],[]);
  eq([r.aLocal,r.aRemoto],[0,0],'estado idéntico no genera cambios');
}

/* 2. Compatibilidad: sin metadata granular se conserva el LWW histórico. */
{
  const l=baseDisc(), r=clone(l);
  l.titulo='Título local'; l.mod=T2;
  r.notas='Nota remota'; r.mod=T3;
  const m=ctx.fusionar([l],[],[r],[]).discos[0];
  eq([m.titulo,m.notas],['Álbum','Nota remota'],'cliente antiguo mantiene last-write-wins por ficha');
}

/* 3. Dos dispositivos modernos editan CAMPOS DISTINTOS: ambos sobreviven. */
{
  const l=baseDisc(), r=clone(l);
  l.modsBase=T0; r.modsBase=T0;
  l.titulo='Título local'; l.modsCampos={titulo:T2}; l.mod=T2;
  r.notas='Nota remota'; r.modsCampos={notas:T3}; r.mod=T3;
  const z=ctx.fusionar([l],[],[r],[]);
  eq([z.discos[0].titulo,z.discos[0].notas],['Título local','Nota remota'],'ediciones concurrentes en campos distintos se combinan');
  assert(z.aLocal>0 && z.aRemoto>0,'la combinación se propaga a ambos lados');
}

/* 4. Mismo campo: gana su propia marca más reciente, no el mod global. */
{
  const l=baseDisc(), r=clone(l);
  l.modsBase=T0; r.modsBase=T0;
  l.titulo='Local'; l.modsCampos={titulo:T3}; l.mod=T3;
  r.titulo='Remoto'; r.modsCampos={titulo:T2}; r.notas='Otra cosa más nueva';
  r.modsCampos.notas='2026-09-25T12:00:00.000Z'; r.mod='2026-09-25T12:00:00.000Z';
  const m=ctx.fusionar([l],[],[r],[]).discos[0];
  assert(m.titulo==='Local','el campo título respeta su timestamp aunque la ficha remota tenga mod global posterior');
}

/* 5. Etiquetas acumulativas. */
{
  const l=baseDisc(), r=clone(l);
  l.etiquetas=['A']; r.etiquetas=['B']; l.modsBase=r.modsBase=T0;
  l.modsCampos={etiquetas:T2}; r.modsCampos={etiquetas:T3}; l.mod=T2; r.mod=T3;
  const z=ctx.fusionar([l],[],[r],[]);
  eq(z.discos[0].etiquetas,['A','B'],'etiquetas se unen');
  assert(z.aLocal>0 && z.aRemoto>0,'unión de etiquetas marca ambos lados');
}

/* 6. Protecciones manuales no se pierden. */
{
  const l=baseDisc(), r=clone(l);
  l.editado={pais:true}; r.editado={numeroCatalogo:true};
  l.modsBase=r.modsBase=T0; l.modsCampos={editado:T2}; r.modsCampos={editado:T3};
  l.mod=T2; r.mod=T3;
  const m=ctx.fusionar([l],[],[r],[]).discos[0];
  assert(m.editado.pais && m.editado.numeroCatalogo,'protecciones editado se combinan');
}

/* 7. Escuchas: mismo calendario pero contador histórico diferente. */
{
  const l=baseDisc(), r=clone(l);
  l.escuchasFechas=['2026-09-20']; r.escuchasFechas=['2026-09-20'];
  l.escuchas=7; r.escuchas=1; l.ultimaEscucha=r.ultimaEscucha='2026-09-20';
  l.mod=T2; r.mod=T3;
  const m=ctx.fusionar([l],[],[r],[]).discos[0];
  assert(m.escuchas===7,'se conserva el máximo histórico de escuchas aunque no aparezcan fechas nuevas');
}

/* 8. Escuchas concurrentes en días distintos. */
{
  const l=baseDisc(), r=clone(l);
  l.escuchasFechas=['2026-09-20']; r.escuchasFechas=['2026-09-21'];
  l.escuchas=1; r.escuchas=1; l.ultimaEscucha='2026-09-20'; r.ultimaEscucha='2026-09-21';
  const m=ctx.fusionar([l],[],[r],[]).discos[0];
  eq(m.escuchasFechas,['2026-09-20','2026-09-21'],'fechas de escucha se unen');
  assert(m.escuchas===2 && m.ultimaEscucha==='2026-09-21','contador y última escucha siguen la unión');
}

/* 9. Tombstone posterior elimina; edición posterior al tombstone revive. */
{
  const d=baseDisc(); d.mod=T1;
  const a=ctx.fusionar([d],[{id:'d1',fecha:T2}],[],[]);
  assert(a.discos.length===0,'borrado posterior elimina la ficha');
  const nuevo=baseDisc(); nuevo.mod=T3;
  const b=ctx.fusionar([nuevo],[{id:'d1',fecha:T2}],[],[]);
  assert(b.discos.length===1,'edición posterior a borrado puede recuperar la ficha');
}

/* 10. Al primer cambio moderno solo se marca el campo tocado y una base común. */
{
  const d=baseDisc();
  ctx.DB={discos:[d],borrados:[]}; ctx.firmas={}; ctx.firmasCampos={};
  vm.runInContext('indexarFirmas()',ctx);
  d.titulo='Título editado'; ctx.__now=T2;
  const n=vm.runInContext('sellarCambios()',ctx);
  assert(n===1,'sellarCambios detecta una edición');
  assert(d.modsBase===T0,'primera edición conserva mod anterior como modsBase');
  eq(Object.keys(d.modsCampos),['titulo'],'solo el campo realmente editado recibe marca propia');
  assert(d.modsCampos.titulo===T2 && d.mod===T2,'marca de campo y mod global se actualizan');
}

/* 11. Metadata vacía no infla datos.json; metadata real sí sobrevive. */
{
  const d=baseDisc();
  d.modsBase=''; d.modsCampos={};
  let light=ctx.serializarDiscLigero(d);
  assert(!Object.prototype.hasOwnProperty.call(light,'modsBase') && !Object.prototype.hasOwnProperty.call(light,'modsCampos'),'metadata granular vacía se omite');
  d.modsBase=T0; d.modsCampos={titulo:T2};
  light=ctx.serializarDiscLigero(d);
  assert(light.modsBase===T0 && light.modsCampos.titulo===T2,'metadata granular no vacía se persiste');
}

/* 12. La fusión no muta los argumentos de entrada. */
{
  const l=baseDisc(), r=clone(l);
  l.modsBase=r.modsBase=T0; l.titulo='L'; r.notas='R'; l.modsCampos={titulo:T2}; r.modsCampos={notas:T3}; l.mod=T2; r.mod=T3;
  const lb=JSON.stringify(l), rb=JSON.stringify(r);
  ctx.fusionar([l],[],[r],[]);
  assert(JSON.stringify(l)===lb && JSON.stringify(r)===rb,'fusionar es pura respecto a las fichas de entrada');
}

if(process.exitCode){
  console.error('\nPruebas de sincronización FALLIDAS.');
  process.exit(process.exitCode);
}
console.log('\nPruebas de sincronización OK.');
