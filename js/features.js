/* ============================================================
   15. VALORACIÓN, LETRAS, WIKIPEDIA, CRÉDITOS Y CURIOSIDADES
   ============================================================ */

/* ---------- estrellas ---------- */
function estrellaSVG(llena){
  return '<svg class="ic st' + (llena ? ' on solid' : '') + '" viewBox="0 0 24 24">'
    + '<path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-.9z"/></svg>';
}
function estrellasHtml(n, grande, id){
  var v = Number(n) || 0, out = '<span class="stars' + (grande ? ' big' : '') + '"' + (id ? ' data-rate="' + id + '"' : '') + '>';
  for(var i = 1; i <= 5; i++){
    out += grande ? '<span data-v="' + i + '" role="button" aria-label="' + i + ' estrellas">' + estrellaSVG(i <= v) + '</span>'
                  : estrellaSVG(i <= v);
  }
  return out + '</span>';
}
var TEXTO_VALORACION = ['Sin valorar', 'Flojo', 'Correcto', 'Bueno', 'Muy bueno', 'Imprescindible'];
function montarEstrellas(caja, d, alCambiar){
  if(!caja) return;
  caja.querySelectorAll('[data-v]').forEach(function(el){
    el.onclick = function(){
      var v = +el.dataset.v;
      d.valoracion = (d.valoracion === v) ? 0 : v;
      persist(true);
      caja.innerHTML = estrellasHtml(d.valoracion, true, d.id).replace(/^<span class="stars big"[^>]*>|<\/span>$/g, '');
      montarEstrellas(caja, d, alCambiar);
      if(alCambiar) alCambiar(d.valoracion);
    };
  });
}

/* ---------- letras (enlace externo: no puedo reproducirlas aquí) ---------- */
function urlLetra(artista, cancion){
  var limpio = String(cancion || '').replace(/\s*[\(\[][^\)\]]*[\)\]]/g, '').trim();
  return 'https://genius.com/search?q=' + encodeURIComponent((artista || '') + ' ' + limpio);
}

/* ---------- deseos: ya lo tengo ---------- */
/* Devuelve la otra edición del mismo álbum, si está enlazada o es evidente */
function otraEdicion(d){
  if(d.enlazado){
    var e = DB.discos.filter(function(x){ return x.id === d.enlazado; })[0];
    if(e) return e;
  }
  return DB.discos.filter(function(x){
    return x.id !== d.id && x.lista === d.lista && x.formato !== d.formato
      && plain(x.artista) === plain(d.artista) && plain(x.titulo) === plain(d.titulo);
  })[0] || null;
}
function enlazarEdiciones(a, b){
  a.enlazado = b.id;
  b.enlazado = a.id;
  persist();
}
function separarEdiciones(d){
  var o = otraEdicion(d);
  if(o) o.enlazado = '';
  d.enlazado = '';
  persist();
}
function candidatasEnlace(d){
  return DB.discos.filter(function(x){
    return x.id !== d.id && !x.enlazado && x.formato !== d.formato && x.lista === d.lista
      && plain(x.artista) === plain(d.artista)
      && (plain(x.titulo) === plain(d.titulo) || similitud(x.titulo, d.titulo) >= 0.92);
  });
}

/* Busca una ficha equivalente en la otra lista (mismo artista y título) */
function equivalenteEn(d, lista){
  return DB.discos.filter(function(x){
    return x.id !== d.id && x.lista === lista
      && plain(x.artista) === plain(d.artista)
      && (plain(x.titulo) === plain(d.titulo) || similitud(x.titulo, d.titulo) >= 0.9);
  });
}
function marcarComprado(id, padre){
  var d = DB.discos.filter(function(x){ return x.id === id; })[0];
  if(!d) return;
  var gemelos = equivalenteEn(d, 'coleccion');
  var body = (gemelos.length
      ? '<div class="warnb">' + I.warn + '<span>Ojo: ya tienes <b>' + esc(gemelos[0].titulo) + '</b> de '
        + esc(gemelos[0].artista) + ' en tu colección, en ' + gemelos[0].formato + '. '
        + 'Si es el mismo disco y no otra edición, mejor <a href="#" id="fusionarYa" style="color:var(--blue)">fusionar las fichas</a>.</span></div>'
      : '')
    + (hayDiscogs() ? '<div class="note">' + I.info + ' Si lo subes a Discogs, se traerá solo la próxima vez '
        + 'que consultes tu colección de allí.</div>' : '')
    + '<p style="font-size:15px;color:var(--txt2);line-height:1.5;margin:0 0 16px">Vas a mover <b style="color:var(--txt)">'
    + esc(d.titulo) + '</b> de ' + esc(d.artista) + ' a tu colección. ¿En qué formato lo has comprado?</p>'
    + '<div class="segtype" id="cFmt">'
      + '<button type="button" data-f="Vinilo" class="' + (d.formato === 'Vinilo' ? 'on' : '') + '">' + I.vinilo + 'Vinilo</button>'
      + '<button type="button" data-f="CD" class="' + (d.formato === 'CD' ? 'on' : '') + '">' + I.cdIc + 'CD</button>'
    + '</div>'
    + '<div class="group">'
      + '<div class="grow"><label>Comprado el</label><input id="cFecha" type="date" value="' + new Date().toISOString().slice(0, 10) + '"></div>'
      + '<div class="grow"><label>Precio (€)</label><input id="cPrecio" type="number" step="0.01" min="0" placeholder="opcional"></div>'
      + '<div class="grow"><label>Estado</label><input id="cEstado" type="text" value="' + esc(d.estado) + '" placeholder="Mint, VG+…"></div>'
    + '</div>';
  var s = sheet('¿Ya lo tienes?', body,
    '<button type="button" class="btn" data-cx>Cancelar</button><button type="button" class="btn ok" id="cOk">' + I.check + 'Añadir a la colección</button>');
  var fmt = d.formato;
  s.querySelector('[data-cx]').onclick = function(){ s.remove(); };
  if(s.querySelector('#fusionarYa')) s.querySelector('#fusionarYa').onclick = function(e){
    e.preventDefault();
    var base = gemelos[0];
    guardarDeshacer([d, base], 'fusionar con la ficha existente');
    ['año','genero','sello','numeroCatalogo','pais','portada','notas','formatoDetalle','mbid','rgid','discogs','codigoBarras'].forEach(function(f){
      if(!base[f] && d[f]) base[f] = d[f];
    });
    if(!base.tracklist.length && d.tracklist.length) base.tracklist = d.tracklist;
    d.etiquetas.forEach(function(t){ if(base.etiquetas.indexOf(t) < 0) base.etiquetas.push(t); });
    DB.discos = DB.discos.filter(function(x){ return x.id !== d.id; });
    persist();
    s.remove();
    if(padre) padre.remove();
    toast('Fichas fusionadas en la que ya tenías');
    openDetail(base.id);
  };
  s.querySelector('#cFmt').onclick = function(e){
    var b = e.target.closest('button');
    if(!b) return;
    fmt = b.dataset.f;
    s.querySelectorAll('#cFmt button').forEach(function(x){ x.className = x.dataset.f === fmt ? 'on' : ''; });
  };
  s.querySelector('#cOk').onclick = function(){
    d.lista = 'coleccion';
    d.formato = fmt;
    d.fechaCompra = s.querySelector('#cFecha').value || '';
    var pr = parseFloat(s.querySelector('#cPrecio').value);
    if(pr) d.precioCompra = pr;
    d.estado = s.querySelector('#cEstado').value.trim();
    if(!d.fechaAlta) d.fechaAlta = nowISO();
    persist();
    s.remove();
    if(padre) padre.remove();
    toast('«' + d.titulo + '» ya está en tu colección');
    if(incompleto(d)) enrich(d.id, false);
  };
}

/* ---------- curiosidades ---------- */
function curiosidades(){
  var ds = coleccion();
  if(ds.length < 4) return [];
  var out = [];
  var cuenta = function(fn){
    var m = {};
    ds.forEach(function(d){ var k = fn(d); if(k) m[k] = (m[k] || 0) + 1; });
    return Object.keys(m).map(function(k){ return {k:k, v:m[k]}; }).sort(function(a, b){ return b.v - a.v; });
  };
  var art = cuenta(function(d){ return d.artista; });
  var sel = cuenta(function(d){ return d.sello; });
  var dec = cuenta(function(d){ var y = parseInt(d['año']); return y ? Math.floor(y / 10) * 10 : 0; });
  var anios = cuenta(function(d){ return d['año']; });
  var pais = cuenta(function(d){ return d.pais; });
  var vin = ds.filter(function(d){ return d.formato === 'Vinilo'; }).length;
  var temas = ds.reduce(function(a, d){ return a + d.tracklist.length; }, 0);

  if(art[0] && art[0].v > 1) out.push('Tu artista más presente es <b>' + esc(art[0].k) + '</b>, con <b>' + art[0].v + ' discos</b> en la estantería.');
  if(dec[0]) out.push('La década de los <b>' + dec[0].k + '</b> domina tu colección: <b>' + dec[0].v + ' discos</b>, un ' + Math.round(dec[0].v / ds.length * 100) + '% del total.');
  if(anios[0] && anios[0].v > 2) out.push('<b>' + anios[0].k + '</b> fue un buen año para ti: tienes <b>' + anios[0].v + ' discos</b> publicados ese año.');
  if(sel[0] && sel[0].v > 2) out.push('El sello que más se repite es <b>' + esc(sel[0].k) + '</b>, con <b>' + sel[0].v + ' referencias</b>.');
  if(temas) out.push('Entre todos tus discos suman <b>' + temas + ' canciones</b>. Puestas seguidas serían más de <b>' + Math.round(temas * 4 / 60) + ' horas</b> de música.');
  out.push('Tu colección es <b>' + Math.round(vin / ds.length * 100) + '% vinilo</b> y <b>' + Math.round((ds.length - vin) / ds.length * 100) + '% CD</b>.');
  if(pais[0] && PAISES[pais[0].k]) out.push('La mayoría de tus prensados vienen de <b>' + nombrePais(pais[0].k) + '</b> ' + bandera(pais[0].k) + ': <b>' + pais[0].v + ' discos</b>.');

  var viejo = ds.filter(function(d){ return parseInt(d['año']) > 1900; }).sort(function(a, b){ return parseInt(a['año']) - parseInt(b['año']); })[0];
  if(viejo) out.push('El disco más veterano es <b>' + esc(viejo.titulo) + '</b> de ' + esc(viejo.artista) + ', de <b>' + viejo['año'] + '</b>. Tiene ya ' + (new Date().getFullYear() - parseInt(viejo['año'])) + ' años.');
  var nuevo = ds.slice().sort(function(a, b){ return parseInt(b['año'] || 0) - parseInt(a['año'] || 0); })[0];
  if(nuevo && nuevo['año']) out.push('Lo más reciente que tienes es de <b>' + nuevo['año'] + '</b>: ' + esc(nuevo.titulo) + ', de ' + esc(nuevo.artista) + '.');

  var largo = ds.filter(function(d){ return d.tracklist.length; }).sort(function(a, b){ return b.tracklist.length - a.tracklist.length; })[0];
  if(largo) out.push('<b>' + esc(largo.titulo) + '</b> es tu disco con más canciones: <b>' + largo.tracklist.length + ' temas</b>.');

  var titulos = {};
  ds.forEach(function(d){ d.tracklist.forEach(function(t){ var k = plain(t.titulo); if(k.length > 3) titulos[k] = (titulos[k] || 0) + 1; }); });
  var rep = Object.keys(titulos).filter(function(k){ return titulos[k] > 1; }).sort(function(a, b){ return titulos[b] - titulos[a]; })[0];
  if(rep){
    var nombreReal = '';
    ds.some(function(d){ return d.tracklist.some(function(t){ if(plain(t.titulo) === rep){ nombreReal = t.titulo; return true; } }); });
    out.push('Tienes <b>' + titulos[rep] + ' versiones</b> de la misma canción: <b>' + esc(nombreReal) + '</b>.');
  }

  var conNota = ds.filter(function(d){ return d.valoracion; });
  if(conNota.length > 2){
    var media = conNota.reduce(function(a, d){ return a + d.valoracion; }, 0) / conNota.length;
    out.push('Has valorado <b>' + conNota.length + ' discos</b> con una media de <b>' + media.toFixed(1) + ' estrellas</b>.');
    var cinco = conNota.filter(function(d){ return d.valoracion === 5; });
    if(cinco.length) out.push('Para ti son imprescindibles <b>' + cinco.length + ' discos</b>. El primero de la lista: ' + esc(cinco[0].titulo) + '.');
  }
  var escuchados = ds.filter(function(d){ return totalEscuchas(d) > 0; });
  if(escuchados.length){
    var top = escuchados.slice().sort(function(a, b){ return totalEscuchas(b) - totalEscuchas(a); })[0];
    out.push('El disco que más has puesto es <b>' + esc(top.titulo) + '</b>, <b>' + totalEscuchas(top) + ' veces</b>.');
    out.push('Llevas <b>' + escuchados.length + ' discos</b> estrenados de ' + ds.length + '. Te quedan <b>' + (ds.length - escuchados.length) + '</b> por poner.');
  }
  var gasto = ds.reduce(function(a, d){ return a + (d.precioCompra || 0); }, 0);
  if(gasto > 0) out.push('Lo que llevas registrado en compras suma <b>' + gasto.toFixed(0) + ' €</b>, a una media de ' + (gasto / ds.filter(function(d){ return d.precioCompra; }).length).toFixed(1) + ' € por disco.');

  var huecos = [];
  for(var y = 1960; y <= new Date().getFullYear(); y += 10){
    if(!dec.some(function(x){ return +x.k === y; })) huecos.push(y + 's');
  }
  if(huecos.length && huecos.length < 4) out.push('No tienes ningún disco de los <b>' + huecos.join(' ni de los ') + '</b>. Un hueco por llenar.');

  var solos = art.filter(function(a){ return a.v === 1; }).length;
  if(solos) out.push('De <b>' + solos + ' artistas</b> tienes un único disco. La mitad de tu colección son visitas de una sola vez.');

  var letras = {};
  ds.forEach(function(d){ var L = (d.artista || '?')[0]; if(L) letras[L.toUpperCase()] = (letras[L.toUpperCase()] || 0) + 1; });
  var topL = Object.keys(letras).sort(function(a, b){ return letras[b] - letras[a]; })[0];
  if(topL) out.push('La letra <b>' + topL + '</b> es la más poblada de tu estantería, con <b>' + letras[topL] + ' artistas o discos</b>.');

  return out;
}
function pintaCuriosidad(caja){
  if(!caja) return;
  var lista = curiosidades();
  if(!lista.length){ caja.innerHTML = ''; return; }
  var i = Math.floor(Math.random() * lista.length);
  var pinta = function(){
    caja.innerHTML = '<div class="tip"><div class="bulb">' + I.bombilla + '</div>'
      + '<div class="tx"><div class="k">¿Sabías que…?</div><div class="v">' + lista[i] + '</div></div>'
      + '<button type="button" class="otro" id="otraCur" data-tip="Otra curiosidad">' + I.refresh + '</button></div>';
    caja.querySelector('#otraCur').onclick = function(){
      i = (i + 1 + Math.floor(Math.random() * (lista.length - 1))) % lista.length;
      pinta();
    };
  };
  pinta();
}

/* ---------- compartir el disco como imagen ---------- */
function compartirDisco(d){
  var t = toast('Preparando la imagen…');
  var W = 1080, H = 1350;
  var c = document.createElement('canvas');
  c.width = W; c.height = H;
  var x = c.getContext('2d');
  var fondo = d.color ? 'rgb(' + d.color + ')' : '#1d1d1f';
  var grad = x.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, fondo);
  grad.addColorStop(1, '#0d0d10');
  x.fillStyle = grad; x.fillRect(0, 0, W, H);
  var pinta = function(img){
    if(img){
      var s = 760, px = (W - s) / 2, py = 170;
      x.save();
      x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 60; x.shadowOffsetY = 24;
      x.beginPath(); x.roundRect(px, py, s, s, 28); x.closePath(); x.clip();
      x.drawImage(img, px, py, s, s);
      x.restore();
    }
    x.fillStyle = '#fff';
    x.textAlign = 'center';
    x.font = '700 62px -apple-system, "SF Pro Display", Helvetica, Arial';
    var tit = d.titulo.length > 26 ? d.titulo.slice(0, 25) + '…' : d.titulo;
    x.fillText(tit, W / 2, 1055);
    x.fillStyle = 'rgba(255,255,255,.72)';
    x.font = '500 42px -apple-system, "SF Pro Text", Helvetica, Arial';
    x.fillText(d.artista, W / 2, 1115);
    x.fillStyle = 'rgba(255,255,255,.5)';
    x.font = '400 32px -apple-system, "SF Pro Text", Helvetica, Arial';
    x.fillText([d['año'], d.formato, d.genero].filter(Boolean).join('  ·  '), W / 2, 1170);
    if(d.valoracion){
      x.fillStyle = '#ffb400';
      x.font = '400 46px -apple-system, Helvetica, Arial';
      var est = '';
      for(var i = 0; i < 5; i++) est += i < d.valoracion ? '★' : '☆';
      x.fillText(est, W / 2, 1245);
    }
    c.toBlob(function(blob){
      t.remove();
      if(!blob) return toast('No se pudo generar la imagen', true);
      var file = new File([blob], 'disco.png', {type:'image/png'});
      if(navigator.canShare && navigator.canShare({files:[file]})){
        navigator.share({files:[file], title: d.titulo}).catch(function(){});
      }else{
        download((d.artista + ' - ' + d.titulo).replace(/[^\w\s-]/g, '') + '.png', blob);
        toast('Imagen descargada');
      }
    }, 'image/png');
  };
  if(!d.portada) return pinta(null);
  var img = new Image(), hecho = false;
  var una = function(x){ if(hecho) return; hecho = true; pinta(x); };
  img.crossOrigin = 'anonymous';
  img.onload = function(){ una(img); };
  img.onerror = function(){ una(null); };
  setTimeout(function(){ una(null); }, 3500);
  img.src = d.portada;
}

