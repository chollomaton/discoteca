/* Metadata externa y enriquecimiento. APIs globales conservadas; carga antes de bootstrap. */
/* ---------- Wikipedia en español ---------- */
var wikiCache = {};
function wikiBuscar(termino){
  if(wikiCache[termino]) return Promise.resolve(wikiCache[termino]);
  var api = 'https://es.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts|pageimages'
    + '&exintro=1&explaintext=1&piprop=thumbnail&pithumbsize=300&redirects=1&generator=search&gsrlimit=1&gsrsearch='
    + encodeURIComponent(termino);
  return fetch(api).then(function(r){ return r.json(); }).then(function(j){
    var pages = j && j.query && j.query.pages;
    if(!pages) throw new Error('sin resultados');
    var k = Object.keys(pages)[0], p = pages[k];
    if(!p || !p.extract) throw new Error('sin extracto');
    var res = {
      titulo: p.title,
      extracto: p.extract,
      img: p.thumbnail ? p.thumbnail.source : '',
      url: 'https://es.wikipedia.org/wiki/' + encodeURIComponent(p.title.replace(/ /g, '_'))
    };
    wikiCache[termino] = res;
    return res;
  });
}
function verWikipedia(d, sobreAlbum){
  var termino = sobreAlbum ? (d.titulo + ' ' + d.artista + ' álbum') : d.artista;
  var s = sheet(sobreAlbum ? d.titulo : d.artista,
    '<div class="note busy" id="wnote">Buscando en Wikipedia en español…</div><div id="wbody"></div>',
    '<button type="button" class="btn" id="wOtro">' + (sobreAlbum ? 'Ver el artista' : 'Ver el álbum') + '</button>'
    + '<a class="btn pri" id="wLink" target="_blank" rel="noopener" href="#">Abrir en Wikipedia</a>');
  var $ = function(q){ return s.querySelector(q); };
  $('#wOtro').onclick = function(){ s.remove(); verWikipedia(d, !sobreAlbum); };
  wikiBuscar(termino).then(function(w){
    $('#wnote').style.display = 'none';
    $('#wLink').href = w.url;
    var parrafos = w.extracto.split('\n').filter(function(p){ return p.trim().length > 30; }).slice(0, 3);
    $('#wbody').innerHTML =
      '<div class="wikihd">' + (w.img ? '<img src="' + esc(w.img) + '" alt="">' : '')
      + '<div><div class="n">' + esc(w.titulo) + '</div><div class="d">Wikipedia en español</div></div></div>'
      + '<div class="wiki">' + parrafos.map(function(p){ return '<p>' + esc(p) + '</p>'; }).join('')
      + '<div class="fuente">Extracto de <a href="' + esc(w.url) + '" target="_blank" rel="noopener">'
      + esc(w.titulo) + '</a> en Wikipedia, bajo licencia CC BY-SA.</div></div>';
  }).catch(function(){
    if(!sobreAlbum && hayLastfm()){
      $('#wnote').textContent = 'Sin artículo en español. Probando con Last.fm…';
      lastfmBio(d.artista).then(function(w){
        $('#wnote').style.display = 'none';
        $('#wLink').href = w.url || ('https://es.wikipedia.org/w/index.php?search=' + encodeURIComponent(termino));
        var parrafos = w.extracto.split('\n').filter(function(p){ return p.trim().length > 20; }).slice(0, 3);
        $('#wbody').innerHTML =
          '<div class="wikihd">' + (w.img ? '<img src="' + esc(w.img) + '" alt="">' : '')
          + '<div><div class="n">' + esc(w.titulo) + '</div><div class="d">Biografía de la comunidad de Last.fm</div></div></div>'
          + '<div class="wiki">' + parrafos.map(function(p){ return '<p>' + esc(p) + '</p>'; }).join('')
          + '<div class="fuente">De <a href="' + esc(w.url) + '" target="_blank" rel="noopener">Last.fm</a>, '
          + 'escrita por su comunidad de usuarios; puede estar en inglés.</div></div>';
      }).catch(function(){
        $('#wnote').className = 'note err';
        $('#wnote').textContent = 'No hay artículo en español ni biografía en Last.fm sobre este artista.';
        $('#wLink').href = 'https://es.wikipedia.org/w/index.php?search=' + encodeURIComponent(termino);
      });
      return;
    }
    $('#wnote').className = 'note err';
    $('#wnote').textContent = 'No hay artículo en español sobre ' + (sobreAlbum ? 'este disco' : 'este artista') + '.';
    $('#wLink').href = 'https://es.wikipedia.org/w/index.php?search=' + encodeURIComponent(termino);
  });
}

