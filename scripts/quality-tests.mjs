import fs from 'node:fs';
import vm from 'node:vm';

const src=fs.readFileSync('index.html','utf8');
const ok=(m)=>console.log('✓ '+m);
const fail=(m)=>{console.error('✗ '+m);process.exitCode=1;};
const assert=(c,m)=>c?ok(m):fail(m);

function slice(a,b){
  const i=src.indexOf(a), j=src.indexOf(b,i);
  if(i<0||j<0) throw new Error('No se encontró bloque '+a);
  return src.slice(i,j);
}

const ctx=vm.createContext({
  console, JSON, Date, Math, Number, String, Object, Array, RegExp,
  nombrePais:(c)=>({ES:'España',DE:'Alemania',US:'Estados Unidos'}[c]||c||''),
  codigoDePaisDiscogs:(c)=>({Spain:'ES',Germany:'DE','United States':'US'}[c]||c||''),
  hayDiscogs:()=>true
});
vm.runInContext(slice("var CAMPOS_FUERTES_EDICION","var INFO_NIVEL_EDICION"),ctx);

function disco(extra={}){
  return Object.assign({
    id:'d1', artista:'Artista', titulo:'Álbum', año:'2000', formato:'CD',
    formatoDetalle:'CD', sello:'Sello', numeroCatalogo:'CAT-1', pais:'ES',
    codigoBarras:'12345', mbid:'', discogs:'', confianza:'', tecnica:null
  },extra);
}

/* 1. Código + edición concreta + coincidencias => sólida. */
{
  const d=disco({mbid:'mb1',discogs:'https://discogs.com/release/1'});
  const mb={año:'2000',pais:'ES',sello:'Sello',numeroCatalogo:'CAT-1',formatoDetalle:'CD',codigoBarras:'12345'};
  const dg={año:'2000',pais:'ES',sello:'Sello',numeroCatalogo:'CAT-1',formatoDetalle:'CD',codigoBarras:'12345'};
  const x=ctx.diagnosticarEdicion(d,mb,dg);
  assert(x.nivel==='solida','evidencia consistente da identificación sólida');
  assert(x.camposEvidencia>=2,'se cuentan campos únicos de evidencia');
}

/* 2. País contradictorio guardado en Discogs => contradictoria. */
{
  const d=disco({discogs:'https://discogs.com/release/1',tecnica:{pais:'Germany',publicado:'2000',prensado:'CD'}});
  const x=ctx.diagnosticarEdicion(d,null,null);
  assert(x.nivel==='contradictoria','país contradictorio detectado desde ficha técnica guardada');
  assert(x.peorSeveridad==='moderada','país se clasifica como discrepancia moderada');
  assert(x.problemas.some(p=>p.includes('País')),'el diagnóstico explica el campo contradictorio');
}

/* 3. Año diferente, sin señales fuertes en contra, no convierte en contradictoria. */
{
  const d=disco({discogs:'https://discogs.com/release/1',tecnica:{pais:'Spain',publicado:'2001',prensado:'CD'}});
  const x=ctx.diagnosticarEdicion(d,null,null);
  assert(x.nivel!=='contradictoria','año informativo distinto no tumba por sí solo la identificación');
  assert(x.peorSeveridad==='informativa','año diferente queda como discrepancia informativa');
}

/* 4. Sin identificadores externos => revisar. */
{
  const d=disco({mbid:'',discogs:'',codigoBarras:'',tecnica:null});
  const x=ctx.diagnosticarEdicion(d,null,null);
  assert(x.nivel==='revisar','sin identificadores externos se marca revisar');
}

/* 5. Coincidencia inicial dudosa sin fuentes en vivo => revisar. */
{
  const d=disco({confianza:'baja',mbid:'mb1',discogs:'',codigoBarras:''});
  const x=ctx.diagnosticarEdicion(d,null,null);
  assert(x.nivel==='revisar','confianza baja sigue visible en Radar');
}

/* Lógica real de faltan + ayudantes de Fase 3. */
const c2=vm.createContext({
  console, JSON, Date, Math, Number, String, Object, Array,
  localStorage:{getItem:()=> '{}',setItem:()=>{}},
  hayDiscogs:()=>true,
  DB:{discos:[]},
  coleccion(){return this.DB.discos.filter(d=>d.lista!=='deseos');}
});
vm.runInContext(slice("function faltaEsencial","function pantallaRevision"),c2);
vm.runInContext(slice("function faltanCalculadosTexto","function radarColeccion"),c2);

function ficha(extra={}){
  return Object.assign({
    id:'x',lista:'coleccion',mbid:'m',portada:'p',tracklist:[{titulo:'T',pos:'1'}],
    año:'2000',sello:'S',genero:'Rock',appleUrl:'a',fotoDisco:'f',pais:'ES',
    extra:{},tecnica:{},revisado:'2026-09-20T12:00:00.000Z',faltan:''
  },extra);
}

/* 6. Cache faltan correcta no se señala. */
{
  c2.DB.discos=[ficha()];
  assert(c2.faltanDesactualizados().length===0,'faltan correcto no genera aviso');
}

/* 7. Cache histórica obsoleta sí se detecta sin tocar bibliografía. */
{
  c2.DB.discos=[ficha({faltan:'país'})];
  const r=c2.faltanDesactualizados();
  assert(r.length===1 && r[0].id==='x','Radar detecta faltan histórico desactualizado');
}

/* 8. Nunca revisada no se trata como cache obsoleta. */
{
  c2.DB.discos=[ficha({revisado:'',faltan:'país'})];
  assert(c2.faltanDesactualizados().length===0,'ficha nunca revisada no se confunde con cache desactualizada');
}

if(process.exitCode){
  console.error('\nPruebas de calidad FALLIDAS.');
  process.exit(process.exitCode);
}
console.log('\nPruebas de calidad OK.');