/* ---------- menú rápido al mantener pulsado ---------- */
function menuRapido(id){
  var d = DB.discos.filter(function(x){ return x.id === id; })[0];
  if(!d || readOnly) return;
  var q = document.createElement('div');
  q.className = 'quick';
  q.innerHTML = '<div class="quickbox">'
    + '<div class="quickhd">' + (d.portada ? '<img src="' + esc(d.portada) + '" alt="">' : '<div class="phb"></div>')
    + '<div style="min-width:0"><div class="qt">' + esc(d.titulo) + '</div><div class="qa">' + esc(d.artista) + '</div></div></div>'
    + '<div class="quickstars" id="qStars">' + estrellasHtml(d.valoracion, true, d.id) + '</div>'
    + '<div class="quickop" data-q="oir">' + (escuchadoHoy(d) ? I.check : I.playF)
      + (escuchadoHoy(d) ? 'Quitar la escucha de hoy' : 'Lo he escuchado hoy') + '</div>'
    + '<div class="quickop" data-q="abrir">' + I.eye + 'Abrir la ficha</div>'
    + '<div class="quickop" data-q="editar">' + I.pencil + 'Editar</div>'
    + '<div class="quickop" data-q="compartir">' + I.compartir + 'Compartir</div>'
    + '</div>';
  document.body.appendChild(q);
  var cerrar = function(){ q.remove(); };
  q.addEventListener('click', function(e){ if(e.target === q) cerrar(); });
  montarEstrellas(q.querySelector('#qStars'), d, function(){ paintCol(); });
  q.querySelectorAll('[data-q]').forEach(function(el){
    el.onclick = function(){
      var a = el.dataset.q;
      cerrar();
      if(a === 'oir'){ marcarEscucha(d.id); paintCol(); }
      else if(a === 'abrir') openDetail(d.id);
      else if(a === 'editar') openForm(d);
      else if(a === 'compartir') compartirDisco(d);
    };
  });
}
function montarPulsacionLarga(root){
  root.querySelectorAll('.tile,.lrow').forEach(function(el){
    if(el.dataset.pulsa) return;
    el.dataset.pulsa = '1';
    var t = null, movido = false;
    var arranca = function(){
      movido = false;
      t = setTimeout(function(){
        if(!movido){ menuRapido(el.dataset.id); }
      }, 480);
    };
    var para = function(){ clearTimeout(t); };
    el.addEventListener('touchstart', arranca, {passive:true});
    el.addEventListener('touchmove', function(){ movido = true; para(); }, {passive:true});
    el.addEventListener('touchend', para);
    el.addEventListener('touchcancel', para);
    el.addEventListener('contextmenu', function(e){
      if(window.innerWidth > 760) return;
      e.preventDefault();
      menuRapido(el.dataset.id);
    });
  });
}

/* ============================================================
   17. RESUMEN POR PAÍS
   ============================================================ */
function verPais(cc){
  var ds = coleccion().filter(function(d){ return d.pais === cc; });
  if(!ds.length) return;
  var nv = ds.filter(function(d){ return d.formato === 'Vinilo'; }).length;
  var cuenta = function(fn){
    var m = {};
    ds.forEach(function(d){ var k = fn(d); if(k) m[k] = (m[k] || 0) + 1; });
    return Object.keys(m).map(function(k){ return {k:k, v:m[k]}; }).sort(function(a, b){ return b.v - a.v; });
  };
  var sellos = cuenta(function(d){ return d.sello; }).slice(0, 4);
  var decadas = cuenta(function(d){ var y = parseInt(d['año']); return y ? Math.floor(y / 10) * 10 + 's' : ''; })
    .sort(function(a, b){ return parseInt(a.k) - parseInt(b.k); });
  var orden = ds.slice().sort(function(a, b){
    return (a.artista || '').localeCompare(b.artista || '', 'es') || String(a['año']).localeCompare(String(b['año']));
  });
  var body =
    '<div class="paishd">' + (bandera(cc) ? '<div class="bandera">' + bandera(cc) + '</div>' : '')
    + '<div><div class="pn">' + esc(nombrePais(cc)) + '</div>'
    + '<div class="pd">' + ds.length + (ds.length === 1 ? ' disco prensado aquí' : ' discos prensados aquí') + '</div></div></div>'
    + '<div class="resumen" style="display:flex;margin-bottom:16px">'
      + '<div class="rcol"><span class="v rvin">' + nv + '</div><div class="k">vinilos</div></div>'
      + '<div><div class="v rcd">' + (ds.length - nv) + '</div><div class="k">CDs</div></div>'
      + '<div><div class="v">' + cuenta(function(d){ return d.artista; }).length + '</div><div class="k">artistas</div></div>'
      + (decadas.length ? '<div><div class="v" style="font-size:16px;padding-top:3px">' + decadas[0].k
          + '</div><div class="k">desde</div></div>' : '')
    + '</div>'
    + (sellos.length ? '<div class="tl-hd"><h4>Sellos</h4></div><div class="rowb" style="margin-bottom:16px">'
        + sellos.map(function(s){ return '<span class="tag">' + esc(s.k) + ' · ' + s.v + '</span>'; }).join('') + '</div>' : '')
    + '<div class="tl-hd"><h4>Discos<span class="n"> · ' + ds.length + '</span></h4></div>'
    + '<div class="grid paisgrid">' + orden.map(function(d){ return tileHtml(d, null); }).join('') + '</div>';
  var s = sheet(nombrePais(cc), body,
    '<span></span><button type="button" class="btn pri" id="verTodos">Ver en la colección</button>', true);
  enlazarTiles(s, null);
  s.querySelector('#verTodos').onclick = function(){
    fPais = cc;
    s.remove();
    setView('col');
    paintCol();
  };
}

/* ============================================================
   18. CALENDARIO DE ESCUCHAS
   ============================================================ */
var DIAS_SEM = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
var MESES_L = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function todasLasEscuchas(){
  var out = [];
  coleccion().forEach(function(d){
    (d.escuchasFechas || []).forEach(function(f){ out.push({f:f, d:d}); });
  });
  return out.sort(function(a, b){ return a.f.localeCompare(b.f); });
}
function diaSemana(iso){
  var p = iso.split('-');
  var j = new Date(+p[0], +p[1] - 1, +p[2]).getDay();
  return (j + 6) % 7;   /* 0 = lunes */
}
function statsPeriodo(lista, etiqueta){
  if(!lista.length) return '<div class="tl-empty">Sin escuchas en ' + etiqueta + '</div>';
  var porDia = {}, porDisco = {}, porSem = [0,0,0,0,0,0,0];
  lista.forEach(function(x){
    porDia[x.f] = (porDia[x.f] || 0) + 1;
    porDisco[x.d.id] = (porDisco[x.d.id] || 0) + 1;
    porSem[diaSemana(x.f)]++;
  });
  var dias = Object.keys(porDia).sort();
  /* racha más larga de días consecutivos */
  var racha = 0, mejor = 0, prev = null;
  dias.forEach(function(f){
    var t = new Date(f + 'T12:00:00').getTime();
    if(prev !== null && Math.round((t - prev) / 86400000) === 1) racha++;
    else racha = 1;
    if(racha > mejor) mejor = racha;
    prev = t;
  });
  var top = Object.keys(porDisco).sort(function(a, b){ return porDisco[b] - porDisco[a]; })[0];
  var td = DB.discos.filter(function(d){ return d.id === top; })[0];
  var mejorDia = porSem.indexOf(Math.max.apply(null, porSem));
  var NOM = ['lunes','martes','miércoles','jueves','viernes','sábados','domingos'];
  var f = function(k, v){ return '<div class="cred"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>'; };
  return '<div class="creds">'
    + f('Escuchas', lista.length)
    + f('Discos distintos', Object.keys(porDisco).length)
    + f('Días con música', dias.length)
    + f('Racha más larga', mejor + (mejor === 1 ? ' día' : ' días seguidos'))
    + f('Día preferido', 'los ' + NOM[mejorDia] + ' (' + porSem[mejorDia] + ')')
    + (td ? f('El más puesto', esc(td.titulo) + ' · ' + porDisco[top]) : '')
    + '</div>';
}
function calendarioEscuchas(nivel, ref){
  var todas = todasLasEscuchas();
  var hoy = new Date();
  nivel = nivel || 'anio';
  ref = ref || hoy.getFullYear() + '-' + ('0' + (hoy.getMonth() + 1)).slice(-2) + '-' + ('0' + hoy.getDate()).slice(-2);
  var s = sheet('Calendario de escuchas', '<div id="calBody"></div>', null, true);
  var caja = s.querySelector('#calBody');

  function pinta(){
    var anio = +ref.slice(0, 4), mes = +ref.slice(5, 7), dia = +ref.slice(8, 10);
    var titulo = '', lista = [], cuerpo = '';
    var seg = '<div class="seg" id="calSeg" style="margin-bottom:16px">'
      + ['anio:Año', 'mes:Mes', 'sem:Semana', 'dia:Día'].map(function(o){
          var p = o.split(':');
          return '<button type="button" data-n="' + p[0] + '"' + (nivel === p[0] ? ' class="on"' : '') + '>' + p[1] + '</button>';
        }).join('') + '</div>';

    if(nivel === 'anio'){
      titulo = anio;
      lista = todas.filter(function(x){ return +x.f.slice(0, 4) === anio; });
      var porDia = {};
      lista.forEach(function(x){ porDia[x.f] = (porDia[x.f] || 0) + 1; });
      var maxd = Math.max(1, Math.max.apply(null, Object.keys(porDia).map(function(k){ return porDia[k]; }).concat([1])));
      var meses = '';
      for(var m = 0; m < 12; m++){
        var pri = new Date(anio, m, 1), ult = new Date(anio, m + 1, 0).getDate();
        var hueco = (pri.getDay() + 6) % 7, celdas = '';
        for(var e = 0; e < hueco; e++) celdas += '<i class="cday vacia"></i>';
        for(var d2 = 1; d2 <= ult; d2++){
          var f2 = anio + '-' + ('0' + (m + 1)).slice(-2) + '-' + ('0' + d2).slice(-2);
          var n = porDia[f2] || 0;
          var nv2 = n === 0 ? 0 : Math.min(4, Math.ceil(n / maxd * 4));
          celdas += '<i class="cday n' + nv2 + '" data-dia="' + f2 + '" title="' + d2 + ' de ' + MESES_L[m] + ': '
            + (n || 'sin escuchas') + '"></i>';
        }
        meses += '<div class="calmes" data-mes="' + anio + '-' + ('0' + (m + 1)).slice(-2) + '-01">'
          + '<div class="cm">' + MESES_L[m].slice(0, 3) + '</div><div class="cg">' + celdas + '</div></div>';
      }
      cuerpo = '<div class="calanio">' + meses + '</div>'
        + '<div class="calleyenda"><span>menos</span><i class="cday n0"></i><i class="cday n1"></i><i class="cday n2"></i>'
        + '<i class="cday n3"></i><i class="cday n4"></i><span>más</span></div>';
    }
    else if(nivel === 'mes'){
      titulo = MESES_L[mes - 1] + ' de ' + anio;
      lista = todas.filter(function(x){ return x.f.slice(0, 7) === ref.slice(0, 7); });
      var porDia2 = {};
      lista.forEach(function(x){ (porDia2[x.f] = porDia2[x.f] || []).push(x.d); });
      var pri2 = new Date(anio, mes - 1, 1), ult2 = new Date(anio, mes, 0).getDate();
      var hueco2 = (pri2.getDay() + 6) % 7, celdas2 = '';
      for(var e2 = 0; e2 < hueco2; e2++) celdas2 += '<div class="cd vacia"></div>';
      for(var d3 = 1; d3 <= ult2; d3++){
        var f3 = anio + '-' + ('0' + mes).slice(-2) + '-' + ('0' + d3).slice(-2);
        var ds3 = porDia2[f3] || [];
        celdas2 += '<div class="cd' + (ds3.length ? ' con' : '') + '" data-dia="' + f3 + '">'
          + '<span class="dn">' + d3 + '</span>'
          + (ds3.length ? '<div class="minis">' + ds3.slice(0, 3).map(function(d4){
              return d4.portada ? '<img src="' + esc(d4.portada) + '" alt="" data-img-error="remove">' : '<i></i>';
            }).join('') + (ds3.length > 3 ? '<span class="mas">+' + (ds3.length - 3) + '</span>' : '') + '</div>' : '')
          + '</div>';
      }
      cuerpo = '<div class="calsem">' + DIAS_SEM.map(function(x){ return '<span>' + x + '</span>'; }).join('') + '</div>'
        + '<div class="calmesg">' + celdas2 + '</div>';
    }
    else if(nivel === 'sem'){
      var base = new Date(anio, mes - 1, dia);
      base.setDate(base.getDate() - diaSemana(ref));
      var dias7 = [];
      for(var i7 = 0; i7 < 7; i7++){
        var dd = new Date(base.getTime() + i7 * 86400000);
        dias7.push(dd.getFullYear() + '-' + ('0' + (dd.getMonth() + 1)).slice(-2) + '-' + ('0' + dd.getDate()).slice(-2));
      }
      var m1 = +dias7[0].slice(5, 7), m2 = +dias7[6].slice(5, 7);
      titulo = 'Semana del ' + (+dias7[0].slice(8)) + (m1 !== m2 ? ' de ' + MESES_L[m1 - 1] : '')
        + ' al ' + (+dias7[6].slice(8)) + ' de ' + MESES_L[m2 - 1];
      lista = todas.filter(function(x){ return dias7.indexOf(x.f) >= 0; });
      cuerpo = '<div class="calsemg">' + dias7.map(function(f4, i4){
        var ds4 = lista.filter(function(x){ return x.f === f4; });
        return '<div class="csem" data-dia="' + f4 + '"><div class="ch">' + DIAS_SEM[i4] + ' ' + (+f4.slice(8)) + '</div>'
          + (ds4.length ? ds4.map(function(x){
              return '<div class="ci">' + (x.d.portada ? '<img src="' + esc(x.d.portada) + '" alt="" data-img-error="remove">' : '')
                + '<span>' + esc(x.d.titulo) + '</span></div>';
            }).join('') : '<div class="cv">—</div>') + '</div>';
      }).join('') + '</div>';
    }
    else{
      titulo = dia + ' de ' + MESES_L[mes - 1] + ' de ' + anio;
      lista = todas.filter(function(x){ return x.f === ref; });
      cuerpo = lista.length
        ? '<div class="grid">' + lista.map(function(x){ return tileHtml(x.d, null); }).join('') + '</div>'
        : '<div class="tl-empty">Ese día no pusiste nada</div>';
    }

    caja.innerHTML = seg
      + '<div class="calnav"><button type="button" class="iconbtn" data-mov="-1"><svg class="ic" viewBox="0 0 24 24"><polyline points="15 5 8 12 15 19"/></svg></button>'
      + '<div class="calt">' + titulo + '</div>'
      + '<button type="button" class="iconbtn" data-mov="1"><svg class="ic" viewBox="0 0 24 24"><polyline points="9 5 16 12 9 19"/></svg></button></div>'
      + cuerpo
      + '<div class="tl-hd" style="margin-top:20px"><h4>Resumen</h4></div>'
      + statsPeriodo(lista, 'este periodo');

    caja.querySelectorAll('#calSeg button').forEach(function(b){
      b.onclick = function(){ nivel = b.dataset.n; pinta(); };
    });
    caja.querySelectorAll('[data-mov]').forEach(function(b){
      b.onclick = function(){
        var m = +b.dataset.mov, f = new Date(+ref.slice(0, 4), +ref.slice(5, 7) - 1, +ref.slice(8, 10));
        if(nivel === 'anio') f.setFullYear(f.getFullYear() + m);
        else if(nivel === 'mes') f.setMonth(f.getMonth() + m);
        else if(nivel === 'sem') f.setDate(f.getDate() + 7 * m);
        else f.setDate(f.getDate() + m);
        ref = f.getFullYear() + '-' + ('0' + (f.getMonth() + 1)).slice(-2) + '-' + ('0' + f.getDate()).slice(-2);
        pinta();
      };
    });
    caja.querySelectorAll('[data-mes]').forEach(function(b){
      b.onclick = function(){ ref = b.dataset.mes; nivel = 'mes'; pinta(); };
    });
    caja.querySelectorAll('[data-dia]').forEach(function(b){
      b.onclick = function(e){ e.stopPropagation(); ref = b.dataset.dia; nivel = 'dia'; pinta(); };
    });
    enlazarTiles(caja, null);
  }
  pinta();
}

/* ============================================================
   19. SELECCIÓN MÚLTIPLE Y ACCIONES EN LOTE
   ============================================================ */