/* ---------- datos ampliados de MusicBrainz ---------- */
var ROLES = {
  producer:'Producción', engineer:'Ingeniería', 'mix':'Mezcla', mastering:'Masterización',
  recording:'Grabación', 'recorded at':'Grabado en', 'mixed at':'Mezclado en', 'mastered at':'Masterizado en',
  'design/illustration':'Diseño', photography:'Fotografía', 'art direction':'Dirección artística',
  'graphic design':'Diseño gráfico', arranger:'Arreglos', composer:'Composición', lyricist:'Letra',
  'phonographic copyright':'Copyright fonográfico', 'copyright holder':'Copyright'
};
var PACKAGING = {
  'Jewel Case':'Caja jewel', 'Slim Jewel Case':'Caja jewel fina', 'Digipak':'Digipak', 'Cardboard/Paper Sleeve':'Funda de cartón',
  'Gatefold Cover':'Portada desplegable', 'Keep Case':'Caja alta', 'Box':'Caja', 'Super Jewel Box':'Super jewel box',
  'Snap Case':'Snap case', 'Fatbox':'Caja doble', 'Other':'Otro', 'None':'Sin estuche'
};
var TIPOS = {Album:'Álbum', Single:'Single', EP:'EP', Broadcast:'Emisión', Other:'Otro',
  Compilation:'Recopilatorio', Soundtrack:'Banda sonora', Live:'En directo', Remix:'Remezclas',
  'DJ-mix':'Sesión DJ', Demo:'Maqueta', Interview:'Entrevista', Audiobook:'Audiolibro', Spokenword:'Hablado'};
function traduceTipo(t){
  return String(t || '').split(/,\s*/).map(function(x){ return TIPOS[x] || x; }).filter(Boolean).join(' · ');
}
var IDIOMAS = {eng:'Inglés', spa:'Español', fra:'Francés', deu:'Alemán', ita:'Italiano', por:'Portugués',
  jpn:'Japonés', cat:'Catalán', eus:'Euskera', glg:'Gallego', zxx:'Sin letra', mul:'Varios'};

