/* Diagnóstico puro: no normaliza, persiste ni corrige fichas. */
function diagnosticoColeccion(discos){
  var ids = new Set(discos.map(function(d){ return d.id; }));
  var exactos = new Map(), catalogos = new Map(), nucleos = new Map();
  var resultados = [];
  function texto(v){ return plain(String(v || '')).trim(); }
  function grupo(mapa, clave, id){
    if(!clave) return;
    if(!mapa.has(clave)) mapa.set(clave, []);
    mapa.get(clave).push(id);
  }
  function aviso(id, tipo){ resultados.push({id:id, tipo:tipo}); }
  discos.forEach(function(d){
    var artista = texto(d.artista), titulo = texto(d.titulo);
    if(artista && titulo){
      grupo(exactos, artista + '\u0000' + titulo + '\u0000' + texto(d.formato), d.id);
      grupo(nucleos, artista + '\u0000' + titulo.replace(/\s*[([][^)\]]*[)\]]/g, '').trim(), d.id);
    }
    if(artista && d.numeroCatalogo) grupo(catalogos, artista + '\u0000' + texto(d.numeroCatalogo), d.id);
    if(!d.portada) aviso(d.id, 'Portada ausente');
    if(!artista || !titulo || !d['año'] || !d.formato) aviso(d.id, 'Metadatos incompletos');
    if(d['año'] && (!/^\d{4}$/.test(String(d['año'])) || +d['año'] < 1877 || +d['año'] > new Date().getFullYear() + 1)) aviso(d.id, 'Año inválido');
    if(!Array.isArray(d.tracklist) || !d.tracklist.length) aviso(d.id, 'Tracklist vacío');
    else if(d.tracklist.some(function(t){ return !t || !texto(t.titulo); })) aviso(d.id, 'Pistas sin título');
    if((d.mbid && !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(d.mbid)) ||
      (d.rgid && !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(d.rgid)) ||
      (d.discogs && !/^https:\/\/(www\.)?discogs\.com\/(?:[a-z]{2}\/)?(?:release|master)\/\d+/i.test(d.discogs))) aviso(d.id, 'Identificador externo incoherente');
    if(d.enlazado && !ids.has(d.enlazado)) aviso(d.id, 'Edición enlazada ausente');
  });
  [[exactos,'Duplicado exacto'],[catalogos,'Catálogo coincidente'],[nucleos,'Posible duplicado']].forEach(function(par){
    par[0].forEach(function(grupoIds){ if(grupoIds.length > 1) grupoIds.forEach(function(id){ aviso(id, par[1]); }); });
  });
  return resultados;
}
function abrirDiagnostico(){
  var resultados = diagnosticoColeccion(DB.discos), porId = new Map(DB.discos.map(function(d){ return [d.id,d]; }));
  var s = sheet('Diagnóstico de colección', '<p role="status">' + resultados.length + ' avisos. No se ha modificado ningún dato.</p><div id="calidadResultados"></div>', '', true);
  var offset = 0;
  function pagina(){
    var caja = s.querySelector('#calidadResultados');
    var mas = caja.querySelector('[data-mas]'); if(mas) mas.remove();
    resultados.slice(offset, offset + 80).forEach(function(r){
      var d = porId.get(r.id), b = document.createElement('button');
      b.type = 'button'; b.className = 'btn calidad-aviso';
      b.textContent = r.tipo + ' · ' + (d.artista || 'Sin artista') + ' — ' + (d.titulo || 'Sin título');
      b.onclick = function(){ s.querySelector('[data-close]').click(); openDetail(r.id, null, abrirDiagnostico); };
      caja.appendChild(b);
    });
    offset += 80;
    if(offset < resultados.length){
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.dataset.mas = '1'; b.textContent = 'Ver más avisos'; b.onclick = pagina; caja.appendChild(b);
    }
  }
  pagina();
}