var selMulti = false, seleccion = {};
function nSel(){ return Object.keys(seleccion).length; }
function alternarSeleccion(id){
  if(seleccion[id]) delete seleccion[id];
  else seleccion[id] = 1;
  pintarBarraSel();
  var t = document.querySelector('.tile[data-id="' + id + '"],.lrow[data-id="' + id + '"]');
  if(t) t.classList.toggle('sel', !!seleccion[id]);
}
function modoSeleccion(activo){
  selMulti = activo;
  if(!activo) seleccion = {};
  document.body.classList.toggle('modosel', activo);
  paintCol();
  pintarBarraSel();
}
function pintarBarraSel(){
  var b = document.getElementById('selbar');
  if(!b){
    b = document.createElement('div');
    b.id = 'selbar';
    b.className = 'selbar';
    document.body.appendChild(b);
  }
  if(!selMulti){ b.classList.remove('on'); return; }
  b.classList.add('on');
  b.innerHTML = '<button type="button" class="btn sm" id="selNada">Cancelar</button>'
    + '<div class="sn">' + nSel() + (nSel() === 1 ? ' disco' : ' discos') + '</div>'
    + '<div class="rowb"><button type="button" class="btn sm" id="selTodo">Todos</button>'
    + '<button type="button" class="btn pri sm" id="selAcc"' + (nSel() ? '' : ' disabled') + '>Acciones</button></div>';
  b.querySelector('#selNada').onclick = function(){ modoSeleccion(false); };
  b.querySelector('#selTodo').onclick = function(){
    ordenar(filtrados(coleccion())).forEach(function(d){ seleccion[d.id] = 1; });
    paintCol(); pintarBarraSel();
  };
  b.querySelector('#selAcc').onclick = accionesLote;
}
function accionesLote(){
  var ids = Object.keys(seleccion);
  var ds = DB.discos.filter(function(d){ return seleccion[d.id]; });
  if(!ds.length) return;
  var body = '<p style="font-size:14.5px;color:var(--txt2);margin:0 0 16px">Se aplicará a '
    + '<b style="color:var(--txt)">' + ds.length + ' discos</b>.</p>'
    + '<div class="group">'
      + '<div class="grow"><label>Dónde está</label><input id="lUb" type="text" placeholder="Estantería 2, caja azul…"></div>'
      + '<div class="grow"><label>Añadir etiqueta</label><input id="lEt" type="text" placeholder="firmado, para vender…"></div>'
      + '<div class="grow"><label>Estado</label><select id="lEs"><option value="">Sin cambios</option>'
        + ESTADOS.map(function(e){ return '<option value="' + esc(e) + '">' + esc(e) + '</option>'; }).join('')
      + '</select>' + CHEV + '</div>'
      + '<div class="grow"><label>Género</label><select id="lGe"><option value="">Sin cambios</option>'
        + GENEROS.map(function(g){ return '<option value="' + esc(g) + '">' + esc(g) + '</option>'; }).join('')
      + '</select>' + CHEV + '</div>'
    + '</div>'
    + '<div class="dbact">'
      + accion(I.playF, 'Marcar escucha de hoy', 'Registra hoy en los ' + ds.length + ' discos seleccionados.', 'oir', '', 'Marcar')
      + accion(I.heart, 'Mover a deseos', 'Pásalos a la lista de deseos.', 'wish', '', 'Mover')
      + accion(I.spark, 'Completar fichas', 'Busca lo que falte en cada uno.', 'comp', '', 'Completar')
      + accion(I.trash, 'Eliminar', 'Los borra de la colección. Podrás deshacerlo.', 'del', 'destr', 'Eliminar')
    + '</div>';
  var s = sheet('Acciones sobre ' + ds.length + ' discos', body,
    '<button type="button" class="btn" data-lx>Cerrar</button><button type="button" class="btn pri" id="lOk">Aplicar cambios</button>');
  s.querySelector('[data-lx]').onclick = function(){ s.remove(); };
  s.querySelector('#lOk').onclick = function(){
    var ub = s.querySelector('#lUb').value.trim(), et = s.querySelector('#lEt').value.trim();
    var es = s.querySelector('#lEs').value, ge = s.querySelector('#lGe').value;
    if(!ub && !et && !es && !ge){ toast('No has indicado ningún cambio', true); s.remove(); return; }
    guardarDeshacer(ds, 'cambio en ' + ds.length + ' discos');
    ds.forEach(function(d){
      if(ub) d.ubicacion = ub;
      if(es) d.estado = es;
      if(ge) d.genero = ge;
      if(et) et.split(',').map(function(x){ return x.trim(); }).filter(Boolean).forEach(function(t){
        if(d.etiquetas.indexOf(t) < 0) d.etiquetas.push(t);
      });
    });
    persist();
    s.remove();
    modoSeleccion(false);
    toast(ds.length + ' discos actualizados');
  };
  var on = function(a, fn){ var el = s.querySelector('[data-a=' + a + ']'); if(el) el.onclick = fn; };
  on('oir', function(){
    ds.forEach(function(d){ if(!escuchadoHoy(d)) marcarEscucha(d.id, true); });
    persist(); s.remove(); modoSeleccion(false);
    toast('Escucha registrada en ' + ds.length + ' discos');
  });
  on('wish', function(){
    guardarDeshacer(ds, 'mover a deseos');
    ds.forEach(function(d){ d.lista = 'deseos'; });
    persist(); s.remove(); modoSeleccion(false);
    toast(ds.length + ' discos movidos a deseos');
  });
  on('comp', function(){
    s.remove(); modoSeleccion(false);
    bulkRun(ds.filter(incompleto));
  });
  on('del', function(){
    if(!confirm('¿Eliminar ' + ds.length + ' discos?')) return;
    guardarDeshacer(ds, 'eliminar ' + ds.length + ' discos');
    DB.discos = DB.discos.filter(function(d){ return !seleccion[d.id]; });
    persist(); s.remove(); modoSeleccion(false);
    toast(ds.length + ' discos eliminados');
  });
}

/* ============================================================
   20. DESHACER
   ============================================================ */
var pilaDeshacer = null, temporizadorDeshacer = null;
function guardarDeshacer(discos, etiqueta){
  pilaDeshacer = {
    copia: JSON.parse(JSON.stringify(discos)),
    ids: discos.map(function(d){ return d.id; }),
    etiqueta: etiqueta
  };
  clearTimeout(temporizadorDeshacer);
  temporizadorDeshacer = setTimeout(function(){ pilaDeshacer = null; ocultarDeshacer(); }, 12000);
  setTimeout(mostrarDeshacer, 60);
}
function mostrarDeshacer(){
  if(!pilaDeshacer) return;
  var t = document.querySelector('.toast');
  if(!t) return;
  if(t.querySelector('.undo')) return;
  var b = document.createElement('button');
  b.className = 'undo';
  b.textContent = 'Deshacer';
  b.onclick = deshacer;
  t.appendChild(b);
}
function ocultarDeshacer(){
  var b = document.querySelector('.toast .undo');
  if(b) b.remove();
}
function deshacer(){
  if(!pilaDeshacer) return;
  var por = {};
  pilaDeshacer.copia.forEach(function(d){ por[d.id] = d; });
  DB.discos = DB.discos.filter(function(d){ return !por[d.id]; });
  pilaDeshacer.copia.forEach(function(d){
    DB.discos.push(normDisc(d));
    DB.borrados = (DB.borrados || []).filter(function(b){ return b.id !== d.id; });
  });
  var n = pilaDeshacer.copia.length;
  pilaDeshacer = null;
  clearTimeout(temporizadorDeshacer);
  persist();
  toast('Deshecho · ' + n + (n === 1 ? ' disco restaurado' : ' discos restaurados'));
}

/* estado de conservación, escala de Discogs */
var ESTADOS = ['Mint (M)', 'Near Mint (NM or M-)', 'Very Good Plus (VG+)', 'Very Good (VG)',
  'Good Plus (G+)', 'Good (G)', 'Fair (F)', 'Poor (P)'];

/* ============================================================
   21. VALOR ESTIMADO DE LA COLECCIÓN
   ============================================================ */
/* ============================================================
   EVOLUCIÓN DEL VALOR
   No hay forma fiable de capturar el valor en segundo plano: iOS no
   soporta Periodic Background Sync en una PWA instalada, así que esto
   es necesariamente manual u "oportunista" -se guarda una foto nueva
   cuando abres esta pantalla, si ha pasado más de un mes desde la
   última-, nunca automático de verdad. */
var K_VALOR_HIST = 'discoteca.valorHistorico';
function historicoValor(){
  try{ return JSON.parse(localStorage.getItem(K_VALOR_HIST) || '[]'); }catch(e){ return []; }
}
function guardarSnapshotValor(suma, n){
  var h = historicoValor();
  var hoy = hoyISO();
  if(h.length && h[h.length - 1].fecha === hoy) h[h.length - 1] = {fecha: hoy, valor: suma, n: n};
  else h.push({fecha: hoy, valor: suma, n: n});
  if(h.length > 60) h = h.slice(-60);
  try{ localStorage.setItem(K_VALOR_HIST, JSON.stringify(h)); }catch(e){}
  return h;
}
function pintaEvolucionValor(caja, suma, n){
  var h = historicoValor();
  var ultimo = h[h.length - 1];
  var diasDesde = ultimo ? Math.floor((Date.now() - new Date(ultimo.fecha + 'T12:00:00').getTime()) / 86400000) : 999;
  if(!ultimo || diasDesde >= 28) h = guardarSnapshotValor(suma, n);
  if(h.length < 2){
    caja.innerHTML = '<div class="tl-hd" style="margin-top:20px"><h4>Evolución del valor</h4></div>'
      + '<div class="warnb info">' + I.info + '<span>Se ha guardado la primera foto de hoy. Con una nueva '
      + 'foto dentro de un tiempo se podrá ver cómo cambia. En iPhone no hay forma de hacerlo del todo sola: '
      + 'se guarda una nueva cada vez que abras esta pantalla, como mucho una vez al mes.</span></div>';
    return;
  }
  var datos = h.map(function(x){ return {k: x.fecha.slice(5), v: Math.round(x.valor)}; });
  var primero = h[0], cambio = primero.valor ? Math.round((suma - primero.valor) / primero.valor * 100) : null;
  caja.innerHTML = '<div class="tl-hd" style="margin-top:20px"><h4>Evolución del valor</h4>'
    + '<span class="n">' + h.length + ' fotos desde ' + fdate(h[0].fecha).split(',')[0] + '</span></div>'
    + (cambio != null ? '<div class="warnb info">' + I.info + '<span>' + (cambio > 0 ? '+' + cambio + '% desde la primera foto.'
        : cambio < 0 ? cambio + '% desde la primera foto.' : 'Sin cambios desde la primera foto.')
        + ' Recuerda que es una estimación con ruido de mercado, no el precio real de venta.</span></div>' : '')
    + '<div class="chartwrap">' + columns(datos, 'var(--purple)') + '</div>';
}

function valorColeccion(){
  var ds = coleccion();
  var con = ds.filter(function(d){ return d.tecnica && d.tecnica.valor != null && d.tecnica.valor > 0; });
  var conNiveles = con.filter(function(d){ return d.tecnica.precio && d.tecnica.precio.tipo === 'suerte'; });
  var suma = con.reduce(function(a, d){ return a + d.tecnica.valor; }, 0);
  var pagado = ds.reduce(function(a, d){ return a + (d.precioCompra || 0); }, 0);
  var body =
    '<div class="warnb info">' + I.info + '<span>'
    + (conNiveles.length
        ? 'Cuando Discogs sabe que eres vendedor registrado da un precio sugerido por cada estado de '
          + 'conservación (bajo/medio/alto). Si no, se usa <b>el precio más bajo en venta ahora</b>, que es lo único '
          + 'que da a cualquiera. En ambos casos es orientativo, no lo que realmente se paga.'
        : 'Es el <b>precio más bajo al que se vende</b> cada disco en Discogs. Orientativo y algo optimista: '
          + 'es lo que piden los vendedores, no lo que se paga. Si tu cuenta de Discogs está dada de alta como '
          + 'vendedora, se consiguen tres niveles por estado de conservación en vez de uno solo.')
    + '</span></div>'
    + (con.length
      ? '<div class="resumen" style="display:flex;margin-bottom:18px">'
        + '<div><div class="v">' + suma.toFixed(0) + '<small>€</small></div><div class="k">valor estimado</div></div>'
        + '<div><div class="v">' + con.length + '</div><div class="k">con precio</div></div>'
        + '<div><div class="v">' + (suma / con.length).toFixed(1) + '<small>€</small></div><div class="k">media</div></div>'
        + '</div>'
        + (pagado ? '<div class="creds" style="margin-bottom:18px">'
            + '<div class="cred"><span class="k">Lo que registraste haber pagado</span><span class="v">' + pagado.toFixed(0) + ' €</span></div>'
            + '<div class="cred"><span class="k">Diferencia</span><span class="v">' + (suma - pagado >= 0 ? '+' : '') + (suma - pagado).toFixed(0) + ' €</span></div>'
            + '</div>' : '')
        + '<div class="tl-hd"><h4>Los más valiosos</h4></div><div class="tl">'
        + con.slice().sort(function(a, b){ return b.tecnica.valor - a.tecnica.valor; }).slice(0, 15).map(function(d){
            var p = d.tecnica.precio;
            var cifra = (p && p.tipo === 'suerte')
              ? [p.bajo, p.media, p.alto].filter(function(x){ return x != null; })
                  .map(function(x){ return x.toFixed(0); }).join(' / ') + ' ' + (p.moneda === 'EUR' ? '€' : p.moneda)
              : d.tecnica.valor.toFixed(2) + ' €';
            return '<div class="trk" data-disco="' + d.id + '" style="cursor:pointer"><span class="nm">' + esc(d.titulo)
              + '<span style="color:var(--txt3)"> · ' + esc(d.artista) + '</span></span>'
              + '<span class="dur">' + cifra + '</span></div>';
          }).join('') + '</div>'
      : '<div class="tl-empty">Todavía no hay precios. Abre fichas de discos para que se consulten en Discogs, '
        + 'o pulsa el botón de abajo para revisarlos todos.</div>');
  var pie = '<span></span><button type="button" class="btn pri" id="valTodos">' + (con.length ? 'Actualizar precios' : 'Consultar precios') + '</button>';
  var s = sheet('Valor de la colección', body, pie, true);
  if(con.length){
    var cEvol = document.createElement('div');
    s.querySelector('.sheet-bd').appendChild(cEvol);
    pintaEvolucionValor(cEvol, suma, con.length);
  }
  s.querySelectorAll('[data-disco]').forEach(function(el){
    el.onclick = function(){ s.remove(); openDetail(el.dataset.disco); };
  });
  s.querySelector('#valTodos').onclick = function(){
    if(!hayDiscogs()){ toast('Configura antes tu token de Discogs', true); return; }
    var pendientes = ds.filter(function(d){ return !d.tecnica || d.tecnica.valor == null || precioCaducado(d); });
    if(!pendientes.length){ toast('Ya están todos consultados y al día'); return; }
    s.remove();
    consultarPrecios(pendientes);
  };
}
async function consultarPrecios(lista){
  cancelBulk = false;
  bulk = {done:0, total:lista.length, ok:0, actual:''};
  setView('col');
  paintBanner();
  var conNiveles = 0;
  for(var i = 0; i < lista.length; i++){
    if(cancelBulk) break;
    bulk.actual = lista[i].artista + ' — ' + lista[i].titulo;
    paintBanner();
    try{
      var p = await cargarPrecios(lista[i]);
      bulk.ok++;
      if(p.tipo === 'suerte') conNiveles++;
    }catch(e){}
    bulk.done++;
    paintBanner();
  }
  bulk = null;
  renderAll();
  toast('Precios consultados en ' + lista.length + ' discos'
    + (conNiveles ? ' · ' + conNiveles + ' con los tres niveles' : ''));
}

/* ============================================================
   22. INVENTARIO POR UBICACIÓN
   ============================================================ */