function duracionTotal(d){
  var seg = 0, n = 0;
  (d.tracklist || []).forEach(function(t){
    var m = String(t.duracion || '').match(/^(\d+):(\d{2})$/);
    if(m){ seg += (+m[1]) * 60 + (+m[2]); n++; }
  });
  if(!n) return '';
  var h = Math.floor(seg / 3600), mi = Math.round(seg % 3600 / 60);
  return h ? h + ' h ' + mi + ' min' : mi + ' min';
}
function cargarExtra(d){
  if(!d.mbid) return Promise.reject(new Error('sin mbid'));
  return mbGet('release/' + d.mbid + '?inc=artist-rels+label-rels+release-groups+genres+ratings+recordings')
    .then(function(r){
      var rg = r['release-group'] || {};
      var creditos = {};
      (r.relations || []).forEach(function(rel){
        var tipo = ROLES[rel.type] || null;
        if(!tipo) return;
        var quien = (rel.artist && rel.artist.name) || (rel.label && rel.label.name) || (rel.place && rel.place.name);
        if(!quien) return;
        creditos[tipo] = creditos[tipo] ? (creditos[tipo].indexOf(quien) < 0 ? creditos[tipo] + ', ' + quien : creditos[tipo]) : quien;
      });
      var tags = ((r.genres || []).concat(rg.genres || []))
        .sort(function(a, b){ return (b.count || 0) - (a.count || 0); })
        .map(function(g){ return g.name; }).filter(function(v, i, a){ return a.indexOf(v) === i; }).slice(0, 6);
      var ex = {
        fecha: r.date || '',
        primera: rg['first-release-date'] || '',
        packaging: r.packaging || '',
        idioma: (r['text-representation'] && r['text-representation'].language) || '',
        estado: r.status || '',
        barcode: r.barcode || '',
        discos: (r.media || []).length,
        tipo: rg['primary-type'] || '',
        secundarios: (rg['secondary-types'] || []).join(', '),
        nota: (rg.rating && rg.rating.value) || 0,
        votos: (rg.rating && rg.rating['votes-count']) || 0,
        tags: tags,
        creditos: creditos,
        cargado: nowISO()
      };
      d.extra = ex;
      if(!d.codigoBarras && ex.barcode) d.codigoBarras = ex.barcode;
      persist(true);
      return ex;
    });
}
function pintaExtra(caja, d){
  var ex = d.extra;
  if(!caja) return;
  if(!ex){ caja.innerHTML = ''; return; }
  var filas = [];
  var f = function(k, v, credito){
    if(!v) return;
    var val = credito
      ? String(v).split(', ').map(function(q){
          return '<button type="button" class="credl" data-rol="' + esc(k) + '" data-quien="' + esc(q) + '">' + esc(q) + '</button>';
        }).join(', ')
      : esc(v);
    filas.push('<div class="cred"><span class="k">' + k + '</span><span class="v">' + val + '</span></div>');
  };
  if(ex.fecha && ex.fecha.length > 4){
    try{ f('Publicado', new Date(ex.fecha + 'T12:00:00').toLocaleDateString('es-ES', {day:'numeric', month:'long', year:'numeric'})); }
    catch(e){ f('Publicado', ex.fecha); }
  }
  if(ex.primera && ex.primera.slice(0, 4) !== String(d['año'])) f('Álbum original', ex.primera.slice(0, 4));
  f('Duración', duracionTotal(d));
  if(ex.discos > 1) f('Discos', ex.discos);
  f('Estuche', PACKAGING[ex.packaging] || ex.packaging);
  f('Idioma', IDIOMAS[ex.idioma] || '');
  f('Tipo', traduceTipo([ex.tipo, ex.secundarios].filter(Boolean).join(', ')));
  if(ex.nota) f('Nota en MusicBrainz', ex.nota.toFixed(1) + ' / 5' + (ex.votos ? ' (' + ex.votos + ' votos)' : ''));
  if(ex.barcode) f('Código de barras', ex.barcode);
  Object.keys(ex.creditos).forEach(function(k){ f(k, ex.creditos[k], true); });
  var etiquetas = (ex.tags || []).length
    ? '<div class="rowb" style="margin:0 0 18px">' + ex.tags.map(function(t){
        return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>'
    : '';
  caja.innerHTML = (filas.length ? '<div class="tl-hd"><h4>Detalles y créditos</h4></div><div class="creds">' + filas.join('') + '</div>' : '')
    + etiquetas;
  caja.querySelectorAll('.credl').forEach(function(b){
    b.onclick = function(){ verCredito(b.dataset.rol, b.dataset.quien); };
  });
}

/* ============================================================
   16. FICHA TÉCNICA DE DISCOGS, COMPARTIR Y MENÚ RÁPIDO
   ============================================================ */
var COMPANIAS = {
  'Recorded At':'Grabado en', 'Mixed At':'Mezclado en', 'Mastered At':'Masterizado en',
  'Pressed By':'Prensado por', 'Manufactured By':'Fabricado por', 'Distributed By':'Distribuido por',
  'Made By':'Fabricado por', 'Printed By':'Impreso por', 'Published By':'Editado por',
  'Record Company':'Discográfica', 'Phonographic Copyright (p)':'Copyright fonográfico',
  'Copyright (c)':'Copyright', 'Glass Mastered At':'Masterizado en', 'Lacquer Cut At':'Corte de laca'
};
var CREDITOS_DG = {
  'Producer':'Producción', 'Co-producer':'Coproducción', 'Executive-Producer':'Producción ejecutiva',
  'Engineer':'Ingeniería', 'Mixed By':'Mezcla', 'Mastered By':'Masterización', 'Recorded By':'Grabación',
  'Written-By':'Composición', 'Music By':'Música', 'Lyrics By':'Letra', 'Arranged By':'Arreglos',
  'Design':'Diseño', 'Artwork':'Ilustración', 'Photography By':'Fotografía', 'Cover':'Portada'
};
function cargarDiscogs(d){
  if(!hayDiscogs()) return Promise.reject(new Error('sin token'));
  var m = String(d.discogs || '').match(/release\/(\d+)/);
  var busca = m
    ? dgGet('releases/' + m[1])
    : dgGet('database/search?type=release&per_page=3&q='
        + encodeURIComponent((d.artista || '') + ' ' + (d.titulo || ''))
        + (d.numeroCatalogo ? '&catno=' + encodeURIComponent(d.numeroCatalogo) : ''))
      .then(function(j){
        var r = (j.results || [])[0];
        if(!r) throw new Error('no encontrado');
        return dgGet('releases/' + r.id);
      });
  return busca.then(function(r){
    var comp = {}, cred = {};
    (r.companies || []).forEach(function(c){
      var k = COMPANIAS[c.entity_type_name] || null;
      if(!k) return;
      comp[k] = comp[k] ? (comp[k].indexOf(c.name) < 0 ? comp[k] + ', ' + limpiaNombre(c.name) : comp[k]) : limpiaNombre(c.name);
    });
    (r.extraartists || []).forEach(function(a){
      String(a.role || '').split(/,\s*/).forEach(function(rol){
        var k = CREDITOS_DG[rol.replace(/\s*\[.*$/, '').trim()];
        if(!k) return;
        cred[k] = cred[k] ? (cred[k].indexOf(a.name) < 0 ? cred[k] + ', ' + limpiaNombre(a.name) : cred[k]) : limpiaNombre(a.name);
      });
    });
    var ids = {};
    (r.identifiers || []).forEach(function(i){
      var t = String(i.type || '');
      if(/barcode/i.test(t)) ids['Código de barras'] = i.value;
      else if(/depósito legal|deposito legal|legal deposit/i.test(t + ' ' + (i.description || ''))) ids['Depósito legal'] = i.value;
      else if(/rights society/i.test(t)) ids['Entidad de gestión'] = i.value;
      else if(/matrix/i.test(t) && !ids['Matriz']) ids['Matriz'] = i.value;
    });
    var fmt = (r.formats || [])[0] || {};
    var tec = {
      prensado: [fmt.name, fmt.qty > 1 ? fmt.qty + ' unidades' : '', (fmt.descriptions || []).join(', '), fmt.text]
        .filter(Boolean).join(' · '),
      pais: r.country || '', publicado: r.released || String(r.year || ''),
      estilos: (r.styles || []).join(', '),
      versiones: 0, url: r.uri || '',
      valor: (r.lowest_price != null ? r.lowest_price : null),
      nota: (r.community && r.community.rating && r.community.rating.average) || 0,
      votos: (r.community && r.community.rating && r.community.rating.count) || 0,
      tienen: (r.community && r.community.have) || 0,
      quieren: (r.community && r.community.want) || 0,
      companias: comp, creditos: cred, ids: ids, cargado: nowISO()
    };
    /* posiciones de corte (A1, B2…), muy útiles en vinilo */
    var pistas = (r.tracklist || []).filter(function(t){ return !t.type_ || t.type_ === 'track'; });
    if(pistas.length && d.tracklist.length){
      var cambio = false;
      d.tracklist.forEach(function(t, i){
        var p = pistas[i];
        if(p && p.position && plain(p.title).slice(0, 8) === plain(t.titulo).slice(0, 8) && !t.pos){
          t.pos = p.position;
          var mm = String(p.position).match(/^(\d+)-/);
          if(mm) t.disco = +mm[1];
          cambio = true;
        }
      });
      if(cambio) d.tracklist = d.tracklist.slice();
    }
    if(!d.discogs && tec.url) d.discogs = tec.url;
    /* Si no tenías país guardado, se rellena con el de Discogs. Si ya tenías
       uno y no coincide, NO se sustituye en silencio -eso perdería el aviso
       de discrepancia sin que nadie lo revisara-: se deja tal cual y es
       consistenciaIdentificadores() quien avisa de la diferencia en la ficha. */
    if(tec.pais && !d.pais){
      var codigo = codigoDePaisDiscogs(tec.pais);
      if(codigo) d.pais = codigo;
    }
    d.tecnica = tec;
    persist(true);
    return tec;
  });
}
/* Discogs escribe el país en inglés ("Europe", "UK", "Germany"…), no con
   el código de dos letras que usa el resto de la app; aquí se traduce. */
var PAISES_DISCOGS = {
  'Europe':'XE', 'UK':'GB', 'United Kingdom':'GB', 'US':'US', 'USA':'US', 'US & Canada':'US',
  'Germany':'DE', 'France':'FR', 'Italy':'IT', 'Netherlands':'NL', 'Spain':'ES', 'Canada':'CA',
  'Australia':'AU', 'Japan':'JP', 'Brazil':'BR', 'Argentina':'AR', 'Mexico':'MX',
  'South Africa':'ZA', 'Sweden':'SE', 'Norway':'NO', 'Denmark':'DK', 'Finland':'FI',
  'Ireland':'IE', 'Portugal':'PT', 'Belgium':'BE', 'Switzerland':'CH', 'Austria':'AT',
  'Greece':'GR', 'Poland':'PL', 'Russia':'RU', 'Cuba':'CU', 'Chile':'CL', 'Colombia':'CO',
  'New Zealand':'NZ', 'India':'IN', 'South Korea':'KR', 'China':'CN', 'Israel':'IL',
  'Turkey':'TR', 'Jamaica':'JM', 'Worldwide':'XW'
};
function codigoDePaisDiscogs(nombre){ return PAISES_DISCOGS[String(nombre || '').trim()] || ''; }
/* Compara el país y el año que tienes tú con lo que dice Discogs de esa
   misma edición (lo último que se consultó, guardado en tecnica). No
   decide cuál es el correcto -eso lo sabes tú, que tienes el disco en la
   mano-, solo avisa cuando no coinciden. Reutiliza diagnosticarEdicion(),
   la misma lógica que usan el Detective y el Radar: una sola fuente de
   verdad para comparar identificadores, no cuatro implementaciones. */
function consistenciaIdentificadores(d){
  if(!d.tecnica || !d.tecnica.pais) return [];
  return diagnosticarEdicion(d, null, null).detalles
    .filter(function(x){ return (x.campo === 'País' || x.campo === 'Año') && x.fuenteB.indexOf('Discogs') === 0; })
    .map(function(x){ return {campo: x.campo, tuyo: x.valorA, discogs: x.valorB}; });
}
/* La fotografía del disco físico (fotoDisco) queda ligada al MusicBrainz
   Release del que se sacó -normalmente porque su propia URL de Cover Art
   Archive lleva ese UUID-. Si luego se elige otra edición, el mbid
   cambia pero la foto no se vuelve a pedir sola, así que puede quedar
   representando un soporte que ya no es el enlazado. Se detecta de dos
   formas: comparando el UUID que lleva la propia URL (funciona también
   con fotos guardadas antes de que existiera fotoDiscoMbid), o el campo
   fotoDiscoMbid que se anota desde ahora en cada foto nueva. */
function uuidDeCoverUrl(url){
  var m = String(url || '').match(/coverartarchive\.org\/release\/([0-9a-f-]{36})/i);
  return m ? m[1].toLowerCase() : '';
}
function fotoDiscoDesactualizada(d){
  if(!d.fotoDisco || !d.mbid) return false;
  if(d.fotoDiscoMbid && d.fotoDiscoMbid !== d.mbid) return true;
  var uuid = uuidDeCoverUrl(d.fotoDisco);
  return !!(uuid && uuid !== String(d.mbid).toLowerCase());
}
function pintaConsistencia(caja, d){
  if(!caja) return;
  var aviso = consistenciaIdentificadores(d);
  var fotoVieja = fotoDiscoDesactualizada(d);
  if(!aviso.length && !fotoVieja){ caja.innerHTML = ''; return; }
  var partes = [];
  if(aviso.length) partes.push(aviso.map(function(x){ return x.campo + ': tú tienes ' + esc(x.tuyo) + ', Discogs dice ' + esc(x.discogs); }).join('. ')
    + '. Puede que esta no sea exactamente tu edición, o que uno de los dos esté equivocado. Tú, con el disco en la mano, lo sabes mejor.');
  if(fotoVieja) partes.push('La fotografía del soporte pertenece a otro MusicBrainz Release: se guardó antes de elegir esta edición. '
    + 'Puede que ya no corresponda exactamente a este disco.');
  caja.innerHTML = '<div class="warnb" style="margin-bottom:14px">' + I.warn + '<span>' + partes.join('<br><br>') + '</span></div>';
}
function pintaTecnica(caja, d){
  if(!caja) return;
  var t = d.tecnica;
  if(!t){ caja.innerHTML = ''; return; }
  t.ids = t.ids || {}; t.companias = t.companias || {}; t.creditos = t.creditos || {};
  var filas = [];
  var f = function(k, v, credito){
    if(!v) return;
    var val = credito
      ? String(v).split(', ').map(function(q){
          return '<button type="button" class="credl" data-rol="' + esc(k) + '" data-quien="' + esc(q) + '">' + esc(q) + '</button>';
        }).join(', ')
      : esc(v);
    filas.push('<div class="cred"><span class="k">' + k + '</span><span class="v">' + val + '</span></div>');
  };
  f('Prensado', t.prensado);
  f('Estilos', t.estilos);
  Object.keys(t.ids).forEach(function(k){ f(k, t.ids[k]); });
  Object.keys(t.companias).forEach(function(k){ f(k, t.companias[k], true); });
  Object.keys(t.creditos).forEach(function(k){ f(k, t.creditos[k], true); });
  if(t.nota) f('Nota en Discogs', t.nota.toFixed(2) + ' / 5 (' + t.votos + ' votos)');
  if(t.tienen) f('En Discogs', t.tienen + ' lo tienen · ' + t.quieren + ' lo buscan');
  if(t.precio && t.precio.tipo === 'suerte'){
    var s2 = t.precio.moneda === 'EUR' ? '€' : (t.precio.moneda || 'EUR');
    var niveles = [
      t.precio.bajo != null ? t.precio.bajo.toFixed(0) + ' ' + s2 : null,
      t.precio.media != null ? t.precio.media.toFixed(0) + ' ' + s2 : null,
      t.precio.alto != null ? t.precio.alto.toFixed(0) + ' ' + s2 : null
    ].filter(Boolean);
    f('Precio bajo / medio / alto', niveles.join(' · '));
  }else if(t.valor != null && t.valor > 0){
    f('Desde', t.valor.toFixed(2) + ' €');
  }
  if(!filas.length){ caja.innerHTML = ''; return; }
  caja.innerHTML = '<details class="plega"><summary>Ficha técnica'
    + '<svg class="ic ch" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></summary>'
    + '<div class="cuerpo">' + filas.join('') + '</div></details>';
  caja.querySelectorAll('.credl').forEach(function(b){
    b.onclick = function(){ verCredito(b.dataset.rol, b.dataset.quien); };
  });
}

/* ============================================================
   25. REVISAR Y ACTUALIZAR TODO
   Solo rellena lo que está vacío. Nunca pisa nada escrito.
   ============================================================ */
var K_REV = 'discoteca.revision';
function estadoRevision(){
  try{ return JSON.parse(localStorage.getItem(K_REV) || '{}'); }catch(e){ return {}; }
}
function guardarRevision(o){
  try{ localStorage.setItem(K_REV, JSON.stringify(o)); }catch(e){}
}
var K_REVISADOS = 'discoteca.revisados';
function revisados(){
  try{ return JSON.parse(localStorage.getItem(K_REVISADOS) || '{}'); }catch(e){ return {}; }
}
function guardarRevisados(o){
  try{ localStorage.setItem(K_REVISADOS, JSON.stringify(o)); }catch(e){}
}
function marcarRevisado(d, faltan){
  var r = revisados();
  r[d.id] = {f: hoyISO(), x: faltan.join(',')};
  guardarRevisados(r);
}
/* Lo esencial es lo que hace que una ficha esté incompleta de verdad.
   Lo demás se intenta, pero si no existe no deja el disco pendiente para siempre. */
function faltaEsencial(d){
  var f = [];
  if(!d.mbid) f.push('identificador');
  if(!d.portada) f.push('portada');
  if(!d.tracklist.length) f.push('tracklist');
  if(!d['año']) f.push('año');
  if(!d.sello) f.push('sello');
  if(!d.genero) f.push('género');
  return f;
}
function faltaOpcional(d){
  var f = [];
  if(d.tracklist.length && !d.tracklist.some(function(t){ return t.pos || (t.disco || 1) > 1; })) f.push('caras');
  if(!d.appleUrl) f.push('Apple Music');
  if(!d.fotoDisco) f.push('foto del disco');
  if(!d.pais) f.push('país');
  if(!d.extra) f.push('créditos');
  if(hayDiscogs() && !d.tecnica) f.push('ficha técnica');
  return f;
}
/* Única función que decide «qué le falta» a una ficha: la usan por igual
   "Revisar todo", el guardado manual del formulario y cualquier pantalla que
   necesite saberlo. d.faltan es solo la última foto guardada de esto -nunca
   una segunda fuente independiente-, así que siempre se recalcula con esta
   misma función, jamás con una lista de comprobaciones propia. */
function calcularFaltan(d){ return faltaEsencial(d).concat(faltaOpcional(d)); }
/* Refresca d.faltan tras cualquier enriquecimiento (Completar, Discogs,
   MusicBrainz, elegir edición, escáner, reparar, importar…), pero solo si la
   ficha YA ha pasado por una revisión -igual que al guardar el formulario a
   mano-: una ficha que nunca ha pasado por "Revisar todo" sigue sin «faltan»
   a propósito (no evaluada todavía es distinto de completa).
   OJO: "!d.faltan" NO sirve para distinguir esos dos casos, porque una ficha
   revisada y completa tiene exactamente faltan:"" -mismo valor falsy que una
   ficha nunca evaluada-. La señal correcta es si hay fecha de revisión
   (fechaRevision, que ya mira tanto el registro de revisiones como
   d.revisado): eso sí distingue "nunca evaluada" de "evaluada y completa". */
function refrescarFaltan(d){
  if(!d || !fechaRevision(d)) return;
  var f = calcularFaltan(d);
  d.faltan = f.length ? f.join(', ') : '';
}
/* Pendiente = le falta algo esencial, o nunca se ha revisado.
   Lo opcional solo se reintenta pasados 45 días. */
function fechaRevision(d){
  var r = revisados()[d.id];
  return (r && r.f) || d.revisado || '';
}
function estaPendiente(d){
  if(!fechaRevision(d)) return true;
  return (faltaEsencial(d).length || faltaOpcional(d).length) && tocaReintentar(d);
}
function tocaReintentar(d){
  var f = fechaRevision(d);
  if(!f) return true;
  return (Date.now() - new Date(f + (f.length === 10 ? 'T12:00:00' : '')).getTime()) > 45 * 86400000;
}

function pantallaRevision(){
  var ds = DB.discos.slice();
  var nuevos = ds.filter(function(d){ return !fechaRevision(d); });
  var conFalta = ds.filter(function(d){ return fechaRevision(d) && faltaEsencial(d).length; });
  var reintentos = ds.filter(function(d){
    return fechaRevision(d) && (faltaEsencial(d).length || faltaOpcional(d).length) && tocaReintentar(d);
  });
  var pendientes = nuevos.concat(reintentos);
  var esperando = conFalta.filter(function(d){ return !tocaReintentar(d); }).length;
  var est = estadoRevision();
  var body =
    '<div class="warnb info">' + I.info + '<span>Recorre tus ' + ds.length + ' discos y rellena '
    + '<b>solo lo que esté vacío</b>: identificadores, tracklist con sus caras, sello, catálogo, país, '
    + 'créditos, enlace de Apple Music y foto del disco. '
    + '<b>No toca nada de lo que hayas escrito tú</b>, ni tus estrellas, escuchas, etiquetas, notas o precios.</span></div>'
    + '<div class="kpis" style="margin-bottom:16px">'
      + '<div class="kpi"><div class="ico" style="background:color-mix(in srgb,var(--blue) 15%,transparent);color:var(--blue)">'
        + I.db + '</div><div><div class="lbl">Sin revisar nunca</div><div class="val">' + nuevos.length + '</div></div></div>'
      + '<div class="kpi' + (conFalta.length ? ' click' : '') + '" id="verFaltan">'
        + '<div class="ico" style="background:color-mix(in srgb,var(--orange) 15%,transparent);color:var(--orange)">'
        + I.warn + '</div><div><div class="lbl">Les falta lo esencial</div><div class="val">' + conFalta.length
        + (conFalta.length ? '<small> ver</small>' : '') + '</div></div></div>'
    + '</div>'
    + '<p style="font-size:13.5px;color:var(--txt2);line-height:1.5;margin:0 0 6px">'
    + (esperando ? '<b style="color:var(--txt)">' + esperando + '</b> discos ya revisados siguen sin '
        + 'datos en ninguna base; se reintentan solos en 45 días. ' : '')
    + (!pendientes.length ? '<b style="color:var(--green)">Todo revisado.</b> No hay nada pendiente hoy. ' : '')
    + (pendientes.length ? 'Esta pasada son <b style="color:var(--txt)">' + pendientes.length + ' discos</b>, unos '
        + Math.max(1, Math.round(pendientes.length * 2 / 60))
        + ' minutos. Puedes pararla y continuar donde iba.' : '') + '</p>'
    + (est.pos ? '<div class="warnb">' + I.clock + '<span>Hay una revisión a medias: iba por el disco '
        + est.pos + ' de ' + (est.total || ds.length) + '.</span></div>' : '')
    + '<div id="revProg"></div>';
  var pie = '<button type="button" class="btn" data-rx>Cerrar</button>'
    + '<div class="rowb">'
    + (nuevos.length && pendientes.length > nuevos.length ? '<button type="button" class="btn" id="revSoloNuevos">Solo los ' + nuevos.length + ' nuevos</button>' : '')
    + (est.pos ? '<button type="button" class="btn" id="revCero">Empezar de cero</button>' : '')
    + (pendientes.length
        ? '<button type="button" class="btn pri" id="revGo">' + (est.pos ? 'Continuar' : 'Revisar los ' + pendientes.length) + '</button>'
        : '<button type="button" class="btn" id="revGo">Repasar los ' + ds.length + ' de nuevo</button>') + '</div>';
  var s = sheet('Revisar y actualizar todo', body, pie);
  s.querySelector('[data-rx]').onclick = function(){ cancelBulk = true; s.remove(); };
  var vf = s.querySelector('#verFaltan');
  if(vf && conFalta.length) vf.onclick = function(){ listaPendientes(conFalta); };
  if(s.querySelector('#revCero')) s.querySelector('#revCero').onclick = function(){
    guardarRevision({});
    s.remove();
    pantallaRevision();
  };
  var arrancar = function(lista){
    s.querySelector('.sheet-ft').innerHTML = '<span></span><button type="button" class="btn destr" id="revStop">Parar</button>';
    s.querySelector('#revStop').onclick = function(){ cancelBulk = true; };
    revisarTodo(s, lista);
  };
  s.querySelector('#revGo').onclick = function(){ arrancar(pendientes.length ? pendientes : ds); };
  if(s.querySelector('#revSoloNuevos')) s.querySelector('#revSoloNuevos').onclick = function(){
    guardarRevision({});
    arrancar(nuevos);
  };
}

async function revisarTodo(s, lista){
  cancelBulk = false;
  var est = estadoRevision();
  var desde = est.pos || 0;
  var caja = s.querySelector('#revProg');
  var res = est.res || {ident:0, tracks:0, caras:0, apple:0, foto:0, datos:0, creditos:0, tecnica:0, fallos:0};
  var fallos = est.fallos || [];

  for(var i = desde; i < lista.length; i++){
    if(cancelBulk) break;
    var d = lista[i];
    var antes = JSON.stringify([d.mbid, d.appleUrl, d.fotoDisco, d.sello, d.tracklist.length, !!d.extra, !!d.tecnica]);
    caja.innerHTML = '<div class="revbar"><div class="revt">' + esc(d.artista) + ' — ' + esc(d.titulo) + '</div>'
      + '<div class="bar" style="width:100%"><div style="width:' + Math.round(i / lista.length * 100) + '%"></div></div>'
      + '<div class="revs">' + (i + 1) + ' de ' + lista.length + '</div></div>'
      + informeHtml(res);
    try{
      await revisarDisco(d, res);
    }catch(e){ res.fallos++; fallos.push({t:d.titulo, a:d.artista, motivo:String(e.message || e)}); }
    var falta = calcularFaltan(d);
    d.revisado = nowISO();
    d.faltan = falta.length ? falta.join(', ') : '';
    marcarRevisado(d, falta);      /* en el dispositivo: la sincronía no puede pisarlo */
    persist(true);
    guardarRevision({pos:i + 1, total:lista.length, res:res, fallos:fallos.slice(-80)});
  }
  var terminado = !cancelBulk;
  if(terminado) guardarRevision({res:res, fallos:fallos.slice(-80), fin:nowISO()});
  persist();
  caja.innerHTML = '<div class="revfin">' + (terminado ? I.check : I.clock)
    + '<div><div class="revt">' + (terminado ? 'Revisión terminada' : 'Revisión pausada') + '</div>'
    + '<div class="revs">' + (terminado ? 'Se han repasado ' + lista.length + ' discos'
        : 'Puedes continuar cuando quieras') + '</div></div></div>'
    + informeHtml(res)
    + resumenImposibles()
    + (fallos.length ? '<div class="tl-hd" style="margin-top:18px"><h4>No se pudo completar</h4>'
        + '<span class="n"> · ' + fallos.length + '</span></div><div class="tl">'
        + fallos.slice(-14).map(function(f){
            return '<div class="trk"><span class="nm">' + esc(f.t) + '<span style="color:var(--txt3)"> · '
              + esc(f.a) + '</span></span><span class="dur">' + esc(f.motivo) + '</span></div>';
          }).join('') + '</div>' : '');
  s.querySelector('.sheet-ft').innerHTML = '<span></span><button type="button" class="btn pri" data-rc>Cerrar</button>';
  s.querySelector('[data-rc]').onclick = function(){ s.remove(); renderAll(); };
}
/* La lista concreta de discos a los que les falta algo, y qué les falta */
function listaPendientes(lista){
  var s = sheet('Discos con algo pendiente',
    '<p style="font-size:14px;color:var(--txt2);line-height:1.5;margin:0 0 14px">'
    + 'Los que <b style="color:var(--txt)">no están en ninguna base</b> no tienen arreglo automático. '
    + 'Los que <b style="color:var(--txt)">no se encontraron</b> se resuelven pegando su enlace de MusicBrainz '
    + 'en la ficha, o eligiendo la edición correcta.</p>'
    + '<div class="tl">' + lista.map(function(d){
        var esencial = faltaEsencial(d);
        var sinId = esencial.indexOf('identificador') >= 0;
        return '<div class="trk pend" data-disco="' + d.id + '" style="cursor:pointer">'
          + '<span class="pmark ' + (sinId ? 'no' : 'si') + '">' + (sinId ? I.search : I.warn) + '</span>'
          + '<span class="nm">' + esc(d.titulo) + '<span style="color:var(--txt3)"> · ' + esc(d.artista) + '</span>'
          + '<span class="pfalta">' + esc(esencial.join(', ')) + '</span></span>'
          + '<span class="dur">' + (sinId ? 'no encontrado' : 'sin datos') + '</span></div>';
      }).join('') + '</div>', null, true);
  s.querySelectorAll('[data-disco]').forEach(function(el){
    el.onclick = function(){ s.remove(); openDetail(el.dataset.disco); };
  });
}

/* Qué no existe en ninguna base de datos, para no volver a intentarlo en balde */
function resumenImposibles(){
  var ds = DB.discos, m = {};
  ds.forEach(function(d){
    if(!fechaRevision(d)) return;
    faltaOpcional(d).forEach(function(k){ m[k] = (m[k] || 0) + 1; });
    faltaEsencial(d).forEach(function(k){ m[k] = (m[k] || 0) + 1; });
  });
  var ks = Object.keys(m);
  if(!ks.length) return '';
  return '<div class="tl-hd" style="margin-top:18px"><h4>Lo que no está en ninguna base</h4></div>'
    + '<div class="creds">' + ks.sort(function(a, b){ return m[b] - m[a]; }).map(function(k){
        return '<div class="cred"><span class="k">Sin ' + esc(k) + '</span><span class="v">'
          + m[k] + ' de ' + ds.length + '</span></div>';
      }).join('')
    + '<div class="cred"><span class="k" style="color:var(--txt3)">Se reintentan en 45 días</span><span class="v"></span></div>'
    + '</div>';
}
function informeHtml(r){
  var filas = [
    ['Identificadores encontrados', r.ident], ['Tracklists traídos', r.tracks],
    ['Caras y unidades', r.caras], ['Enlaces de Apple Music', r.apple],
    ['Fotos del disco', r.foto], ['Sello, país y catálogo', r.datos],
    ['Créditos', r.creditos], ['Fichas técnicas', r.tecnica]
  ].filter(function(x){ return x[1]; });
  if(!filas.length) return '';
  return '<div class="creds" style="margin-top:16px">' + filas.map(function(x){
    return '<div class="cred"><span class="k">' + x[0] + '</span><span class="v">+' + x[1] + '</span></div>';
  }).join('') + '</div>';
}
async function revisarDisco(d, res){
  /* 1. identificador de MusicBrainz */
  if(!d.mbid && (d.titulo || d.artista)){
    var rel = await mbBuscarReleases(d.titulo, d.artista, d.formato, 8).catch(function(){ return []; });
    if(rel.length){
      d.mbid = rel[0].id;
      res.ident++;
    }
  }
  /* 2. detalle: tracklist con caras, sello, catálogo, país */
  if(d.mbid){
    var mb = await mbDetalle(d.mbid).catch(function(){ return null; });
    if(mb){
      if(!d.rgid && mb.rgId) d.rgid = mb.rgId;
      var tocado = false;
      ['sello', 'numeroCatalogo', 'pais', 'formatoDetalle', 'codigoBarras'].forEach(function(f){
        if(!d[f] && !protegido(d, f) && mb[f]){ d[f] = mb[f]; tocado = true; }
      });
      if(!d['año'] && !protegido(d, 'año') && (mb.anioOriginal || mb['año'])){
        d['año'] = mb.anioOriginal || mb['año']; tocado = true;
      }
      if(tocado) res.datos++;
      if(!d.tracklist.length && mb.tracklist.length){
        d.tracklist = normTracks(mb.tracklist);
        res.tracks++;
      }else if(!protegido(d, 'tracklist') && mb.tracklist.length === d.tracklist.length
          && !d.tracklist.some(function(t){ return t.disco > 1 || t.pos; })){
        /* mismo número de cortes: añadimos la unidad sin tocar los títulos */
        var hayVarias = mb.tracklist.some(function(t){ return (t.disco || 1) > 1; });
        if(hayVarias){
          d.tracklist = d.tracklist.map(function(t, i){
            return Object.assign({}, t, {disco: mb.tracklist[i].disco || 1});
          });
          res.caras++;
        }
      }
    }
  }
  /* 3. Apple Music y portada (solo si falta alguna de las dos) */
  if(!d.appleUrl || !d.portada){
    var hit = await itBuscar(d.titulo, d.artista).catch(function(){ return null; });
    if(hit){
      if(!d.appleUrl && hit.c.collectionViewUrl){ d.appleUrl = hit.c.collectionViewUrl; res.apple++; }
      if(!d.portada && hit.c.artworkUrl100) d.portada = artBig(hit.c.artworkUrl100, 600);
    }
  }
  /* 4. foto del disco físico */
  if(!d.fotoDisco && !d.sinFoto && d.mbid){
    var url = await fotoDelSoporte(d.mbid, d.rgid).catch(function(){ return ''; });
    if(url){ d.fotoDisco = url; d.fotoDiscoMbid = d.mbid; res.foto++; }
    else d.sinFoto = 1;
  }
  /* 5. créditos y ficha técnica */
  if(!d.extra && d.mbid){
    await cargarExtra(d).then(function(){ res.creditos++; }).catch(function(){});
  }
  if(hayDiscogs() && !d.tecnica){
    await cargarDiscogs(d).then(function(){ res.tecnica++; }).catch(function(){});
  }
  /* 6. un doble que sigue sin separar: se insiste con las posiciones de Discogs */
  var esDoble = /2\s*[x×]/i.test(d.formatoDetalle || '');
  if(esDoble && d.tracklist.length && !d.tracklist.some(function(t){ return (t.disco || 1) > 1 || t.pos; })){
    if(hayDiscogs()){
      await cargarDiscogs(d).catch(function(){});
      if(d.tracklist.some(function(t){ return t.pos; })) res.caras++;
    }
  }
}