function inventarioUbicaciones(){
  var ds = coleccion();
  var por = {};
  ds.forEach(function(d){ (por[d.ubicacion || 'Sin ubicar'] = por[d.ubicacion || 'Sin ubicar'] || []).push(d); });
  var claves = Object.keys(por).sort(function(a, b){
    if(a === 'Sin ubicar') return 1;
    if(b === 'Sin ubicar') return -1;
    return a.localeCompare(b, 'es');
  });
  var html = '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Inventario · Discoteca</title><style>'
    + 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;margin:0;padding:34px;color:#111}'
    + 'h1{font-size:27px;margin:0 0 3px;letter-spacing:-.02em}.meta{color:#666;font-size:13px;margin-bottom:24px}'
    + 'h2{font-size:16px;margin:24px 0 8px;padding-bottom:5px;border-bottom:2px solid #111;break-after:avoid}'
    + 'table{width:100%;border-collapse:collapse;font-size:12.5px}'
    + 'th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:#888;padding:5px 6px;border-bottom:1px solid #ddd}'
    + 'td{padding:5px 6px;border-bottom:1px solid #f0f0f0}tr{break-inside:avoid}'
    + '.f{width:52px;color:#666}.y{width:44px;color:#666}.n{width:34px;color:#999;text-align:right}'
    + '@media print{@page{margin:14mm}body{padding:0}}</style></head><body>'
    + '<h1>Inventario de la discoteca</h1><div class="meta">' + ds.length + ' discos · '
    + claves.length + ' ubicaciones · ' + new Date().toLocaleDateString('es-ES', {day:'numeric', month:'long', year:'numeric'}) + '</div>';
  claves.forEach(function(k){
    var lista = por[k].slice().sort(function(a, b){
      return (a.artista || '').localeCompare(b.artista || '', 'es') || String(a['año']).localeCompare(String(b['año']));
    });
    html += '<h2>' + esc(k) + ' <span style="color:#999;font-weight:400">· ' + lista.length + '</span></h2>'
      + '<table><tr><th class="n">#</th><th>Artista</th><th>Título</th><th class="f">Soporte</th><th class="y">Año</th><th>Sello</th></tr>'
      + lista.map(function(d, i){
          return '<tr><td class="n">' + (i + 1) + '</td><td>' + esc(d.artista) + '</td><td>' + esc(d.titulo)
            + '</td><td class="f">' + d.formato + '</td><td class="y">' + (d['año'] || '') + '</td><td>' + esc(d.sello || '') + '</td></tr>';
        }).join('') + '</table>';
  });
  html += '</body></html>';
  var w = window.open('', '_blank');
  if(!w){ download('inventario-discoteca.html', html, 'text/html;charset=utf-8'); toast('Inventario descargado'); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(function(){ try{ w.print(); }catch(e){} }, 800);
}

/* ============================================================
   23. PANTALLA DE ARTISTA
   ============================================================ */
function verArtista(nombre){
  if(!nombre) return;
  var mios = DB.discos.filter(function(d){ return plain(d.artista) === plain(nombre); });
  var enCol = mios.filter(function(d){ return d.lista !== 'deseos'; });
  var enDes = mios.filter(function(d){ return d.lista === 'deseos'; });
  var escuchas = enCol.reduce(function(a, d){ return a + totalEscuchas(d); }, 0);
  var valorados = enCol.filter(function(d){ return d.valoracion; });
  var media = valorados.length ? (valorados.reduce(function(a, d){ return a + d.valoracion; }, 0) / valorados.length) : 0;
  var anios = enCol.map(function(d){ return parseInt(d['año']); }).filter(function(y){ return y > 1900; });
  var rango = anios.length ? (Math.min.apply(null, anios) + (Math.max.apply(null, anios) !== Math.min.apply(null, anios)
    ? '–' + Math.max.apply(null, anios) : '')) : '';
  var paisArt = '';
  enCol.some(function(d){ if(d.pais){ paisArt = d.pais; return true; } });

  var body =
    '<div class="arthd">'
      + '<div class="artav">' + (enCol[0] && enCol[0].portada
          ? '<img src="' + esc(enCol[0].portada) + '" alt="" data-img-error="remove">' : I.user) + '</div>'
      + '<div class="artinfo"><div class="artn">' + esc(nombre) + '</div>'
      + '<div class="artd">' + [enCol.length + (enCol.length === 1 ? ' disco' : ' discos'), rango,
          escuchas ? escuchas + (escuchas === 1 ? ' escucha' : ' escuchas') : ''].filter(Boolean).join(' · ') + '</div>'
      + (media ? '<div style="margin-top:7px">' + estrellasHtml(Math.round(media))
          + '<span style="font-size:12.5px;color:var(--txt2);margin-left:7px">' + media.toFixed(1) + ' de media</span></div>' : '')
      + '</div></div>'
    + '<div class="rowb" style="margin-bottom:18px">'
      + '<button type="button" class="btn sm" id="aWiki">' + I.libro + 'Quién es</button>'
      + '<button type="button" class="btn sm" id="aCol">' + I.layers + 'Ver en la colección</button>'
      + (enCol.length ? '<button type="button" class="btn sm" id="aAzar">' + I.aleatorio + 'Uno al azar</button>' : '')
    + '</div>'
    + '<div id="aWikiBody"></div>'
    + '<div class="tl-hd"><h4>Discografía</h4><span class="n" id="aCuenta">buscando…</span></div>'
    + '<div id="aDisco"><div class="grid paisgrid">' + enCol.slice().sort(function(a, b){
        return String(a['año']).localeCompare(String(b['año']));
      }).map(function(d){ return tileHtml(d, null); }).join('') + '</div></div>'
    + (enDes.length ? '<div class="tl-hd" style="margin-top:20px"><h4>En tu lista de deseos</h4></div>'
        + '<div class="grid paisgrid">' + enDes.map(function(d){ return tileHtml(d, null); }).join('') + '</div>' : '');

  var s = sheet(nombre, body, null, true);
  enlazarTiles(s, null);
  s.querySelector('#aWiki').onclick = function(){ verWikipedia({artista:nombre, titulo:''}, false); };
  s.querySelector('#aCol').onclick = function(){
    fArt = nombre; grupo = 'none';
    var g = document.getElementById('selGroup');
    if(g) g.value = 'none';
    s.remove(); setView('col'); paintCol();
  };
  if(s.querySelector('#aAzar')) s.querySelector('#aAzar').onclick = function(){
    var x = enCol[Math.floor(Math.random() * enCol.length)];
    s.remove(); openDetail(x.id);
  };

  /* discografía completa: lo que tienes en color, lo que falta en gris */
  huecosArtista(nombre).then(function(rgs){
    if(!document.body.contains(s) || !rgs.length) return;
    var idxMios = {};
    mios.forEach(function(d){ idxMios[plain(d.titulo)] = d; });
    var tengo = rgs.filter(function(r){ return r.tengo; }).length;
    s.querySelector('#aCuenta').textContent = 'tienes ' + tengo + ' de ' + rgs.length + ' álbumes de estudio';
    setTimeout(function(){ portadasQueFaltan(s); }, 200);
    s.querySelector('#aDisco').innerHTML = '<div class="grid paisgrid discog">' + rgs.map(function(r){
      var mio = idxMios[plain(r.titulo)];
      if(mio) return tileHtml(mio, null);
      return '<div class="tile falta" data-falta="' + esc(r.titulo) + '" data-anio="' + esc(r['año'])
        + '" data-rg="' + esc(r.id) + '">'
        + '<div class="art">' + I.disc + (readOnly ? '' : '<button type="button" class="addw" data-tip="Añadir a deseos">'
          + I.heart + '</button>') + '</div>'
        + '<div class="meta"><div class="t">' + esc(r.titulo) + '</div>'
        + '<div class="a">No lo tienes</div>'
        + '<div class="y"><span class="txt">' + (r['año'] || '') + '</span></div></div></div>';
    }).join('') + '</div>';
    enlazarTiles(s, null);
    var alDeseos = function(b){
      b.onclick = function(e){
        e.stopPropagation();
        var t = b.closest('.falta');
        DB.discos.push(normDisc({
          id: uid(), lista:'deseos', artista: nombre,
          titulo: t.dataset.falta, 'año': t.dataset.anio, formato:'Vinilo', fechaAlta: nowISO()
        }));
        persist();
        b.outerHTML = '<span class="pill" style="background:rgba(175,82,222,.94);color:#fff;left:8px;top:8px">DESEOS</span>';
        toast('«' + t.dataset.falta + '» añadido a deseos');
      };
    };
    s.querySelectorAll('.falta .addw').forEach(alDeseos);
    s.querySelectorAll('.falta').forEach(function(el){ el._addw = alDeseos; });
    montarAyudas(s);
  }).catch(function(){
    if(document.body.contains(s)) s.querySelector('#aCuenta').textContent = enCol.length + ' en tu colección';
  });
}

/* ---------- créditos pulsables ---------- */
function discosDe(rol, quien){
  var out = [];
  coleccion().forEach(function(d){
    var c = (d.extra && d.extra.creditos) || {};
    var t = (d.tecnica && d.tecnica.creditos) || {};
    var m = (d.tecnica && d.tecnica.companias) || {};
    var todos = [];
    Object.keys(c).forEach(function(k){ todos.push(c[k]); });
    Object.keys(t).forEach(function(k){ todos.push(t[k]); });
    Object.keys(m).forEach(function(k){ todos.push(m[k]); });
    if(todos.join(', ').indexOf(quien) >= 0) out.push(d);
  });
  return out;
}
function verCredito(rol, quien){
  var ds = discosDe(rol, quien);
  if(ds.length < 1) return;
  var s = sheet(quien,
    '<div class="arthd"><div class="artav">' + I.personas + '</div>'
    + '<div class="artinfo"><div class="artn">' + esc(quien) + '</div>'
    + '<div class="artd">' + esc(rol) + ' · ' + ds.length + (ds.length === 1 ? ' disco tuyo' : ' discos tuyos') + '</div></div></div>'
    + '<div class="grid paisgrid">' + ds.map(function(d){ return tileHtml(d, null); }).join('') + '</div>', null, true);
  enlazarTiles(s, null);
}

/* ============================================================
   23. QUIZ, EFEMÉRIDES Y HORAS DE AGUJA
   ============================================================ */
function preguntasQuiz(){
  var ds = coleccion();
  if(ds.length < 8) return [];
  var cuenta = function(fn){
    var m = {};
    ds.forEach(function(d){ var k = fn(d); if(k) m[k] = (m[k] || 0) + 1; });
    return Object.keys(m).map(function(k){ return {k:k, v:m[k]}; }).sort(function(a, b){ return b.v - a.v; });
  };
  var sueltas = function(lista, correcta, n){
    var out = [correcta];
    var pool = lista.filter(function(x){ return x !== correcta; });
    while(out.length < (n || 4) && pool.length){
      out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return rngShuffle(out, Date.now() % 9973);
  };
  var qs = [];
  var art = cuenta(function(d){ return d.artista; });
  if(art.length > 4 && art[0].v > 1) qs.push({
    p:'¿De qué artista tienes más discos?',
    ok:art[0].k, ops:sueltas(art.slice(0, 9).map(function(x){ return x.k; }), art[0].k),
    pie:art[0].v + ' discos, ' + (art[0].v - (art[1] ? art[1].v : 0)) + ' más que el siguiente'
  });
  var sel = cuenta(function(d){ return d.sello; });
  if(sel.length > 4 && sel[0].v > 1) qs.push({
    p:'¿Qué sello se repite más en tu estantería?',
    ok:sel[0].k, ops:sueltas(sel.slice(0, 9).map(function(x){ return x.k; }), sel[0].k),
    pie:sel[0].v + ' referencias'
  });
  var anios = cuenta(function(d){ return d['año']; });
  if(anios.length > 4) qs.push({
    p:'¿Qué año está más representado en tu colección?',
    ok:anios[0].k, ops:sueltas(anios.slice(0, 10).map(function(x){ return x.k; }), anios[0].k),
    pie:anios[0].v + ' discos de ese año'
  });
  var viejo = ds.filter(function(d){ return parseInt(d['año']) > 1900; })
    .sort(function(a, b){ return parseInt(a['año']) - parseInt(b['año']); })[0];
  if(viejo) qs.push({
    p:'¿Cuál es el disco más antiguo que tienes?',
    ok:viejo.titulo, ops:sueltas(ds.slice(0, 30).map(function(x){ return x.titulo; }), viejo.titulo),
    pie:'De ' + viejo['año'] + ', de ' + viejo.artista
  });
  var nv = ds.filter(function(d){ return d.formato === 'Vinilo'; }).length;
  qs.push({
    p:'¿Cuántos vinilos tienes?',
    ok:String(nv),
    ops:rngShuffle([String(nv), String(nv + 7 + Math.floor(Math.random() * 9)),
      String(Math.max(1, nv - 6 - Math.floor(Math.random() * 9))), String(nv + 18)], Date.now() % 7919),
    pie:'De ' + ds.length + ' discos, ' + Math.round(nv / ds.length * 100) + '% en vinilo'
  });
  var largo = ds.filter(function(d){ return d.tracklist.length; })
    .sort(function(a, b){ return b.tracklist.length - a.tracklist.length; })[0];
  if(largo && largo.tracklist.length > 12) qs.push({
    p:'¿Qué disco tuyo tiene más canciones?',
    ok:largo.titulo, ops:sueltas(ds.filter(function(x){ return x.tracklist.length > 8; })
      .slice(0, 20).map(function(x){ return x.titulo; }), largo.titulo),
    pie:largo.tracklist.length + ' temas'
  });
  var pais = cuenta(function(d){ return d.pais; }).filter(function(x){ return PAISES[x.k]; });
  if(pais.length > 3) qs.push({
    p:'¿De dónde viene la mayoría de tus prensados?',
    ok:nombrePais(pais[0].k), ops:sueltas(pais.slice(0, 8).map(function(x){ return nombrePais(x.k); }), nombrePais(pais[0].k)),
    pie:pais[0].v + ' discos prensados allí'
  });
  var gen = cuenta(function(d){ return d.genero; });
  if(gen.length > 4) qs.push({
    p:'¿Cuál es tu género con más discos?',
    ok:gen[0].k, ops:sueltas(gen.slice(0, 8).map(function(x){ return x.k; }), gen[0].k),
    pie:gen[0].v + ' discos'
  });
  var esc = ds.filter(function(d){ return totalEscuchas(d) > 0; })
    .sort(function(a, b){ return totalEscuchas(b) - totalEscuchas(a); })[0];
  if(esc && totalEscuchas(esc) > 1) qs.push({
    p:'¿Qué disco has puesto más veces?',
    ok:esc.titulo, ops:sueltas(ds.slice(0, 25).map(function(x){ return x.titulo; }), esc.titulo),
    pie:totalEscuchas(esc) + ' escuchas registradas'
  });
  return qs;
}
function pintaQuiz(caja){
  if(!caja) return;
  var qs = preguntasQuiz();
  if(!qs.length){ caja.innerHTML = ''; return; }
  var i = Math.floor(Math.random() * qs.length);
  var pinta = function(){
    var q = qs[i];
    caja.innerHTML = '<div class="quiz"><div class="qp">' + I.pregunta + '<span>' + esc(q.p) + '</span>'
      + '<button type="button" class="otro" id="otraQ" data-tip="Otra pregunta">' + I.refresh + '</button></div>'
      + '<div class="qops">' + q.ops.map(function(o){
          return '<button type="button" class="qop" data-o="' + esc(o) + '">' + esc(o) + '</button>';
        }).join('') + '</div><div class="qpie" id="qpie"></div></div>';
    caja.querySelector('#otraQ').onclick = function(){
      i = (i + 1 + Math.floor(Math.random() * (qs.length - 1))) % qs.length;
      pinta();
    };
    caja.querySelectorAll('.qop').forEach(function(b){
      b.onclick = function(){
        var acierto = b.dataset.o === String(q.ok);
        caja.querySelectorAll('.qop').forEach(function(x){
          x.disabled = true;
          if(x.dataset.o === String(q.ok)) x.classList.add('ok');
          else if(x === b) x.classList.add('mal');
        });
        caja.querySelector('#qpie').innerHTML = (acierto ? '<b>Bien.</b> ' : '<b>Casi.</b> Era ' + esc(q.ok) + '. ')
          + esc(q.pie || '');
      };
    });
    montarAyudas(caja);
  };
  pinta();
}

/* ---------- efemérides ---------- */
function efemerides(){
  var hoy = new Date();
  var mm = ('0' + (hoy.getMonth() + 1)).slice(-2), dd = ('0' + hoy.getDate()).slice(-2);
  var anio = hoy.getFullYear();
  var out = [];
  coleccion().forEach(function(d){
    var f = d.extra && d.extra.primera ? d.extra.primera : (d.extra && d.extra.fecha ? d.extra.fecha : '');
    if(f && f.length === 10 && f.slice(5) === mm + '-' + dd){
      var años = anio - parseInt(f.slice(0, 4));
      if(años > 0) out.push({d:d, tipo:'dia', años:años, txt:'se publicó hoy hace <b>' + años + ' años</b>'});
    }
  });
  if(!out.length){
    coleccion().forEach(function(d){
      var y = parseInt(d['año']);
      if(!y) return;
      var años = anio - y;
      if([25, 30, 40, 50, 20, 35, 45].indexOf(años) >= 0) out.push({d:d, tipo:'redondo', años:años,
        txt:'cumple <b>' + años + ' años</b> este ' + anio});
    });
  }
  return out;
}
function pintaEfemeride(caja){
  if(!caja) return;
  var lista = efemerides();
  if(!lista.length){ caja.innerHTML = ''; return; }
  var e = lista[Math.floor(Math.random() * lista.length)];
  var d = e.d;
  caja.innerHTML = '<div class="efem" data-disco="' + d.id + '">'
    + '<div class="efp">' + (d.portada ? '<img src="' + esc(d.portada) + '" alt="" data-img-error="remove">' : I.disc) + '</div>'
    + '<div class="eft"><div class="k">' + (e.tipo === 'dia' ? 'Un tal día como hoy' : 'Aniversario') + '</div>'
    + '<div class="v"><b>' + esc(d.titulo) + '</b>, de ' + esc(d.artista) + ', ' + e.txt + '.</div>'
    + (lista.length > 1 ? '<div class="s">Y ' + (lista.length - 1) + ' más en tu colección</div>' : '') + '</div>'
    + '<div class="efb">' + I.cal + '</div></div>';
  caja.querySelector('.efem').onclick = function(){ openDetail(d.id); };
}

/* ---------- horas de aguja ---------- */
var K_AGUJA = 'discoteca.aguja';
function datosAguja(){
  try{ return JSON.parse(localStorage.getItem(K_AGUJA) || '{}'); }catch(e){ return {}; }
}
function guardarAguja(o){
  try{ localStorage.setItem(K_AGUJA, JSON.stringify(o)); }catch(e){}
}
function horasAguja(){
  var cfg = datosAguja();
  var desde = cfg.desde || '';
  var seg = 0, estimados = 0, n = 0;
  coleccion().filter(function(d){ return d.formato === 'Vinilo'; }).forEach(function(d){
    var dur = 0, tiene = false;
    d.tracklist.forEach(function(t){
      var m = String(t.duracion || '').match(/^(\d+):(\d{2})$/);
      if(m){ dur += (+m[1]) * 60 + (+m[2]); tiene = true; }
    });
    (d.escuchasFechas || []).forEach(function(f){
      if(desde && f < desde) return;
      n++;
      if(tiene) seg += dur;
      else{ seg += 40 * 60; estimados++; }
    });
  });
  return {horas: seg / 3600, escuchas: n, estimados: estimados, desde: desde,
    limite: cfg.limite || 1000, historial: cfg.historial || []};
}
function tarjetaAguja(){
  var a = horasAguja();
  var pct = Math.min(1, a.horas / a.limite);
  var color = pct > 0.9 ? 'var(--red)' : (pct > 0.7 ? 'var(--orange)' : 'var(--green)');
  return '<div class="card"><h3>Horas de aguja</h3>'
    + '<div class="sub">Solo cuentan los vinilos que marcas como escuchados</div>'
    + '<div class="aguja">'
      + '<div class="agn" style="color:' + color + '">' + a.horas.toFixed(1) + '<small>h</small></div>'
      + '<div class="agb"><div style="width:' + (pct * 100).toFixed(1) + '%;background:' + color + '"></div></div>'
      + '<div class="ags">de las ' + a.limite + ' h recomendadas · ' + a.escuchas
      + (a.escuchas === 1 ? ' escucha' : ' escuchas') + (a.estimados ? ' · ' + a.estimados + ' estimadas' : '') + '</div>'
    + '</div>'
    + (pct > 0.9 ? '<div class="warnb" style="margin:14px 0 0">' + I.warn
        + '<span>Te acercas al límite recomendado. Toca pensar en una aguja nueva.</span></div>' : '')
    + '<div class="rowb" style="margin-top:14px"><button type="button" class="btn sm" data-a="agujaNueva">' + I.refresh + 'He cambiado la aguja</button>'
    + '<button type="button" class="btn sm" data-a="agujaCfg">Ajustar</button></div>'
    + (a.historial.length ? '<div class="creds" style="margin-top:14px">'
        + a.historial.slice().reverse().slice(0, 4).map(function(x){
            return '<div class="cred"><span class="k">' + fdate(x.fecha).split(',')[0] + '</span>'
              + '<span class="v">' + x.horas.toFixed(1) + ' h de uso</span></div>';
          }).join('') + '</div>' : '')
    + '</div>';
}
function agujaNueva(){
  var a = horasAguja();
  if(!confirm('¿Marcar que has puesto una aguja nueva?\n\nEl contador vuelve a cero y se guardan las '
      + a.horas.toFixed(1) + ' horas de la anterior.')) return;
  var cfg = datosAguja();
  cfg.historial = (cfg.historial || []).concat([{fecha: nowISO(), horas: a.horas}]).slice(-12);
  cfg.desde = hoyISO();
  guardarAguja(cfg);
  toast('Aguja nueva · contador a cero');
  paintStats();
}
function agujaAjustes(){
  var cfg = datosAguja();
  var s = sheet('Horas de aguja',
    '<div class="warnb info">' + I.info + '<span>Se suman las duraciones de los vinilos que marcas como escuchados. '
    + 'Los que no tienen duraciones cuentan 40 minutos.</span></div>'
    + '<div class="group">'
    + '<div class="grow"><label>Aviso a las</label><input id="agL" type="number" min="100" step="50" value="'
      + (cfg.limite || 1000) + '"><span style="color:var(--txt2);font-size:14px">h</span></div>'
    + '<div class="grow"><label>Contar desde</label><input id="agD" type="date" value="' + esc(cfg.desde || '') + '"></div>'
    + '</div>',
    '<span></span><button type="button" class="btn pri" id="agOk">Guardar</button>');
  s.querySelector('#agOk').onclick = function(){
    cfg.limite = Math.max(100, parseInt(s.querySelector('#agL').value) || 1000);
    cfg.desde = s.querySelector('#agD').value || '';
    guardarAguja(cfg);
    s.remove();
    paintStats();
    toast('Guardado');
  };
}

/* ---------- tus canciones favoritas ---------- */
function tarjetaFavoritas(){
  var favs = [];
  coleccion().forEach(function(d){
    (d.tracklist || []).forEach(function(t){ if(t.fav) favs.push({t:t, d:d}); });
  });
  if(!favs.length) return '';
  var porDisco = {};
  favs.forEach(function(x){ porDisco[x.d.id] = (porDisco[x.d.id] || 0) + 1; });
  var top = Object.keys(porDisco).sort(function(a, b){ return porDisco[b] - porDisco[a]; })[0];
  var td = DB.discos.filter(function(x){ return x.id === top; })[0];
  return '<div class="card"><h3>Tus canciones</h3>'
    + '<div class="sub">' + favs.length + ' marcadas con corazón'
    + (td ? ' · el disco con más es ' + esc(td.titulo) : '') + '</div>'
    + '<div class="tl">' + favs.slice(0, 14).map(function(x){
        return '<div class="trk" data-disco="' + x.d.id + '" style="cursor:pointer">'
          + '<span class="nm">' + esc(x.t.titulo) + '<span style="color:var(--txt3)"> · ' + esc(x.d.artista) + '</span></span>'
          + '<a class="lyr" target="_blank" rel="noopener" href="' + esc(urlLetra(x.d.artista, x.t.titulo)) + '">'
          + I.letra + '</a></div>';
      }).join('') + '</div>'
    + (favs.length > 14 ? '<div class="sub" style="margin:10px 0 0">y ' + (favs.length - 14) + ' más</div>' : '')
    + '</div>';
}

/* ---------- quién está detrás ---------- */
function tarjetaQuien(){
  var m = {};
  coleccion().forEach(function(d){
    nombresDeCreditos(d).forEach(function(x){
      var k = x.rol + '|' + x.n;
      m[k] = (m[k] || 0) + 1;
    });
  });
  var lista = Object.keys(m).map(function(k){
    var p = k.split('|');
    return {rol:p[0], n:p[1], v:m[k]};
  }).filter(function(x){ return x.v > 1 && !/copyright/i.test(x.rol); })
    .sort(function(a, b){ return b.v - a.v; }).slice(0, 10);
  if(!lista.length) return '';
  return '<div class="card"><h3>Quién está detrás</h3>'
    + '<div class="sub">Nombres que se repiten en los créditos de tus discos</div>'
    + '<div class="tl">' + lista.map(function(x){
        return '<div class="trk credfila" data-rol="' + esc(x.rol) + '" data-quien="' + esc(x.n) + '" style="cursor:pointer">'
          + '<span class="nm">' + esc(x.n) + '<span style="color:var(--txt3)"> · ' + esc(x.rol) + '</span></span>'
          + '<span class="dur">' + x.v + '</span></div>';
      }).join('') + '</div></div>';
}
function nombresDeCreditos(d){
  var out = [];
  if(d.extra && d.extra.creditos) Object.keys(d.extra.creditos).forEach(function(k){
    String(d.extra.creditos[k]).split(/,\s*/).forEach(function(x){ if(x) out.push({rol:k, n:x.trim()}); });
  });
  if(d.tecnica) ['companias', 'creditos'].forEach(function(g){
    if(!d.tecnica[g]) return;
    Object.keys(d.tecnica[g]).forEach(function(k){
      String(d.tecnica[g][k]).split(/,\s*/).forEach(function(x){ if(x) out.push({rol:k, n:x.trim()}); });
    });
  });
  return out;
}

/* ---------- tu colección en el tiempo ---------- */
function tarjetaTiempo(){
  var ds = coleccion();
  var pub = {}, com = {};
  ds.forEach(function(d){
    var y = parseInt(d['año']);
    if(y > 1900) pub[y] = (pub[y] || 0) + 1;
    var c = d.fechaCompra ? parseInt(d.fechaCompra.slice(0, 4)) : 0;
    if(c > 1900) com[c] = (com[c] || 0) + 1;
  });
  var años = Object.keys(pub).map(Number);
  if(años.length < 4) return '';
  var min = Math.min.apply(null, años), max = Math.max.apply(null, años);
  var serie = [];
  for(var y = min; y <= max; y++) serie.push({k:String(y), a:pub[y] || 0, b:com[y] || 0});
  var hayCompras = Object.keys(com).length > 2;
  var W = 640, H = 190, pad = 28;
  var maxV = Math.max.apply(null, serie.map(function(x){ return Math.max(x.a, x.b); })) || 1;
  var px = function(i){ return pad + i * (W - pad * 2) / Math.max(1, serie.length - 1); };
  var py = function(v){ return H - (v / maxV) * (H - 30); };
  var linea = function(campo){
    return serie.map(function(x, i){ return (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(x[campo]).toFixed(1); }).join(' ');
  };
  var svg = '<svg class="chart" viewBox="0 0 ' + W + ' ' + (H + 26) + '">'
    + '<line class="axis" x1="' + pad + '" y1="' + H + '" x2="' + (W - pad) + '" y2="' + H + '"/>'
    + '<path d="' + linea('a') + ' L' + px(serie.length - 1).toFixed(1) + ' ' + H + ' L' + pad + ' ' + H + ' Z" fill="var(--blue)" opacity=".12"/>'
    + '<path d="' + linea('a') + '" fill="none" stroke="var(--blue)" stroke-width="2.4" stroke-linejoin="round"/>'
    + (hayCompras ? '<path d="' + linea('b') + '" fill="none" stroke="var(--green)" stroke-width="2.2" stroke-dasharray="5 4"/>' : '');
  [0, Math.floor(serie.length / 2), serie.length - 1].forEach(function(i){
    if(serie[i]) svg += '<text x="' + px(i).toFixed(1) + '" y="' + (H + 16) + '" text-anchor="middle">' + serie[i].k + '</text>';
  });
  svg += '</svg>';
  return '<div class="card full"><h3>Tu colección en el tiempo</h3>'
    + '<div class="sub">Cuándo se publicaron tus discos' + (hayCompras ? ' y cuándo los compraste' : '') + '</div>'
    + '<div class="chartwrap">' + svg + '</div>'
    + '<div class="legend"><div class="lg"><i style="background:var(--blue)"></i>Publicación</div>'
    + (hayCompras ? '<div class="lg"><i style="background:var(--green)"></i>Compra</div>' : '') + '</div></div>';
}

/* ---------- los que llevas más tiempo sin poner ---------- */
function tarjetaOlvidados(){
  var ds = coleccion();
  var conFecha = ds.map(function(d){
    var u = d.ultimaEscucha || '';
    return {d:d, u:u, dias: u ? Math.floor((Date.now() - new Date(u + 'T12:00:00').getTime()) / 86400000) : null};
  });
  var nunca = conFecha.filter(function(x){ return x.dias === null; });
  var viejos = conFecha.filter(function(x){ return x.dias !== null; })
    .sort(function(a, b){ return b.dias - a.dias; }).slice(0, 6);
  var lista = viejos.concat(rngShuffle(nunca, Date.now() % 6151).slice(0, Math.max(0, 8 - viejos.length)));
  if(!lista.length) return '';
  return '<div class="card"><h3>Llevan tiempo sin sonar</h3>'
    + '<div class="sub">' + (nunca.length ? nunca.length + ' discos sin estrenar. ' : '') + 'Quizá toque rescatar alguno</div>'
    + '<div class="olv">' + lista.map(function(x){
        return '<div class="olvt" data-disco="' + x.d.id + '">'
          + '<div class="olva">' + coverHtml(x.d) + '</div>'
          + '<div class="olvn">' + esc(x.d.titulo) + '</div>'
          + '<div class="olvd">' + (x.dias === null ? 'nunca' : (x.dias > 365
              ? Math.floor(x.dias / 365) + (Math.floor(x.dias / 365) === 1 ? ' año' : ' años')
              : x.dias + ' días')) + '</div></div>';
      }).join('') + '</div></div>';
}

/* Trae las portadas de los álbumes que no tienes, poco a poco y sin guardarlas */
function portadasQueFaltan(s){
  var pend = [].slice.call(s.querySelectorAll('.tile.falta[data-rg]')).filter(function(el){
    return el.dataset.rg && !el.dataset.hecho;
  });
  var i = 0;
  var siguiente = function(){
    if(i >= pend.length || !document.body.contains(s)) return;
    var el = pend[i++];
    el.dataset.hecho = '1';
    var url = 'https://coverartarchive.org/release-group/' + el.dataset.rg + '/front-250';
    var img = new Image();
    img.onload = function(){
      if(!document.body.contains(el)) return;
      var art = el.querySelector('.art');
      if(art) art.innerHTML = '<img src="' + url + '" alt="" loading="lazy">'
        + (art.querySelector('.addw') ? art.querySelector('.addw').outerHTML : '');
      var b = el.querySelector('.addw');
      if(b && el._addw) el._addw(b);
      setTimeout(siguiente, 60);
    };
    img.onerror = function(){ setTimeout(siguiente, 40); };
    img.src = url;
  };
  for(var k = 0; k < 3; k++) setTimeout(siguiente, k * 120);
}

/* ============================================================
   24. IMAGEN DEL SOPORTE: FOTO REAL O REPRESENTACIÓN
   ============================================================ */
/* Dibuja un vinilo o un CD usando la propia portada como etiqueta central */
function soporteGenerado(d){
  var vin = d.formato === 'Vinilo';
  var id = 'sg' + d.id;
  var img = d.portada ? '<image href="' + esc(d.portada) + '" x="0" y="0" width="400" height="400"'
    + ' preserveAspectRatio="xMidYMid slice" clip-path="url(#' + id + ')"/>' : '';
  if(vin){
    return '<svg viewBox="0 0 400 400" class="sopgen">'
      + '<defs><clipPath id="' + id + '"><circle cx="200" cy="200" r="74"/></clipPath>'
      + '<radialGradient id="' + id + 'g" cx="38%" cy="30%" r="75%">'
      + '<stop offset="0%" stop-color="#3a3a42"/><stop offset="45%" stop-color="#17171c"/>'
      + '<stop offset="100%" stop-color="#0a0a0d"/></radialGradient></defs>'
      + '<circle cx="200" cy="200" r="196" fill="url(#' + id + 'g)"/>'
      + (function(){
          var s = '';
          for(var r = 190; r > 82; r -= 5.5){
            s += '<circle cx="200" cy="200" r="' + r + '" fill="none" stroke="#ffffff" stroke-opacity="'
              + (r % 11 < 5.5 ? '.05' : '.09') + '" stroke-width="1"/>';
          }
          return s;
        })()
      + '<path d="M40 96A186 186 0 0 1 200 14" stroke="#fff" stroke-opacity=".35" stroke-width="10" fill="none" stroke-linecap="round"/>'
      + '<circle cx="200" cy="200" r="74" fill="#e8e4dc"/>' + img
      + '<circle cx="200" cy="200" r="74" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/>'
      + '<circle cx="200" cy="200" r="9" fill="#0a0a0d"/></svg>';
  }
  return '<svg viewBox="0 0 400 400" class="sopgen">'
    + '<defs><clipPath id="' + id + '"><circle cx="200" cy="200" r="150"/></clipPath>'
    + '<linearGradient id="' + id + 'c" x1="10%" y1="0%" x2="90%" y2="100%">'
    + '<stop offset="0%" stop-color="#ffffff"/><stop offset="22%" stop-color="#dde5ee"/>'
    + '<stop offset="42%" stop-color="#bccadb"/><stop offset="58%" stop-color="#eef3f8"/>'
    + '<stop offset="78%" stop-color="#b4c3d4"/><stop offset="100%" stop-color="#dfe7f0"/></linearGradient></defs>'
    + '<circle cx="200" cy="200" r="196" fill="url(#' + id + 'c)"/>'
    + '<circle cx="200" cy="200" r="150" fill="#f2f5f9"/>'
    + (d.portada ? '<g opacity=".92">' + img + '</g>' : '')
    + '<circle cx="200" cy="200" r="150" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="1.5"/>'
    + '<path d="M62 118A166 166 0 0 1 200 34" stroke="#fff" stroke-opacity=".8" stroke-width="12" fill="none" stroke-linecap="round"/>'
    + '<circle cx="200" cy="200" r="52" fill="#eef3f8"/>'
    + '<circle cx="200" cy="200" r="52" fill="none" stroke="rgba(0,0,0,.14)" stroke-width="1.5"/>'
    + '<circle cx="200" cy="200" r="22" fill="var(--elev)"/>'
    + '<circle cx="200" cy="200" r="22" fill="none" stroke="rgba(0,0,0,.14)" stroke-width="1.5"/></svg>';
}
/* Elegir a mano la foto del soporte entre las imágenes de Discogs */
/* ============================================================
   26. REPARAR LA BASE DE DATOS
   ============================================================ */
function analizarReparacion(){
  var ds = DB.discos;
  var out = {artistas:[], sellos:[], anios:[], enlaces:[]};
  /* variantes del mismo artista */
  var por = {};
  ds.forEach(function(d){
    if(!d.artista) return;
    var k = plain(d.artista);
    (por[k] = por[k] || []).push(d);
  });
  var nombres = {};
  ds.forEach(function(d){ if(d.artista) nombres[d.artista] = plain(d.artista); });
  var claves = Object.keys(por);
  claves.forEach(function(k){
    var variantes = {};
    por[k].forEach(function(d){ variantes[d.artista] = (variantes[d.artista] || 0) + 1; });
    var lista = Object.keys(variantes);
    if(lista.length > 1){
      var mejor = lista.sort(function(a, b){
        return (variantes[b] - variantes[a]) || (b.length - a.length);
      })[0];
      out.artistas.push({variantes:lista, mejor:mejor, n:por[k].length});
    }
  });
  /* variantes del mismo sello: A&M Records / A&M Records, Inc. / A&M Records / UMe */
  var raiz = function(s){
    return plain(String(s || '').split(/\s*\/\s*/)[0]
      .replace(/\b(records?|recordings?|inc|ltd|limited|s\.?a|s\.?l|gmbh|music|group|the|company|entertainment)\b/gi, ''));
  };
  var porRaiz = {};
  ds.forEach(function(d){
    if(!d.sello) return;
    var k = raiz(d.sello);
    if(k.length < 3) return;
    (porRaiz[k] = porRaiz[k] || {})[d.sello] = (porRaiz[k][d.sello] || 0) + 1;
  });
  out.sellosVar = [];
  Object.keys(porRaiz).forEach(function(k){
    var vs = Object.keys(porRaiz[k]);
    if(vs.length < 2) return;
    /* el nombre más usado, y a igualdad el más corto */
    var mejor = vs.sort(function(a, b){
      return (porRaiz[k][b] - porRaiz[k][a]) || (a.length - b.length);
    })[0];
    out.sellosVar.push({variantes:vs, mejor:mejor, n:vs.reduce(function(a, v){ return a + porRaiz[k][v]; }, 0)});
  });

  /* sellos con restos de Discogs */
  var sellosMal = {};
  ds.forEach(function(d){
    if(!d.sello) return;
    var limpio = limpiaSello(d.sello);
    if(limpio && limpio !== d.sello) sellosMal[d.sello] = limpio;
  });
  Object.keys(sellosMal).forEach(function(k){
    out.sellos.push({de:k, a:sellosMal[k], n:ds.filter(function(d){ return d.sello === k; }).length});
  });
  /* años imposibles */
  var anioAct = new Date().getFullYear();
  ds.forEach(function(d){
    var y = parseInt(d['año']);
    if(d['año'] && (isNaN(y) || y < 1900 || y > anioAct + 1)) out.anios.push({d:d, valor:d['año']});
  });
  /* ediciones del mismo álbum sin enlazar */
  var vistos = {};
  ds.forEach(function(d){
    if(d.enlazado || d.lista === 'deseos') return;
    var k = plain(d.artista) + '|' + plain(d.titulo);
    if(vistos[k]){
      if(vistos[k].formato !== d.formato) out.enlaces.push({a:vistos[k], b:d});
    }else vistos[k] = d;
  });
  /* enlaces de Discogs con el dominio duplicado, de una versión anterior con ese fallo */
  out.urlsRotas = ds.filter(function(d){ return String(d.discogs || '').indexOf('discogs.comhttps://') >= 0; });
  /* fotos del disco en http:// en vez de https:// */
  out.fotosHttp = ds.filter(function(d){ return String(d.fotoDisco || '').indexOf('http://') === 0; });
  /* dos ediciones enlazadas (formato distinto a propósito) que comparten el mismo
     identificador de MusicBrainz o el mismo código de barras: eso identifica una
     prensación física concreta, así que un CD y un vinilo no deberían compartirlo */
  out.idsCompartidos = [];
  var vistosLink = {};
  ds.forEach(function(d){
    if(!d.enlazado || vistosLink[d.id]) return;
    var otro = ds.filter(function(x){ return x.id === d.enlazado; })[0];
    if(!otro || otro.formato === d.formato) return;
    vistosLink[d.id] = vistosLink[otro.id] = 1;
    if(d.mbid && d.mbid === otro.mbid) out.idsCompartidos.push({a:d, b:otro, campo:'mbid'});
    if(d.codigoBarras && d.codigoBarras === otro.codigoBarras) out.idsCompartidos.push({a:d, b:otro, campo:'codigoBarras'});
  });
  return out;
}
/* ============================================================
   RADAR DE LA COLECCIÓN
   Un único sitio que agrega señales que ya se calculan por separado
   en otras pantallas, para no tener que visitar cuatro sitios distintos.
   No hace ninguna consulta nueva a ningún servidor: todo sale de datos
   que ya están cargados o de funciones que ya existían.
   ============================================================ */
function faltanCalculadosTexto(d){
  return calcularFaltan(d).join(', ');
}
function faltanDesactualizados(){
  return coleccion().filter(function(d){
    if(!fechaRevision(d)) return false;
    return String(d.faltan || '') !== faltanCalculadosTexto(d);
  });
}
function detalleDiagnosticoRadar(d){
  var diag = diagnosticarEdicion(d, null, null);
  var info = INFO_NIVEL_EDICION[diag.nivel];
  if(diag.problemas.length) return info[0] + ' · ' + diag.problemas[0];
  if(d.confianza === 'baja') return 'Coincidencia inicial marcada como dudosa';
  var faltan = [];
  if(!d.mbid) faltan.push('sin MusicBrainz');
  if(!d.discogs) faltan.push('sin Discogs');
  if(!d.codigoBarras) faltan.push('sin código');
  return info[0] + (faltan.length ? ' · ' + faltan.join(' · ') : '');
}
function resumenCalidadEdiciones(ds){
  var r = {solida:0, probable:0, parcial:0, revisar:0, contradictoria:0};
  ds.forEach(function(d){
    var n = diagnosticarEdicion(d, null, null).nivel;
    if(r[n] !== undefined) r[n]++;
  });
  return r;
}
function repararFaltanCache(lista, volver){
  if(!lista.length){ if(volver) volver(); return; }
  var body = '<div class="warnb info">' + I.info + '<span>Esto no cambia título, edición, portada ni ningún dato bibliográfico. '
    + 'Solo vuelve a calcular el texto interno <b>faltan</b> de fichas que ya habían sido revisadas.</span></div>'
    + '<div class="tl">' + lista.slice(0,40).map(function(d){
      var ahora = faltanCalculadosTexto(d);
      return '<div class="trk"><span class="nm">' + esc(d.titulo)
        + '<span style="color:var(--txt3)"> · ' + esc(d.artista) + '</span>'
        + '<span class="pfalta">Guardado: ' + esc(d.faltan || 'nada') + '</span>'
        + '<span class="pfalta">Actual: ' + esc(ahora || 'nada') + '</span></span></div>';
    }).join('') + '</div>'
    + (lista.length > 40 ? '<p style="font-size:12.5px;color:var(--txt3)">Y ' + (lista.length - 40) + ' más.</p>' : '');
  var pie = '<button type="button" class="btn" data-cancel>Cerrar</button>'
    + (readOnly ? '' : '<button type="button" class="btn pri" id="fixFaltan">Recalcular ' + lista.length + '</button>');
  var sh = sheet('Estado de revisión desactualizado', body, pie, true);
  sh.querySelector('[data-cancel]').onclick = function(){ sh.remove(); };
  var b = sh.querySelector('#fixFaltan');
  if(b) b.onclick = function(){
    lista.forEach(function(d){ d.faltan = faltanCalculadosTexto(d); });
    persist(true);
    sh.remove();
    toast('Estado de revisión actualizado');
    if(volver) volver();
  };
}
/* ============================================================
   RADAR DE LA COLECCIÓN
   Un único sitio que agrega señales que ya se calculan por separado
   en otras pantallas. No consulta servidores: usa solo la colección
   cargada y la misma lógica de diagnóstico que el Detective.
   ============================================================ */
function radarColeccion(){
  var ds = coleccion();
  var incompletas = ds.filter(function(d){ return faltaEsencial(d).length; });
  var reparar = analizarReparacion();
  var totalReparar = reparar.artistas.length + reparar.sellos.length + (reparar.sellosVar || []).length
    + reparar.anios.length + reparar.enlaces.length + (reparar.urlsRotas || []).length
    + (reparar.fotosHttp || []).length + (reparar.idsCompartidos || []).length;
  var sinFoto = ds.filter(function(d){ return !d.portada; });
  var dup = Object.keys(dupSet()).length;
  var deseos2 = deseos();
  var olvidados = ds.filter(function(d){
    return d.ultimaEscucha && (Date.now() - new Date(d.ultimaEscucha + 'T12:00:00').getTime()) > 180 * 86400000;
  });
  var diagnosticos = ds.map(function(d){ return {d:d, x:diagnosticarEdicion(d, null, null)}; });
  var contradictorias = diagnosticos.filter(function(x){ return x.x.nivel === 'contradictoria'; }).map(function(x){ return x.d; });
  var porConfirmar = diagnosticos.filter(function(x){
    return x.d.confianza === 'baja' || x.x.nivel === 'revisar' || x.x.nivel === 'parcial';
  }).map(function(x){ return x.d; }).filter(function(d){ return contradictorias.indexOf(d) < 0; });
  var calidad = resumenCalidadEdiciones(ds);
  var fotosViejas = ds.filter(fotoDiscoDesactualizada);
  var stale = faltanDesactualizados();
  var fallos = fallosGuardados();

  var fila = function(icono, titulo, n, detalle, accion){
    if(!n) return '';
    return '<button type="button" class="radaritem" data-accion="' + accion + '">'
      + '<div class="ri">' + icono + '</div>'
      + '<div class="rt"><div class="rn">' + titulo + '</div><div class="rd">' + detalle + '</div></div>'
      + '<div class="rv">' + n + '</div></button>';
  };
  var resumen = '<div class="creds" style="margin:0 0 14px">'
    + '<div class="cred"><span class="k">Identificación sólida</span><span class="v">' + calidad.solida + '</span></div>'
    + '<div class="cred"><span class="k">Probable</span><span class="v">' + calidad.probable + '</span></div>'
    + '<div class="cred"><span class="k">Parcial / sin confirmar</span><span class="v">' + (calidad.parcial + calidad.revisar) + '</span></div>'
    + '<div class="cred"><span class="k">Contradictoria</span><span class="v" style="color:' + (calidad.contradictoria ? 'var(--red)' : 'var(--green)') + '">' + calidad.contradictoria + '</span></div>'
    + '</div>';
  var nadaCritico = !incompletas.length && !totalReparar && !sinFoto.length && !dup
    && !contradictorias.length && !porConfirmar.length && !fotosViejas.length && !stale.length && !fallos.length;
  var body = resumen
    + (nadaCritico
      ? '<div class="warnb info">' + I.check + '<span>Tu colección está sana: sin fichas incompletas, contradicciones, '
        + 'duplicados, estados de revisión desactualizados ni fallos recientes.</span></div>'
      : '<p style="font-size:13.5px;color:var(--txt2);margin:0 0 4px">Lo que puede merecer tu atención, ordenado por tipo de problema.</p>')
    + '<div class="radarlist">'
    + fila(I.warn, 'Fichas incompletas', incompletas.length, 'Les falta algún dato esencial', 'revision')
    + fila(I.layers, 'Datos contradictorios', contradictorias.length, 'Código, catálogo, país o soporte no coinciden entre las fuentes disponibles', 'contradictorias')
    + fila(I.search, 'Identificación parcial o sin confirmar', porConfirmar.length, 'Falta evidencia suficiente o la coincidencia inicial fue dudosa', 'porconfirmar')
    + fila(I.spark, 'Cosas para reparar', totalReparar, 'Nombres, sellos, años o enlaces por limpiar', 'reparar')
    + fila(I.clock, 'Estado de revisión desactualizado', stale.length, 'El campo interno «faltan» ya no refleja los datos actuales', 'faltanstale')
    + fila(I.img, 'Sin portada', sinFoto.length, 'Discos sin ninguna imagen', 'sinfoto')
    + fila(I.copy, 'Posibles duplicados', dup, 'Fichas que podrían ser el mismo disco', 'dups')
    + fila(I.img, 'Foto del disco desactualizada', fotosViejas.length, 'Pertenece a otra edición de MusicBrainz distinta de la enlazada ahora', 'fotosviejas')
    + fila(I.reloj2, 'Llevan tiempo sin sonar', olvidados.length, 'Más de 6 meses sin marcar una escucha', 'olvidados')
    + fila(I.lampara, 'En tu lista de deseos', deseos2.length, 'Discos que buscas', 'deseos')
    + fila(I.bug || I.warn, 'Fallos recientes de la app', fallos.length, 'Registrados en Ajustes', 'fallos')
    + '</div>';
  var sh = sheet('Radar de la colección', body, null, true);
  sh.querySelectorAll('[data-accion]').forEach(function(b){
    b.onclick = function(){
      var a = b.dataset.accion;
      sh.remove();
      if(a === 'revision') pantallaRevision();
      else if(a === 'reparar') pantallaReparar();
      else if(a === 'dups'){
        fType = 'dup';
        document.querySelectorAll('#segType button').forEach(function(x){ x.className = x.dataset.f === 'dup' ? 'on' : ''; });
        setView('col'); paintCol();
      }else if(a === 'deseos') setView('wish');
      else if(a === 'fallos') setView('db');
      else if(a === 'sinfoto'){
        listaPendientesGenerica('Discos sin portada', sinFoto, function(){ return 'Sin imagen de portada'; });
      }else if(a === 'olvidados'){
        listaPendientesGenerica('Llevan tiempo sin sonar', olvidados, function(d){
          return d.ultimaEscucha ? 'Última escucha: ' + fdate(d.ultimaEscucha).split(',')[0] : 'Sin fecha de escucha';
        });
      }else if(a === 'contradictorias'){
        listaPendientesGenerica('Datos contradictorios', contradictorias, detalleDiagnosticoRadar);
      }else if(a === 'porconfirmar'){
        listaPendientesGenerica('Identificación parcial o sin confirmar', porConfirmar, detalleDiagnosticoRadar);
      }else if(a === 'fotosviejas'){
        listaPendientesGenerica('Foto del disco desactualizada', fotosViejas, function(d){
          return 'Foto: ' + (d.fotoDiscoMbid || 'edición anterior') + ' · ficha: ' + (d.mbid || 'sin MusicBrainz');
        });
      }else if(a === 'faltanstale'){
        repararFaltanCache(stale, radarColeccion);
      }
    };
  });
}
/* Lista simple y pulsable reutilizada por el Radar. detalleFn permite que
   cada señal explique SU problema concreto en vez de mostrar una fecha de
   escucha irrelevante para todos los casos. */
function listaPendientesGenerica(titulo, lista, detalleFn){
  var sh = sheet(titulo, '<div class="tl">' + lista.map(function(d){
    var detalle = detalleFn ? detalleFn(d) : '';
    return '<div class="trk" data-disco="' + d.id + '" style="cursor:pointer"><span class="nm">' + esc(d.titulo)
      + '<span style="color:var(--txt3)"> · ' + esc(d.artista) + '</span>'
      + (detalle ? '<span class="pfalta">' + esc(detalle) + '</span>' : '') + '</span></div>';
  }).join('') + '</div>');
  sh.querySelectorAll('[data-disco]').forEach(function(el){
    el.onclick = function(){ sh.remove(); openDetail(el.dataset.disco); };
  });
}

/* ============================================================
   QUÉ ESCUCHO AHORA (fusiona "no escuchados" y "sesión por tiempo")
   Construye una selección de discos que se ajusta al tiempo que
   digas, usando la duración real de sus pistas, con los filtros que
   elijas. Todo con datos que ya hay, sin ninguna consulta externa.
   ============================================================ */
function duracionSesion(d){
  var pistas = d.tracklist || [], seg = 0, completa = pistas.length > 0;
  pistas.forEach(function(t){
    var m = String(t.duracion || '').match(/^(\d+):([0-5]\d)$/);
    var dur = m ? (+m[1]) * 60 + (+m[2]) : 0;
    if(dur > 0 && Number.isSafeInteger(dur)) seg += dur;
    else completa = false;
  });
  return {segundos:seg, completa:completa && Number.isSafeInteger(seg)};
}
function duracionSegundos(d){ return duracionSesion(d).segundos; }
function candidatosSesion(filtro){
  var ds = coleccion();
  if(filtro === 'noescuchados') ds = ds.filter(function(d){ return totalEscuchas(d) === 0; });
  else if(filtro === 'favoritos') ds = ds.filter(function(d){ return d.valoracion >= 4; });
  else if(filtro === 'vinilo') ds = ds.filter(function(d){ return d.formato === 'Vinilo'; });
  else if(filtro === 'cd') ds = ds.filter(function(d){ return d.formato === 'CD'; });
  return ds;
}
/* Mochila por segundos: cada disco se usa una vez. El límite conserva el margen
   anterior, pero se compara el total de todas las combinaciones alcanzables.
   A igual distancia se prefiere no exceder el objetivo; a igual total, variedad. */
function construirSesion(minutos, filtro){
  var objetivo = minutos * 60;
  if(![20,30,45,60,90].includes(minutos)) return {discos:[], segundos:0, objetivo:objetivo};
  var candidatos = rngShuffle(candidatosSesion(filtro), Date.now() % 99991);
  var limite = Math.floor(objetivo + Math.max(300, objetivo * 0.12));
  var estados = new Array(limite + 1);
  estados[0] = {discos:[], artistas:[]};
  candidatos.forEach(function(d){
    var info = duracionSesion(d), dur = info.segundos, artista = plain(d.artista || '');
    if(!info.completa || dur > limite) return;
    for(var t = limite - dur; t >= 0; t--){
      var previo = estados[t];
      if(!previo) continue;
      var artistas = previo.artistas;
      if(artista && artistas.indexOf(artista) < 0) artistas = artistas.concat([artista]);
      var existente = estados[t + dur];
      if(!existente || artistas.length > existente.artistas.length){
        estados[t + dur] = {discos:previo.discos.concat([d]), artistas:artistas};
      }
    }
  });
  var mejor = 0;
  for(var t = 1; t <= limite; t++){
    if(estados[t] && (!mejor || Math.abs(t - objetivo) < Math.abs(mejor - objetivo))) mejor = t;
  }
  return {discos:mejor ? estados[mejor].discos : [], segundos:mejor, objetivo:objetivo};
}
function tiempoSesion(segundos){
  var min = Math.floor(segundos / 60), resto = segundos % 60;
  return min + ' min' + (resto ? ' ' + resto + ' s' : '');
}
function resumenTiempoSesion(discos, minutos){
  var total = 0, faltan = 0;
  discos.forEach(function(d){ var info = duracionSesion(d); total += info.segundos; if(!info.completa) faltan++; });
  var texto = 'Duración prevista: ' + (faltan ? 'al menos ' : '') + tiempoSesion(total);
  if(minutos) texto += ' de ' + minutos + ' min';
  if(minutos && total > minutos * 60) texto += ' · Excede el objetivo en ' + tiempoSesion(total - minutos * 60);
  if(faltan) texto += ' · Faltan duraciones en ' + faltan + (faltan === 1 ? ' disco' : ' discos') + '; el total es incompleto';
  return texto;
}
function recomendadoColeccion(seed){
  var ds = coleccion();
  if(!ds.length) return null;
  var preferidos = ds.filter(function(d){ return totalEscuchas(d) === 0; });
  if(!preferidos.length) preferidos = ds.slice();
  return rngShuffle(preferidos, seed)[0] || preferidos[0] || ds[0];
}
/* La sesión guarda solo referencias en esta pestaña, nunca copias de discos o claves. */
var K_SESION_ESCUCHA = 'discoteca.sesionEscucha.v1';
var sesionEscuchaMemoria = null;
var sesionEscuchaDurable = true;
function destinoSesionEscucha(){
  return JSON.stringify([CFG.owner || '', CFG.repo || '', CFG.branch || 'main', CFG.path || 'datos.json']);
}
function normalizarSesionEscucha(valor, discos, destino){
  var base = {version:1, destino:destino, modo:'uno', minutos:45, filtro:'todos', uno:'', unoGenerado:false, ids:[], generada:false};
  if(!valor || valor.version !== 1 || valor.destino !== destino) return base;
  var disponibles = new Set(discos.map(function(d){ return d.id; }));
  base.modo = valor.modo === 'tiempo' ? 'tiempo' : 'uno';
  if([20,30,45,60,90].indexOf(valor.minutos) >= 0) base.minutos = valor.minutos;
  if(['todos','noescuchados','favoritos','vinilo','cd'].indexOf(valor.filtro) >= 0) base.filtro = valor.filtro;
  base.uno = typeof valor.uno === 'string' && disponibles.has(valor.uno) ? valor.uno : '';
  var vistos = new Set();
  if(Array.isArray(valor.ids)) valor.ids.slice(0,200).forEach(function(id){
    if(typeof id === 'string' && disponibles.has(id) && !vistos.has(id)){ base.ids.push(id); vistos.add(id); }
  });
  base.generada = valor.generada === true;
  base.unoGenerado = valor.unoGenerado === true;
  return base;
}
function cargarSesionEscucha(){
  var valor = sesionEscuchaMemoria;
  if(!valor){
    try{ valor = JSON.parse(sessionStorage.getItem(K_SESION_ESCUCHA) || 'null'); }
    catch(e){ sesionEscuchaDurable = false; }
  }
  sesionEscuchaMemoria = normalizarSesionEscucha(valor, coleccion(), destinoSesionEscucha());
  return sesionEscuchaMemoria;
}
function guardarSesionEscucha(estado){
  sesionEscuchaMemoria = normalizarSesionEscucha(estado, coleccion(), destinoSesionEscucha());
  try{ sessionStorage.setItem(K_SESION_ESCUCHA, JSON.stringify(sesionEscuchaMemoria)); sesionEscuchaDurable = true; }
  catch(e){ sesionEscuchaDurable = false; }
  return sesionEscuchaMemoria;
}
function terminarSesionEscucha(){
  /* Escribir el estado vacío también invalida el anterior si removeItem no está disponible. */
  guardarSesionEscucha(null);
  try{ sessionStorage.removeItem(K_SESION_ESCUCHA); sesionEscuchaDurable = true; }
  catch(e){}
}
function discosSesionEscucha(estado, discos){
  var ids = estado.modo === 'uno' ? [estado.uno] : estado.ids;
  return ids.map(function(id){ return discos.filter(function(d){ return d.id === id; })[0]; }).filter(Boolean);
}
function progresoSesionEscucha(discos){
  var pendientes = discos.filter(function(d){ return !escuchadoHoy(d); });
  return {total:discos.length, escuchados:discos.length - pendientes.length,
    segundosPendientes:pendientes.reduce(function(n,d){ return n + duracionSegundos(d); },0)};
}
function sesionEscucha(){
  var estado = cargarSesionEscucha();
  if(!estado.unoGenerado && estado.modo === 'uno'){
    var primero = recomendadoColeccion(parseInt(hoyISO().replace(/-/g,''),10));
    estado.uno = primero ? primero.id : '';
    estado.unoGenerado = true;
  }
  var body = '<div class="listen-choice" role="group" aria-label="Tipo de sesión">'
    + '<button type="button" data-modo-escucha="uno">' + I.disc + 'Recomiéndame uno</button>'
    + '<button type="button" data-modo-escucha="tiempo">' + I.reloj2 + 'Tengo un tiempo</button></div>'
    + '<div id="sesTiempo"><p class="session-label">¿Cuánto tiempo tienes?</p>'
    + '<div class="session-options" id="sesMin" role="group" aria-label="Tiempo disponible">'
    + [20,30,45,60,90].map(function(m){ return '<button type="button" class="btn sm" data-min="' + m + '">' + m + ' min</button>'; }).join('')
    + '</div><p class="session-label">¿Algún filtro?</p><div class="session-options" id="sesFiltro" role="group" aria-label="Filtro de sesión">'
    + [['todos','Cualquiera'],['noescuchados','No escuchados'],['favoritos','Favoritos'],['vinilo','Vinilo'],['cd','CD']].map(function(f){
      return '<button type="button" class="btn sm" data-f="' + f[0] + '">' + f[1] + '</button>';
    }).join('') + '</div></div>'
    + '<p class="session-hint" id="sesConservacion"></p><p class="session-progress" id="sesProgreso" role="status" aria-live="polite"></p>'
    + '<p class="session-hint" id="sesDuracion" role="status" aria-live="polite"></p><div id="sesRes"></div><div class="session-options session-footer">'
    + '<button type="button" class="btn sm" id="sesOtra">' + I.refresh + 'Otra selección</button>'
    + '<button type="button" class="btn sm" id="sesTerminar">Terminar sesión</button></div>';
  var sh = sheet('Qué escucho ahora', body, null, true);
  var construir = function(){
    if(estado.modo === 'tiempo'){
      estado.ids = construirSesion(estado.minutos, estado.filtro === 'todos' ? '' : estado.filtro).discos.map(function(d){ return d.id; });
      estado.generada = true;
    }else{
      var alternativas = coleccion().filter(function(d){ return d.id !== estado.uno; });
      var sinEscuchar = alternativas.filter(function(d){ return totalEscuchas(d) === 0; });
      var otro = rngShuffle(sinEscuchar.length ? sinEscuchar : alternativas, Date.now() % 99991)[0];
      if(otro) estado.uno = otro.id;
      estado.unoGenerado = true;
    }
  };
  var pintar = function(animar){
    estado = guardarSesionEscucha(estado);
    var discos = discosSesionEscucha(estado, coleccion());
    var progreso = progresoSesionEscucha(discos);
    sh.querySelector('#sesTiempo').hidden = estado.modo !== 'tiempo';
    sh.querySelectorAll('[data-modo-escucha]').forEach(function(b){
      var on = b.dataset.modoEscucha === estado.modo;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
    });
    sh.querySelectorAll('[data-min]').forEach(function(b){
      var on = +b.dataset.min === estado.minutos;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
    });
    sh.querySelectorAll('#sesFiltro [data-f]').forEach(function(b){
      var on = b.dataset.f === estado.filtro;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
    });
    sh.querySelector('#sesConservacion').textContent = sesionEscuchaDurable
      ? 'Tu selección se conserva al volver de una ficha o recargar esta pestaña. No reproduce audio.'
      : 'Tu selección se mantiene mientras la app siga abierta; el navegador no permite guardarla al recargar.';
    sh.querySelector('#sesProgreso').textContent = discos.length
      ? progreso.escuchados + ' de ' + progreso.total + ' escuchados hoy'
        + (progreso.escuchados === progreso.total ? ' · Sesión completada' : progreso.segundosPendientes
          ? ' · ' + (discos.some(function(d){ return !escuchadoHoy(d) && !duracionSesion(d).completa; }) ? 'Al menos ' : '') + tiempoSesion(progreso.segundosPendientes) + ' pendientes según las pistas' : '') : '';
    var aviso = discos.length ? resumenTiempoSesion(discos, estado.modo === 'tiempo' ? estado.minutos : 0) : '';
    if(estado.modo === 'tiempo'){
      var incompletos = candidatosSesion(estado.filtro).filter(function(d){ return !duracionSesion(d).completa; }).length;
      if(incompletos) aviso += (aviso ? ' · ' : '') + incompletos + ' discos del filtro sin duración completa; no se incluyen en nuevas selecciones por tiempo.';
    }
    sh.querySelector('#sesDuracion').textContent = aviso;
    var caja = sh.querySelector('#sesRes');
    caja.innerHTML = discos.length ? '<div class="explore-list">' + discos.map(function(d){
      return itemExplorarHtml({d:d, motivo:escuchadoHoy(d) ? 'Escuchado hoy · puedes volver a abrirlo' :
        d.formato + (duracionSegundos(d) ? ' · ' + (duracionSesion(d).completa ? '' : 'al menos ') + tiempoSesion(duracionSegundos(d)) : ' · duración sin datos')});
    }).join('') + '</div>' : '<div class="tl-empty">' + (!coleccion().length ? 'Tu colección está vacía.'
      : 'No hay discos en esta selección. Cambia el tiempo o el filtro, o pide otra selección.') + '</div>';
    var otra = sh.querySelector('#sesOtra');
    otra.textContent = estado.modo === 'uno' ? 'Otro disco' : 'Otra selección';
    otra.disabled = estado.modo === 'uno' ? !coleccion().some(function(d){ return d.id !== estado.uno; }) : !coleccion().length;
    caja.querySelectorAll('[data-explore-disco]').forEach(function(b){
      b.onclick = function(){
        guardarSesionEscucha(estado);
        sh.querySelector('[data-close]').click();
        openDetail(b.dataset.exploreDisco, null, sesionEscucha);
      };
    });
    caja.querySelectorAll('[data-explore-listen]').forEach(function(b){
      b.onclick = function(){
        if(readOnly) return;
        var id = b.dataset.exploreListen;
        marcarEscucha(id); paintCol(); pintar(false);
        var nuevo = Array.from(caja.querySelectorAll('[data-explore-listen]')).filter(function(x){ return x.dataset.exploreListen === id; })[0];
        if(nuevo){ nuevo.focus(); microFeedback(nuevo); }
      };
    });
    if(animar) microFeedback(caja, 'reveal');
  };
  sh.querySelectorAll('[data-modo-escucha]').forEach(function(b){
    b.onclick = function(){
      estado.modo = b.dataset.modoEscucha;
      if(estado.modo === 'tiempo' && !estado.generada) construir();
      if(estado.modo === 'uno' && !estado.unoGenerado) construir();
      pintar(true);
    };
  });
  sh.querySelectorAll('[data-min]').forEach(function(b){
    b.onclick = function(){ estado.minutos = +b.dataset.min; construir(); pintar(true); };
  });
  sh.querySelectorAll('#sesFiltro [data-f]').forEach(function(b){
    b.onclick = function(){ estado.filtro = b.dataset.f; construir(); pintar(true); };
  });
  sh.querySelector('#sesOtra').onclick = function(){ construir(); pintar(true); };
  sh.querySelector('#sesTerminar').onclick = function(){
    terminarSesionEscucha(); sh.querySelector('[data-close]').click();
    toast(sesionEscuchaDurable ? 'Sesión terminada · tus escuchas se conservan' : 'Sesión terminada aquí; el navegador no pudo borrar la selección guardada');
  };
  pintar(false);
}

/* ============================================================
   ADN MUSICAL DE LA COLECCIÓN
   Síntesis de datos que ya se calculan en otras tarjetas de Estadísticas,
   reunidos en un único perfil. Nada de frases genéricas: solo porcentajes
   y cifras sacadas directamente de tu colección.
   ============================================================ */
function adnMusical(){
  var ds = coleccion();
  if(ds.length < 8){ toast('Hace falta algo más de colección para sacar un perfil', true); return; }
  var contar = function(campo){
    var m = {};
    ds.forEach(function(d){ var v = d[campo]; if(v) m[v] = (m[v] || 0) + 1; });
    return Object.keys(m).sort(function(a, b){ return m[b] - m[a]; }).map(function(k){ return {k:k, n:m[k]}; });
  };
  var decadas = {};
  ds.forEach(function(d){
    var y = parseInt(d['año']);
    if(y){ var dec = Math.floor(y / 10) * 10; decadas[dec] = (decadas[dec] || 0) + 1; }
  });
  var decOrden = Object.keys(decadas).sort(function(a, b){ return decadas[b] - decadas[a]; });
  var generos = contar('genero'), paises = contar('pais'), sellos = contar('sello');
  var porArtista = {};
  ds.forEach(function(d){ if(d.artista) porArtista[d.artista] = (porArtista[d.artista] || 0) + 1; });
  var artistasOrd = Object.keys(porArtista).sort(function(a, b){ return porArtista[b] - porArtista[a]; });
  var top10 = artistasOrd.slice(0, 10).reduce(function(a, k){ return a + porArtista[k]; }, 0);
  var vin = ds.filter(function(d){ return d.formato === 'Vinilo'; }).length;
  var anios = ds.map(function(d){ return parseInt(d['año']); }).filter(Boolean);
  var anioMedio = anios.length ? Math.round(anios.reduce(function(a, b){ return a + b; }, 0) / anios.length) : null;

  var linea = function(k, v, sub){
    return '<div class="adnfila"><div class="ak">' + esc(k) + '</div><div class="av">' + v + '</div>'
      + (sub ? '<div class="as">' + esc(sub) + '</div>' : '') + '</div>';
  };
  var body = '<div class="adngrid">'
    + (decOrden.length ? linea('Década dominante', decOrden[0] + 's',
        Math.round(decadas[decOrden[0]] / ds.length * 100) + '% de tu colección') : '')
    + (generos.length ? linea('Género principal', generos[0].k,
        Math.round(generos[0].n / ds.length * 100) + '% de tu colección') : '')
    + (paises.length ? linea('País más presente', nombrePais(paises[0].k) || paises[0].k,
        Math.round(paises[0].n / ds.length * 100) + '%') : '')
    + (sellos.length ? linea('Sello con más discos tuyos', sellos[0].k, sellos[0].n + ' discos') : '')
    + linea('Vinilo frente a CD', Math.round(vin / ds.length * 100) + '% / ' + Math.round((ds.length - vin) / ds.length * 100) + '%', '')
    + (anioMedio ? linea('Año medio de tu colección', anioMedio, '') : '')
    + linea('Artistas distintos', artistasOrd.length, 'para ' + ds.length + ' discos')
    + linea('Concentración', Math.round(top10 / ds.length * 100) + '%',
        'de tu colección son tus 10 artistas con más discos')
    + '</div>';
  sheet('El ADN de tu colección', body, null, true);
}

/* ============================================================
   TENDENCIA DE ESCUCHA
   El calendario ya existe; esto añade la evolución mes a mes, algo
   que el calendario no muestra: si escuchas más o menos que antes, y
   si el formato que más pones ha ido cambiando.
   ============================================================ */
function tendenciaEscucha(){
  var ds = coleccion();
  var porMes = {}, meses = [];
  var hoy = new Date();
  for(var i = 11; i >= 0; i--){
    var f = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    var k = f.getFullYear() + '-' + String(f.getMonth() + 1).padStart(2, '0');
    meses.push(k);
    porMes[k] = {total: 0, vinilo: 0};
  }
  ds.forEach(function(d){
    (d.escuchasFechas || []).forEach(function(fecha){
      var k = String(fecha).slice(0, 7);
      if(porMes[k]){ porMes[k].total++; if(d.formato === 'Vinilo') porMes[k].vinilo++; }
    });
  });
  var totalEsc = meses.reduce(function(a, k){ return a + porMes[k].total; }, 0);
  if(!totalEsc){
    sheet('Tendencia de escucha', '<div class="tl-empty">Todavía no hay escuchas registradas en los últimos '
      + '12 meses. Marca alguna desde una ficha o deslizando una portada, y vuelve aquí más adelante.</div>');
    return;
  }
  var ultimos3 = meses.slice(-3).reduce(function(a, k){ return a + porMes[k].total; }, 0);
  var anteriores3 = meses.slice(-6, -3).reduce(function(a, k){ return a + porMes[k].total; }, 0);
  var cambio = anteriores3 ? Math.round((ultimos3 - anteriores3) / anteriores3 * 100) : null;
  var datosGrafico = meses.map(function(k){
    return {k: k.slice(5) + '/' + k.slice(2, 4), v: porMes[k].total};
  });
  var body = '<div class="warnb info">' + I.info + '<span>' + (cambio == null ? 'Con más meses de historial se podrá comparar la tendencia.'
      : cambio > 0 ? 'Has escuchado un ' + cambio + '% más en los últimos tres meses que en los tres anteriores.'
      : cambio < 0 ? 'Has escuchado un ' + Math.abs(cambio) + '% menos en los últimos tres meses que en los tres anteriores.'
      : 'Escuchas al mismo ritmo que hace tres meses.') + '</span></div>'
    + '<div class="chartwrap">' + columns(datosGrafico, 'var(--green)') + '</div>';

  /* artistas más escuchados en estos 12 meses */
  var desdeMs = new Date(hoy.getFullYear(), hoy.getMonth() - 11, 1).getTime();
  var porArtista = {};
  ds.forEach(function(d){
    (d.escuchasFechas || []).forEach(function(fecha){
      var t = new Date(String(fecha)).getTime();
      if(!isNaN(t) && t >= desdeMs) porArtista[d.artista] = (porArtista[d.artista] || 0) + 1;
    });
  });
  var topArtistas = Object.keys(porArtista).map(function(a){ return {a:a, n:porArtista[a]}; })
    .sort(function(x, y){ return y.n - x.n; }).slice(0, 5);
  if(topArtistas.length){
    body += '<div class="tl-hd" style="margin-top:18px"><h4>Artistas más escuchados<span class="n"> · últimos 12 meses</span></h4></div>'
      + '<div class="tl">' + topArtistas.map(function(x, i){
          return '<div class="trk"><span class="num">' + (i + 1) + '</span>'
            + '<span class="nm">' + esc(x.a) + '</span>'
            + '<span class="dur">' + x.n + (x.n === 1 ? ' escucha' : ' escuchas') + '</span></div>';
        }).join('') + '</div>';
  }

  /* discos con más tiempo sin escuchar (de los que ya se han escuchado alguna vez) */
  var yaEscuchados = ds.filter(function(d){ return d.ultimaEscucha; })
    .sort(function(a, b){ return String(a.ultimaEscucha).localeCompare(String(b.ultimaEscucha)); }).slice(0, 5);
  if(yaEscuchados.length){
    body += '<div class="tl-hd" style="margin-top:18px"><h4>Más tiempo sin escuchar</h4></div>'
      + '<div class="tl">' + yaEscuchados.map(function(d){
          return '<div class="trk"><span class="nm">' + esc(d.titulo) + ' · ' + esc(d.artista) + '</span>'
            + '<span class="dur">' + fechaBonita(d.ultimaEscucha) + '</span></div>';
        }).join('') + '</div>';
  }

  sheet('Tendencia de escucha', body, null, true);
}

function pantallaReparar(){
  var r = analizarReparacion();
  var total = r.artistas.length + r.sellos.length + (r.sellosVar || []).length + r.anios.length + r.enlaces.length
    + (r.urlsRotas || []).length + (r.fotosHttp || []).length + (r.idsCompartidos || []).length;
  if(!total){
    sheet('Reparar la base de datos',
      '<div class="warnb info">' + I.check + '<span>No he encontrado nada que reparar. '
      + 'Los nombres de artista son consistentes, los sellos están limpios y los años son razonables.</span></div>');
    return;
  }
  var bloque = function(titulo, items, render){
    if(!items.length) return '';
    return '<div class="tl-hd" style="margin-top:18px"><h4>' + titulo + '<span class="n"> · '
      + items.length + '</span></h4></div><div class="tl">' + items.map(render).join('') + '</div>';
  };
  var body = '<p style="font-size:14.5px;color:var(--txt2);line-height:1.5;margin:0 0 8px">'
    + 'He encontrado <b style="color:var(--txt)">' + total + ' cosas</b> que se pueden arreglar. '
    + 'Marca las que quieras aplicar.</p>'
    + ((r.idsCompartidos || []).length ? '<div class="warnb info">' + I.info + '<span>Cuando dos ediciones enlazadas '
        + '(mismo álbum, distinto formato) comparten identificador o código de barras, se vacía en una de las dos '
        + 'para que la próxima revisión le busque uno propio. No se toca nada más de la ficha.</span></div>' : '')
    + bloque('Mismo artista escrito de varias formas', r.artistas, function(x, i){
        return '<label class="trk"><input type="checkbox" class="rep" data-t="art" data-i="' + i + '" checked>'
          + '<span class="nm">' + esc(x.variantes.join('  ·  ')) + '</span>'
          + '<span class="dur">→ ' + esc(x.mejor) + '</span></label>';
      })
    + bloque('Variantes del mismo sello', r.sellosVar || [], function(x, i){
        return '<label class="trk"><input type="checkbox" class="rep" data-t="selv" data-i="' + i + '" checked>'
          + '<span class="nm">' + esc(x.variantes.join('  ·  ')) + '</span>'
          + '<span class="dur">→ ' + esc(x.mejor) + '</span></label>';
      })
    + bloque('Sellos con restos de Discogs', r.sellos, function(x, i){
        return '<label class="trk"><input type="checkbox" class="rep" data-t="sel" data-i="' + i + '" checked>'
          + '<span class="nm">' + esc(x.de) + '</span><span class="dur">→ ' + esc(x.a) + '</span></label>';
      })
    + bloque('Años imposibles', r.anios, function(x, i){
        return '<label class="trk"><input type="checkbox" class="rep" data-t="ani" data-i="' + i + '" checked>'
          + '<span class="nm">' + esc(x.d.titulo) + '</span><span class="dur">' + esc(x.valor) + ' → vacío</span></label>';
      })
    + bloque('Ediciones del mismo álbum sin enlazar', r.enlaces, function(x, i){
        return '<label class="trk"><input type="checkbox" class="rep" data-t="enl" data-i="' + i + '" checked>'
          + '<span class="nm">' + esc(x.a.titulo) + '</span>'
          + '<span class="dur">' + x.a.formato + ' + ' + x.b.formato + '</span></label>';
      })
    + bloque('Enlaces de Discogs con el dominio duplicado', r.urlsRotas || [], function(x, i){
        return '<label class="trk"><input type="checkbox" class="rep" data-t="url" data-i="' + i + '" checked>'
          + '<span class="nm">' + esc(x.titulo) + '<span style="color:var(--txt3)"> · ' + esc(x.artista) + '</span></span>'
          + '<span class="dur">se corrige sola</span></label>';
      })
    + bloque('Fotos del disco en http:// en vez de https://', r.fotosHttp || [], function(x, i){
        return '<label class="trk"><input type="checkbox" class="rep" data-t="foto" data-i="' + i + '" checked>'
          + '<span class="nm">' + esc(x.titulo) + '<span style="color:var(--txt3)"> · ' + esc(x.artista) + '</span></span>'
          + '<span class="dur">se corrige sola</span></label>';
      })
    + bloque('Ediciones distintas con el mismo identificador', r.idsCompartidos || [], function(x, i){
        return '<label class="trk"><input type="checkbox" class="rep" data-t="idc" data-i="' + i + '" checked>'
          + '<span class="nm">' + esc(x.a.titulo) + '<span style="color:var(--txt3)"> · ' + esc(x.a.artista)
          + ' · ' + x.a.formato + ' + ' + x.b.formato + '</span></span>'
          + '<span class="dur">vacía ' + (x.campo === 'mbid' ? 'el identificador' : 'el código de barras') + '</span></label>';
      });
  var s = sheet('Reparar la base de datos', body,
    '<button type="button" class="btn" data-px>Cerrar</button><button type="button" class="btn pri" id="repOk">Aplicar lo marcado</button>', true);
  s.querySelector('[data-px]').onclick = function(){ s.remove(); };
  s.querySelector('#repOk').onclick = function(){
    var n = 0;
    guardarDeshacer(DB.discos.slice(), 'reparar la base de datos');
    s.querySelectorAll('.rep:checked').forEach(function(c){
      var i = +c.dataset.i;
      if(c.dataset.t === 'art'){
        var x = r.artistas[i];
        DB.discos.forEach(function(d){
          if(x.variantes.indexOf(d.artista) >= 0 && d.artista !== x.mejor){ d.artista = x.mejor; n++; }
        });
      }else if(c.dataset.t === 'sel'){
        var y = r.sellos[i];
        DB.discos.forEach(function(d){ if(d.sello === y.de){ d.sello = y.a; n++; } });
      }else if(c.dataset.t === 'selv'){
        var z = r.sellosVar[i];
        DB.discos.forEach(function(d){
          if(z.variantes.indexOf(d.sello) >= 0 && d.sello !== z.mejor){ d.sello = z.mejor; n++; }
        });
      }else if(c.dataset.t === 'ani'){
        r.anios[i].d['año'] = ''; n++;
      }else if(c.dataset.t === 'enl'){
        enlazarEdiciones(r.enlaces[i].a, r.enlaces[i].b); n++;
      }else if(c.dataset.t === 'url'){
        var du = r.urlsRotas[i];
        du.discogs = du.discogs.replace('https://www.discogs.comhttps://www.discogs.com', 'https://www.discogs.com');
        n++;
      }else if(c.dataset.t === 'foto'){
        var df = r.fotosHttp[i];
        df.fotoDisco = aHttps(df.fotoDisco);
        n++;
      }else if(c.dataset.t === 'idc'){
        var xi = r.idsCompartidos[i];
        /* se conserva el de la primera ficha y se vacía el de la segunda, para que
           la próxima «Revisar y actualizar todo» le busque uno propio, sin tocar
           ninguna otra cosa de la ficha */
        xi.b[xi.campo] = '';
        xi.b.revisado = '';
        n++;
      }
    });
    persist();
    s.remove();
    toast(n + ' arreglos aplicados');
  };
}


/* ============================================================
   27. TRAER LA COLECCIÓN DESDE DISCOGS
   ============================================================ */
var K_DG = 'discoteca.discogs';
function estadoDG(){
  try{ return JSON.parse(localStorage.getItem(K_DG) || '{}'); }catch(e){ return {}; }
}
function guardarDG(o){
  try{ localStorage.setItem(K_DG, JSON.stringify(o)); }catch(e){}
}
function dgUsuario(){
  var e = estadoDG();
  if(e.user) return Promise.resolve(e.user);
  return dgGet('oauth/identity').then(function(j){
    if(!j.username) throw new Error('sin usuario');
    e.user = j.username;
    guardarDG(e);
    return j.username;
  });
}
function dgColeccion(user, pagina){
  return dgGet('users/' + encodeURIComponent(user) + '/collection/folders/0/releases?per_page=100&page='
    + (pagina || 1) + '&sort=added&sort_order=desc');
}
/* Añade un disco ya enlazado con Discogs a tu colección de allí,
   sin bloquear el guardado: si falla, no pasa nada grave, solo no sube. */
function subirADiscogsColeccion(d){
  var m = String(d.discogs || '').match(/release\/(\d+)/);
  if(!m) return Promise.reject(new Error('sin edición de Discogs enlazada'));
  return dgUsuario().then(function(user){
    return fetch('https://api.discogs.com/users/' + encodeURIComponent(user)
        + '/collection/folders/1/releases/' + m[1] + '?token=' + encodeURIComponent(CFG.discogs),
      {method: 'POST'}).then(function(r){
        if(!r.ok) throw new Error('http' + r.status);
        return true;
      });
  });
}
async function traerDeDiscogs(silencioso){
  if(!hayDiscogs()){
    if(!silencioso) toast('Configura antes tu token de Discogs', true);
    return null;
  }
  var user;
  try{ user = await dgUsuario(); }
  catch(e){
    if(!silencioso) toast('No se pudo leer tu cuenta de Discogs', true);
    return null;
  }
  var todos = [], pagina = 1, paginas = 1;
  try{
    do{
      var j = await dgColeccion(user, pagina);
      paginas = (j.pagination && j.pagination.pages) || 1;
      todos = todos.concat(j.releases || []);
      pagina++;
    }while(pagina <= paginas && pagina <= 12);
  }catch(e){
    if(!silencioso) toast('Error leyendo la colección de Discogs', true);
    return null;
  }
  /* qué hay allí que no esté aquí, y qué cumple un deseo */
  var mios = {}, deseados = {};
  DB.discos.forEach(function(d){
    var k = plain(d.artista) + '|' + plain(d.titulo);
    if(d.lista === 'deseos') deseados[k] = d;
    else mios[k] = d;
    if(d.discogs){
      var m = String(d.discogs).match(/release\/(\d+)/);
      if(m){ if(d.lista === 'deseos') deseados['id' + m[1]] = d; else mios['id' + m[1]] = d; }
    }
  });
  var nuevos = [], cumplidos = [];
  todos.forEach(function(r){
    var b = r.basic_information || {};
    var art = (b.artists || []).map(function(a){ return limpiaNombre(a.name); }).join(', ');
    var k = plain(art) + '|' + plain(b.title || '');
    if(mios['id' + r.id] || mios[k]) return;
    var deseo = deseados['id' + r.id] || deseados[k];
    if(deseo) cumplidos.push({r:r, d:deseo});
    else nuevos.push(r);
  });
  var e = estadoDG();
  e.ultimo = nowISO();
  e.total = todos.length;
  guardarDG(e);
  return {user:user, todos:todos, nuevos:nuevos, cumplidos:cumplidos};
}
function dgADisco(r){
  var b = r.basic_information || {};
  var f = (b.formats || [])[0] || {};
  var esCD = /cd/i.test(f.name || '');
  var art = (b.artists || []).map(function(a){ return limpiaNombre(a.name); }).join(', ');
  var notas = {};
  (r.notes || []).forEach(function(n){ notas[n.field_id] = n.value; });
  return normDisc({
    id: uid(),
    artista: art, titulo: b.title || '',
    'año': String(b.year || '') === '0' ? '' : String(b.year || ''),
    formato: esCD ? 'CD' : 'Vinilo',
    formatoDetalle: [f.name, (f.descriptions || []).join(', ')].filter(Boolean).join(', '),
    sello: limpiaSello(((b.labels || [])[0] || {}).name || ''),
    numeroCatalogo: ((b.labels || [])[0] || {}).catno || '',
    portada: b.cover_image || b.thumb || '',
    discogs: 'https://www.discogs.com/release/' + r.id,
    genero: clasificar(((b.genres || []).concat(b.styles || [])).join(' '), false, art),
    fechaAlta: r.date_added || nowISO()
  });
}
function pantallaDiscogs(){
  var e = estadoDG();
  var body = '<div class="warnb info">' + I.info + '<span>Lee tu colección de Discogs y trae los discos que aquí no tengas. '
    + 'No modifica nada de lo que ya está: tus estrellas, escuchas y notas se quedan como están.</span></div>'
    + (e.ultimo ? '<div class="creds" style="margin-bottom:14px"><div class="cred"><span class="k">Última consulta</span>'
      + '<span class="v">' + fdate(e.ultimo) + '</span></div>'
      + (e.total ? '<div class="cred"><span class="k">Discos en Discogs</span><span class="v">' + e.total + '</span></div>' : '')
      + '</div>' : '')
    + '<div id="dgBody"><div class="note busy">Consultando tu cuenta…</div></div>';
  var s = sheet('Tu colección de Discogs', body, '<span></span><button type="button" class="btn" data-dx>Cerrar</button>', true);
  s.querySelector('[data-dx]').onclick = function(){ s.remove(); };
  traerDeDiscogs().then(function(r){
    if(!r){ s.querySelector('#dgBody').innerHTML = '<div class="note err">No se pudo consultar.</div>'; return; }
    var cumplidos = r.cumplidos || [];
    if(!r.nuevos.length && !cumplidos.length){
      s.querySelector('#dgBody').innerHTML = '<div class="warnb info">' + I.check
        + '<span>Todo al día: tus <b>' + r.todos.length + ' discos</b> de Discogs ya están aquí.</span></div>';
      return;
    }
    s.querySelector('#dgBody').innerHTML =
      (cumplidos.length ? '<div class="warnb info">' + I.lampara + '<span><b>' + cumplidos.length
        + (cumplidos.length === 1 ? ' disco de tu lista de deseos</b> ya lo tienes en Discogs: '
          : ' discos de tu lista de deseos</b> ya los tienes en Discogs: ')
        + 'paso su ficha a la colección en vez de crear otra.</span></div>' : '')
      + (r.nuevos.length ? '<p style="font-size:14.5px;margin:0 0 12px"><b>' + r.nuevos.length
        + '</b> discos más están en Discogs y no aquí.</p>' : '')
      + '<div class="cands">' + r.nuevos.slice(0, 40).map(function(x, i){
          var b = x.basic_information || {};
          return '<div class="cand" data-i="' + i + '">'
            + '<img class="cimg" src="' + esc(b.cover_image || b.thumb || '') + '" alt="" loading="lazy" data-img-error="dim">'
            + '<div class="cinf"><div class="t">' + esc(b.title || '') + '</div>'
            + '<div class="s">' + esc((b.artists || []).map(function(a){ return a.name; }).join(', ')) + '</div></div></div>';
        }).join('') + '</div>'
      + (r.nuevos.length > 40 ? '<div class="sub" style="margin-top:10px">y ' + (r.nuevos.length - 40) + ' más</div>' : '');
    s.querySelector('.sheet-ft').innerHTML = '<button type="button" class="btn" data-dx>Cerrar</button>'
      + '<button type="button" class="btn pri" id="dgAdd">Aplicar' + (r.nuevos.length ? ' · ' + r.nuevos.length + ' nuevos' : '') + '</button>';
    s.querySelector('[data-dx]').onclick = function(){ s.remove(); };
    s.querySelector('#dgAdd').onclick = function(){
      /* los deseos cumplidos pasan a la colección, conservando su ficha */
      cumplidos.forEach(function(c){
        var b = c.r.basic_information || {};
        var f = (b.formats || [])[0] || {};
        c.d.lista = 'coleccion';
        c.d.fechaCompra = c.d.fechaCompra || (c.r.date_added || nowISO()).slice(0, 10);
        if(!c.d.discogs) c.d.discogs = 'https://www.discogs.com/release/' + c.r.id;
        if(!c.d.portada && (b.cover_image || b.thumb)) c.d.portada = b.cover_image || b.thumb;
        if(!c.d.sello) c.d.sello = limpiaSello(((b.labels || [])[0] || {}).name || '');
        if(!c.d.numeroCatalogo) c.d.numeroCatalogo = ((b.labels || [])[0] || {}).catno || '';
        if(f.name) c.d.formato = /cd/i.test(f.name) ? 'CD' : 'Vinilo';
      });
      var añadidos = r.nuevos.map(dgADisco);
      añadidos.forEach(function(d){ DB.discos.push(d); });
      persist();
      s.remove();
      toast((cumplidos.length ? cumplidos.length + ' deseos cumplidos · ' : '')
        + añadidos.length + ' discos traídos de Discogs');
      setTimeout(function(){ bulkRun(añadidos.filter(incompleto)); }, 700);
    };
  });
}

/* ============================================================
   28. MODO TIENDA
   ============================================================ */
function modoTienda(){
  var t = document.createElement('div');
  t.className = 'tienda';
  t.innerHTML =
    '<div class="tnav"><button type="button" class="tclose" aria-label="Cerrar">' + I.x + '</button>'
    + '<div class="ttit">Modo tienda</div>'
    + '<button type="button" class="tluz" data-tip="Lista de deseos">' + I.heart + '</button></div>'
    + '<div class="tbody" id="tBody">'
      + '<button type="button" class="tscan" id="tScan">' + I.scan + '<span>Escanear un disco</span></button>'
      + '<div class="tman"><input id="tCod" type="text" inputmode="numeric" placeholder="o escribe el código">'
      + '<button type="button" class="btn pri" id="tOk">Buscar</button></div>'
      + '<div id="tRes"></div>'
      + '<div class="tdeseos" id="tDeseos"></div>'
    + '</div>';
  document.body.appendChild(t);
  var cerrar = function(){ t.remove(); };
  t.querySelector('.tclose').onclick = cerrar;
  var pintaDeseos = function(){
    var ds = deseos();
    t.querySelector('#tDeseos').innerHTML = ds.length
      ? '<div class="tdt">Buscando ' + ds.length + (ds.length === 1 ? ' disco' : ' discos') + '</div>'
        + ds.map(function(d){
            return '<div class="tdi"><div class="tda">' + coverHtml(d) + '</div>'
              + '<div class="tdn"><div class="t">' + esc(d.titulo) + '</div>'
              + '<div class="a">' + esc(d.artista) + '</div>'
              + '<div class="e">' + [d['año'], d.formato, d.numeroCatalogo].filter(Boolean).join(' · ') + '</div></div></div>';
          }).join('')
      : '<div class="tdt">Tu lista de deseos está vacía</div>';
  };
  pintaDeseos();
  t.querySelector('.tluz').onclick = function(){
    t.querySelector('#tDeseos').scrollIntoView({behavior:'smooth'});
  };
  var responder = function(codigo){
    var caja = t.querySelector('#tRes');
    caja.innerHTML = '<div class="tbuscando">' + I.search + 'Buscando ' + esc(codigo) + '…</div>';
    /* Una coincidencia en deseos NO es "ya lo tienes": son listas distintas
       y no deben tratarse igual en ningún caso de esta función. */
    var mioCol = DB.discos.filter(function(d){ return d.codigoBarras === codigo && d.lista !== 'deseos'; })[0];
    var mioDeseo = !mioCol && DB.discos.filter(function(d){ return d.codigoBarras === codigo && d.lista === 'deseos'; })[0];
    var pinta = function(d, encontrado, info, otraEdicion, esDeseo){
      if(encontrado && d && esDeseo){
        caja.innerHTML = '<div class="tcard otra"><div class="tico">' + I.heart + '</div>'
          + '<div class="tt">ESTÁ EN TU LISTA DE DESEOS</div>'
          + '<div class="tsub">' + esc(d.titulo) + ' · ' + esc(d.artista) + '</div>'
          + '<div class="tdet">' + [d.formato, d['año']].filter(Boolean).join(' · ') + '</div>'
          + '<button type="button" class="btn" id="tVer">Ver en deseos</button></div>';
        var bv = caja.querySelector('#tVer');
        if(bv) bv.onclick = function(){ cerrar(); openDetail(d.id); };
      }else if(encontrado && d && !otraEdicion){
        caja.innerHTML = '<div class="tcard si"><div class="tico">' + I.check + '</div>'
          + '<div class="tt">YA LO TIENES</div>'
          + '<div class="tsub">' + esc(d.titulo) + ' · ' + esc(d.artista) + '</div>'
          + '<div class="tdet">' + [d.formato, d['año'], d.estado].filter(Boolean).join(' · ')
          + (d.precioCompra ? ' · pagaste ' + d.precioCompra.toFixed(2) + ' €' : '')
          + (d.ubicacion ? ' · ' + esc(d.ubicacion) : '') + '</div>'
          + '<button type="button" class="btn" id="tVer">Ver la ficha</button></div>';
        var b = caja.querySelector('#tVer');
        if(b) b.onclick = function(){ cerrar(); openDetail(d.id); };
      }else if(encontrado && d && otraEdicion){
        /* mismo álbum, pero la edición que tienes no es exactamente esta:
           se enseñan las dos una al lado de la otra, sin decir cuál comprar */
        var fila2 = function(k, tuya, esta){
          if(!tuya && !esta) return '';
          var distinto = tuya && esta && String(tuya) !== String(esta);
          return '<div class="tcompfila' + (distinto ? ' dif' : '') + '"><span class="tck">' + k + '</span>'
            + '<span class="tcv">' + esc(tuya || '—') + '</span><span class="tcv">' + esc(esta || '—') + '</span></div>';
        };
        caja.innerHTML = '<div class="tcard otra"><div class="tico">' + I.layers + '</div>'
          + '<div class="tt">TIENES ESTE ÁLBUM, OTRA EDICIÓN</div>'
          + '<div class="tsub">' + esc(d.titulo) + ' · ' + esc(d.artista) + '</div>'
          + '<div class="tcomp"><div class="tcompfila tchd"><span class="tck"></span><span class="tcv">La tuya</span><span class="tcv">Esta</span></div>'
          + fila2('Formato', d.formato, info && (/cd/i.test(info.formatoDetalle || '') ? 'CD' : 'Vinilo'))
          + fila2('Año', d['año'], info && info['año'])
          + fila2('Sello', d.sello, info && info.sello)
          + fila2('País', d.pais && nombrePais(d.pais), info && info.pais && nombrePais(info.pais))
          + fila2('Catálogo', d.numeroCatalogo, info && info.numeroCatalogo)
          + '</div>'
          + '<button type="button" class="btn" id="tVer2">Ver tu ficha</button></div>';
        var b2 = caja.querySelector('#tVer2');
        if(b2) b2.onclick = function(){ cerrar(); openDetail(d.id); };
      }else{
        caja.innerHTML = '<div class="tcard no"><div class="tico">' + I.plus + '</div>'
          + '<div class="tt">NO LO TIENES</div>'
          + '<div class="tsub">' + (info ? esc(info.titulo + ' · ' + info.artista) : 'Código ' + esc(codigo)) + '</div>'
          + '<div class="rowb" style="justify-content:center;margin-top:14px">'
          + (readOnly ? '' : '<button type="button" class="btn" id="tDeseo">' + I.heart + 'A deseos</button>')
          + (readOnly ? '' : '<button type="button" class="btn pri" id="tAlta">Añadir ya</button>') + '</div>'
          + (readOnly ? '<div class="tdet" style="margin-top:10px">Modo solo lectura: configura la sincronización para poder añadir discos.</div>' : '') + '</div>';
        var bd = caja.querySelector('#tDeseo');
        if(bd) bd.onclick = function(){
          var nuevo = normDisc(Object.assign({id:uid(), lista:'deseos', codigoBarras:codigo, fechaAlta:nowISO()},
            info ? {artista:info.artista, titulo:info.titulo, 'año':info['año'], sello:info.sello,
              numeroCatalogo:info.numeroCatalogo, formato:/cd/i.test(info.formatoDetalle || '') ? 'CD' : 'Vinilo'} : {}));
          DB.discos.push(nuevo);
          persist();
          pintaDeseos();
          toast('Añadido a deseos');
          caja.innerHTML = '<div class="tcard si"><div class="tico">' + I.check + '</div><div class="tt">EN DESEOS</div></div>';
        };
        var ba = caja.querySelector('#tAlta');
        if(ba) ba.onclick = function(){ cerrar(); altaPorCodigo(codigo); };
      }
    };
    if(mioCol) return pinta(mioCol, true, null, false, false);
    if(mioDeseo) return pinta(mioDeseo, true, null, false, true);
    porCodigoBarras(codigo).then(function(info){
      var igualCol = DB.discos.filter(function(d){
        return d.lista !== 'deseos' && plain(d.artista) === plain(info.artista) && plain(d.titulo) === plain(info.titulo);
      })[0];
      var igualDeseo = !igualCol && DB.discos.filter(function(d){
        return d.lista === 'deseos' && plain(d.artista) === plain(info.artista) && plain(d.titulo) === plain(info.titulo);
      })[0];
      if(igualCol) return pinta(igualCol, true, info, true, false);
      if(igualDeseo) return pinta(igualDeseo, true, info, true, true);
      pinta(null, false, info, false, false);
    }).catch(function(){ pinta(null, false, null); });
  };
  t.querySelector('#tOk').onclick = function(){
    var v = t.querySelector('#tCod').value.replace(/\D/g, '');
    if(v.length >= 8) responder(v);
  };
  t.querySelector('#tCod').onkeydown = function(e){ if(e.key === 'Enter') t.querySelector('#tOk').click(); };
  t.querySelector('#tScan').onclick = function(){
    escanear(function(codigo){ responder(codigo); });
  };
  montarAyudas(t);
}
