/* ---------- imagen local para la carátula ---------- */
function shrinkDataUri(dataUri, maxPx, q){
  return new Promise(function(res){
    var img = new Image();
    img.onload = function(){
      var m = maxPx || 600, sc = Math.min(1, m / Math.max(img.width, img.height));
      var c = document.createElement('canvas');
      c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      try{ res(c.toDataURL('image/jpeg', q || 0.82)); }catch(e){ res(dataUri); }
    };
    img.onerror = function(){ res(dataUri); };
    img.src = dataUri;
  });
}
function fileToDataUri(file, maxPx){
  return new Promise(function(res, rej){
    var fr = new FileReader();
    fr.onload = function(){ shrinkDataUri(String(fr.result), maxPx || 600, .82).then(res); };
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

/* ---------- catálogo imprimible ---------- */
function catalogoImprimible(){
  var ds = coleccion().slice().sort(function(a, b){
    return (a.artista || '').localeCompare(b.artista || '', 'es') || (a['año'] || '').localeCompare(b['año'] || '');
  });
  var por = {};
  ds.forEach(function(d){ (por[d.artista || 'Sin artista'] = por[d.artista || 'Sin artista'] || []).push(d); });
  var html = '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Catálogo · Discoteca</title><style>'
    + 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;margin:0;padding:36px;color:#111;background:#fff}'
    + 'h1{font-size:30px;margin:0 0 4px;letter-spacing:-.02em}.meta{color:#666;font-size:13px;margin-bottom:26px}'
    + 'h2{font-size:16px;margin:26px 0 10px;padding-bottom:5px;border-bottom:1px solid #ddd;break-after:avoid}'
    + '.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(122px,1fr));gap:14px}'
    + '.c{break-inside:avoid}.c img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:6px;background:#eee;display:block}'
    + '.c .t{font-size:11.5px;font-weight:600;margin-top:5px;line-height:1.25}.c .s{font-size:10.5px;color:#666;margin-top:1px}'
    + '@media print{@page{margin:14mm}body{padding:0}}</style></head><body>'
    + '<h1>Mi discoteca</h1><div class="meta">' + ds.length + ' discos · ' + Object.keys(por).length + ' artistas · '
    + new Date().toLocaleDateString('es-ES', {day:'numeric', month:'long', year:'numeric'}) + '</div>';
  Object.keys(por).sort(function(a, b){ return a.localeCompare(b, 'es'); }).forEach(function(art){
    html += '<h2>' + esc(art) + ' <span style="color:#999;font-weight:400">· ' + por[art].length + '</span></h2><div class="g">';
    por[art].forEach(function(d){
      html += '<div class="c">' + (d.portada ? '<img src="' + esc(d.portada) + '">' : '<div style="width:100%;aspect-ratio:1/1;background:#eee;border-radius:6px"></div>')
        + '<div class="t">' + esc(d.titulo) + '</div><div class="s">' + [d['año'], d.formato].filter(Boolean).join(' · ') + '</div></div>';
    });
    html += '</div>';
  });
  html += '</body></html>';
  var w = window.open('', '_blank');
  if(!w){ download('catalogo-discoteca.html', html, 'text/html;charset=utf-8'); toast('Catálogo descargado'); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(function(){ try{ w.print(); }catch(e){} }, 900);
}

/* ============================================================
   8. ESCÁNER DE CÓDIGOS DE BARRAS
      Chrome de escritorio y Android usan el lector del sistema.
      En iPhone se carga un lector en JavaScript que sí funciona
      sobre el motor de Safari.
   ============================================================ */
/* Alojado en el propio repositorio en vez de en un CDN externo: como esta
   app guarda tu token de GitHub, es mejor no depender de código remoto de
   terceros en tiempo de ejecución si se puede evitar. */
var ZX_URL = './zxing-0.21.3.js';
var zxCargando = null;
function cargarZX(){
  if(window.ZXing) return Promise.resolve(window.ZXing);
  if(zxCargando) return zxCargando;
  zxCargando = new Promise(function(res, rej){
    var s = document.createElement('script');
    s.src = ZX_URL;
    s.onload = function(){ res(window.ZXing); };
    s.onerror = function(){ zxCargando = null; rej(new Error('zxing')); };
    document.head.appendChild(s);
  });
  return zxCargando;
}
function lectorZX(){
  var Z = window.ZXing;
  var hints = new Map();
  hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [
    Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.EAN_8,
    Z.BarcodeFormat.UPC_E, Z.BarcodeFormat.CODE_128, Z.BarcodeFormat.CODE_39
  ]);
  hints.set(Z.DecodeHintType.TRY_HARDER, true);
  return new Z.BrowserMultiFormatReader(hints, 200);
}
/* Para el vídeo en vivo: sin TRY_HARDER, que es caro por fotograma y aquí
   compensa más decodificar rápido y a menudo que a fondo y despacio */
function lectorZXRapido(){
  var Z = window.ZXing;
  var hints = new Map();
  hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [
    Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.EAN_8,
    Z.BarcodeFormat.UPC_E, Z.BarcodeFormat.CODE_128, Z.BarcodeFormat.CODE_39
  ]);
  return new Z.BrowserMultiFormatReader(hints, 60);
}
/* Reduce una foto a un tamaño que el lector maneja bien */
function fotoParaLeer(file, lado){
  return new Promise(function(res, rej){
    var fr = new FileReader();
    fr.onload = function(){
      var img = new Image();
      img.onload = function(){
        var m = lado || 1600, sc = Math.min(1, m / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        var ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, c.width, c.height);
        /* más contraste: los códigos impresos en fundas brillantes se leen mucho mejor */
        try{
          var dat = ctx.getImageData(0, 0, c.width, c.height), px = dat.data;
          for(var i = 0; i < px.length; i += 4){
            var g = (px[i] * .299 + px[i+1] * .587 + px[i+2] * .114);
            g = g < 110 ? 0 : (g > 150 ? 255 : (g - 110) * 255 / 40);
            px[i] = px[i+1] = px[i+2] = g;
          }
          ctx.putImageData(dat, 0, 0);
        }catch(e){}
        res(c.toDataURL('image/png'));
      };
      img.onerror = rej;
      img.src = String(fr.result);
    };
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}
function escanear(alLeer){
  var body = '<div id="scanwrap"><video id="vid" playsinline muted autoplay></video>'
    + '<div class="scanbox"><i></i><i></i><i></i><i></i></div><div class="scanline"></div></div>'
    + '<div class="note busy" id="snote" style="margin-top:12px">Preparando la cámara…</div>'
    + '<div class="warnb info" style="margin-top:14px">' + I.info
    + '<span>Llena el recuadro con el código, plano y sin brillos, y sujétalo firme un momento. '
    + 'Si la funda tiene una pegatina de precio con otro código, tapa esa pegatina o encuadra solo el original. '
    + 'Con poca luz cuesta: usa la opción de la foto.</span></div>'
    + '<div class="group"><div class="grow"><label>O escríbelo</label>'
    + '<input id="cbMan" type="text" inputmode="numeric" enterkeyhint="search" placeholder="0724384296520"></div></div>';
  var pie = '<button type="button" class="btn sm" id="btnFoto">' + I.img + 'Usar una foto</button>'
    + '<div class="rowb"><button type="button" class="btn" id="scanCancel">Cancelar</button><button type="button" class="btn pri" id="cbOk">Buscar</button></div>';
  var s = sheet('Escanear disco', body, pie);
  var video = s.querySelector('#vid'), stream = null, parar = false, lector = null;
  var lienzo = document.createElement('canvas');
  var nota = function(txt, cls){ var n = s.querySelector('#snote'); if(n){ n.className = 'note ' + (cls || 'busy'); n.textContent = txt; } };
  var notaHtml = function(html, cls){ var n = s.querySelector('#snote'); if(n){ n.className = 'note ' + (cls || 'busy'); n.innerHTML = html; } };
  var cerrar = function(){
    parar = true;
    try{ if(lector) lector.reset(); }catch(e){}
    if(stream) stream.getTracks().forEach(function(t){ t.stop(); });
  };
  var encontrado = function(codigo){
    if(parar) return;
    cerrar(); s.remove();
    if(typeof alLeer === 'function') alLeer(codigo);
    else altaPorCodigo(codigo);
  };
  s.querySelector('#scanCancel').onclick = function(){ cerrar(); s.remove(); };
  s.querySelector('[data-close]').addEventListener('click', cerrar);
  s.querySelector('#cbOk').onclick = function(){
    var v = s.querySelector('#cbMan').value.replace(/\D/g, '');
    if(v.length >= 8) encontrado(v);
    else nota('Ese código no parece válido', 'err');
  };
  s.querySelector('#cbMan').onkeydown = function(e){ if(e.key === 'Enter') s.querySelector('#cbOk').click(); };
  s.querySelector('#btnFoto').onclick = function(){
    var inp = document.getElementById('filePhoto');
    inp.value = '';
    inp.onchange = function(ev){
      var f = ev.target.files[0];
      if(!f) return;
      nota('Leyendo la foto…');
      cargarZX().then(function(){
        return fotoParaLeer(f, 1600);
      }).then(function(uri){
        var rd = lectorZX();
        return rd.decodeFromImageUrl(uri).catch(function(){
          return fotoParaLeer(f, 2400).then(function(u2){ return lectorZX().decodeFromImageUrl(u2); });
        });
      }).then(function(r){
        encontrado(r.getText());
      }).catch(function(){
        if(hayAnthropic()){
          notaHtml('No se distingue el código en esa foto. '
            + '<a href="#" id="identPortada" style="color:var(--blue)">Identificar por la portada</a> '
            + '(consulta de pago, unos céntimos), o prueba más cerca y con buena luz.', 'err');
          var enlace = s.querySelector('#identPortada');
          if(enlace) enlace.onclick = function(e){
            e.preventDefault();
            nota('Mirando la portada…');
            identificarPortada(f).then(function(obj){
              toast('Portada identificada: ' + [obj.artista, obj.titulo].filter(Boolean).join(' — '));
              cerrar(); s.remove();
              /* se abre el alta normal con el nombre ya escrito: el usuario revisa
                 y pulsa «Completar» él mismo, nunca se crea nada solo */
              openForm(null, (typeof alLeer === 'function') ? 'deseos' : 'coleccion',
                {titulo: obj.titulo, artista: obj.artista});
            }).catch(function(e2){
              nota('No se ha podido identificar la portada: ' + e2.message + '. Prueba con más luz.', 'err');
            });
          };
        }else{
          nota('No se distingue el código en esa foto. Prueba más cerca, con buena luz y el código recto.', 'err');
        }
      });
    };
    inp.click();
  };

  /* La cámara necesita resolución alta: con 640x480 las barras finas no se resuelven */
  var restricciones = {
    video: { facingMode: {ideal:'environment'}, width: {ideal: 1920}, height: {ideal: 1080} }
  };

  /* Recorta de cada fotograma solo la región que se ve dentro del recuadro visual
     (algo más ancha, por margen de error), respetando que el vídeo se muestra con
     object-fit:cover. Decodificar solo esa zona -en vez del fotograma entero- evita
     que el lector se distraiga con una segunda pegatina de código, el fondo o los
     bordes desenfocados, y además va más rápido al tener menos imagen que analizar. */
  var regionDeVideo = function(fx1, fy1, fx2, fy2){
    var vw = video.videoWidth, vh = video.videoHeight;
    var cw = video.clientWidth || vw, ch = video.clientHeight || vh;
    if(!vw || !vh || !cw || !ch) return null;
    var contA = cw / ch, vidA = vw / vh, sx1, sy1, sx2, sy2;
    if(vidA >= contA){
      var visW = contA / vidA;
      sx1 = (0.5 - visW / 2 + fx1 * visW) * vw; sx2 = (0.5 - visW / 2 + fx2 * visW) * vw;
      sy1 = fy1 * vh; sy2 = fy2 * vh;
    }else{
      var visH = vidA / contA;
      sy1 = (0.5 - visH / 2 + fy1 * visH) * vh; sy2 = (0.5 - visH / 2 + fy2 * visH) * vh;
      sx1 = fx1 * vw; sx2 = fx2 * vw;
    }
    sx1 = Math.max(0, sx1); sy1 = Math.max(0, sy1); sx2 = Math.min(vw, sx2); sy2 = Math.min(vh, sy2);
    return {sx:sx1, sy:sy1, sw:sx2 - sx1, sh:sy2 - sy1};
  };
  var fotogramaRecortado = function(){
    var r = regionDeVideo(0.08, 0.16, 0.92, 0.84);
    if(!r || r.sw < 40 || r.sh < 20) return null;
    var destW = Math.min(1100, Math.max(500, r.sw));
    var escala = destW / r.sw;
    lienzo.width = Math.round(r.sw * escala);
    lienzo.height = Math.round(r.sh * escala);
    var ctx = lienzo.getContext('2d');
    ctx.drawImage(video, r.sx, r.sy, r.sw, r.sh, 0, 0, lienzo.width, lienzo.height);
    return lienzo;
  };

  /* Se exigen dos lecturas seguidas iguales antes de dar el código por bueno,
     para no aceptar una lectura mala por casualidad de una pegatina distinta. */
  var ultimo = '', repetidas = 0;
  var registrar = function(codigo){
    if(codigo === ultimo) repetidas++;
    else{ ultimo = codigo; repetidas = 1; }
    if(repetidas >= 2){ encontrado(codigo); return true; }
    return false;
  };

  var detNativo = ('BarcodeDetector' in window)
    ? new window.BarcodeDetector({formats:['ean_13','upc_a','ean_8','upc_e','code_128']}) : null;
  var inicio = Date.now(), avisado = false;
  var bucle = function(){
    if(parar) return;
    if(!avisado && Date.now() - inicio > 14000){
      avisado = true;
      nota('¿Sigue sin leerlo? Prueba «Usar una foto» o escribe el código a mano.', 'err');
    }
    var c = fotogramaRecortado();
    if(!c){ setTimeout(bucle, 200); return; }
    var conNativo = detNativo ? detNativo.detect(c).then(function(r){
      return (r && r.length) ? r[0].rawValue : null;
    }).catch(function(){ return null; }) : Promise.resolve(null);
    conNativo.then(function(codigo){
      if(codigo || !lector) return codigo;
      try{
        var r = lector.decodeFromCanvas(c);
        return r ? r.getText() : null;
      }catch(e){ return null; }
    }).then(function(codigo){
      if(parar) return;
      if(codigo && registrar(codigo)) return;
      setTimeout(bucle, 180);
    });
  };

  navigator.mediaDevices.getUserMedia(restricciones).then(function(st){
    stream = st; video.srcObject = st;
    /* enfoque continuo si el dispositivo lo permite; si no, no pasa nada */
    try{
      var track = st.getVideoTracks()[0];
      var caps = track && track.getCapabilities && track.getCapabilities();
      if(caps && caps.focusMode && caps.focusMode.indexOf('continuous') >= 0){
        track.applyConstraints({advanced:[{focusMode:'continuous'}]}).catch(function(){});
      }
    }catch(e){}
    /* el lector ZXing se prepara siempre, como respaldo del detector nativo
       (que en Safari/iPhone no existe) o cuando el nativo no encuentra nada */
    return cargarZX().catch(function(){ return null; });
  }).then(function(){
    if(window.ZXing) lector = lectorZXRapido();
    nota('Encuadra el código dentro del recuadro');
    video.play().then(function(){ setTimeout(bucle, 400); }).catch(function(){ setTimeout(bucle, 800); });
  }).catch(function(){
    nota('No se pudo abrir la cámara. Escribe el código o usa una foto.', 'err');
  });
}
function altaPorCodigo(codigo){
  var t = toast('Buscando ' + codigo + '…');
  porCodigoBarras(codigo).then(function(mb){
    var formato = /cd/i.test(mb.formatoDetalle) ? 'CD' : 'Vinilo';
    var d = normDisc({
      id: uid(), artista: mb.artista, titulo: mb.titulo, 'año': mb.anioOriginal || mb['año'],
      formato: formato, formatoDetalle: mb.formatoDetalle, sello: mb.sello, numeroCatalogo: mb.numeroCatalogo,
      pais: mb.pais, codigoBarras: mb.codigoBarras || codigo, mbid: mb.id || '', rgid: mb.rgId || '',
      discogs: mb.discogsUrl || '', portada: mb.portada || '', tracklist: mb.tracklist, fechaAlta: nowISO()
    });
    var dup = DB.discos.filter(function(x){ return key(x) === key(d); })[0];
    if(dup){ t.remove(); toast('Ya tienes «' + dup.titulo + '» de ' + dup.artista, true); openDetail(dup.id); return; }
    var seguir = function(){
      var texto = (mb.tags || '') + ' ' + (mb.sec || '');
      var pre = clasificar(texto, false, d.artista);
      var fin = function(gen){
        d.genero = gen;
        DB.discos.push(d);
        persist();
        t.remove();
        toast('Añadido: ' + d.titulo);
        openDetail(d.id);
      };
      if(!necesitaNacionalidad(pre)) return fin(pre);
      esArtistaEspanol(d.artista, texto).then(function(es){ fin(clasificar(texto, es, d.artista)); });
    };
    if(d.portada || !d.mbid) return seguir();
    coverArchive(mb.id, mb.rgId).then(function(cov){ d.portada = cov || ''; seguir(); });
  }).catch(function(){
    t.remove();
    var s = sheet('Código no encontrado',
      '<div class="warnb">' + I.warn + '<span>He leído el código <b>' + esc(codigo) + '</b>, pero no aparece en '
      + (hayDiscogs() ? 'MusicBrainz ni en Discogs' : 'MusicBrainz') + '.'
      + (hayDiscogs() ? '' : ' Con un token de Discogs configurado se encuentran muchísimos más.') + '</span></div>'
      + '<p style="font-size:14px;color:var(--txt2);line-height:1.5;margin:0 0 4px">Puedes buscarlo por título, '
      + 'o darlo de alta a mano con el código ya guardado.</p>'
      + '<div class="group"><div class="grow"><label>Título</label><input id="cbT" type="text" placeholder="Nombre del álbum"></div>'
      + '<div class="grow"><label>Artista</label><input id="cbA" type="text" placeholder="Nombre del artista"></div></div>'
      + '<a class="lnk" target="_blank" rel="noopener" href="https://www.discogs.com/search/?q='
      + encodeURIComponent(codigo) + '&type=release">' + I.search + 'Buscar ' + esc(codigo) + ' en Discogs</a>',
      '<button type="button" class="btn" data-c2>Cerrar</button><button type="button" class="btn pri" id="altaMan">Crear ficha</button>');
    s.querySelector('[data-c2]').onclick = function(){ s.remove(); };
    s.querySelector('#altaMan').onclick = function(){
      var d = normDisc({
        id: uid(), codigoBarras: codigo,
        titulo: s.querySelector('#cbT').value.trim(),
        artista: s.querySelector('#cbA').value.trim(),
        fechaAlta: nowISO()
      });
      s.remove();
      if(d.titulo || d.artista){
        DB.discos.push(d);
        persist();
        toast('Ficha creada · buscando datos…');
        enrich(d.id, false).then(function(ok){ openDetail(d.id); });
      }else openForm(d);
    };
  });
}


/* ============================================================
   9. VISTAS
   ============================================================ */
window.PH_V = I.disc; window.PH_C = I.cd;

function renderAll(){ paintNav(); paintCol(); paintWish(); paintStats(); paintDb(); montarAyudas(document); }
function paintNav(){
  var n = coleccion().length, w = deseos().length;
  document.getElementById('navCount').textContent = n + (n === 1 ? ' disco' : ' discos') + (w ? ' · ' + w + ' en deseos' : '');
  pintarSync();
}
function setView(v){
  view = v;
  document.querySelectorAll('#tabs button, #tabbar button[data-v]').forEach(function(b){
    b.className = b.dataset.v === v ? 'on' : '';
    if(b.dataset.v === v) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  ['col','wish','stats','db'].forEach(function(x){ document.getElementById('v-' + x).className = 'view' + (x === v ? ' on' : ''); });
  document.getElementById('azbar').style.display = (v === 'col') ? '' : 'none';
  window.scrollTo({top:0, behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
}
function colorDe(d){
  if(d.color){ var seg = colorSeguro(d.color); if(seg) return 'rgb(' + seg + ')'; }
  var s = (d.artista || d.titulo || '?'), h = 0;
  for(var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return 'hsl(' + h + ',42%,42%)';
}
/* Si una portada falla al cargar, se reintenta una vez -muchas veces es un
   fallo pasajero de red, no que el enlace esté roto- antes de rendirse y
   mostrar el disco genérico. */
window.reintentarImg = function(img, placeholder){
  if(img.dataset.reintento){ img.outerHTML = window[placeholder]; return; }
  img.dataset.reintento = '1';
  var base = img.src;
  var sep = base.indexOf('?') >= 0 ? '&' : '?';
  setTimeout(function(){ img.src = base + sep + '_r=' + Date.now(); }, 900);
};
function coverHtml(d, cls){
  var ph = d.formato === 'Vinilo' ? I.disc : I.cd;
  if(!d.portada) return ph;
  var cual = d.formato === 'Vinilo' ? 'PH_V' : 'PH_C';
  /* sin "loading=lazy": Safari ha dado problemas reales con la carga diferida
     cuando el HTML se inserta de golpe por JavaScript en vez de venir ya en
     la página; el ancho y alto como atributos, no solo en el CSS, reservan
     el hueco cuadrado desde el primer instante, incluso antes de que la
     imagen empiece a decodificarse */
  return '<img src="' + esc(d.portada) + '" width="300" height="300" alt="" class="' + (cls || '')
    + '" data-img-retry="' + cual + '">';
}

function paintBanner(){
  var slot = document.getElementById('bannerSlot');
  if(!slot) return;
  if(bulk){
    var pct = Math.round(bulk.done / bulk.total * 100);
    slot.innerHTML = '<div class="banner fino"><div class="txt"><div class="t">' + bulk.done + ' de ' + bulk.total
      + ' · ' + bulk.ok + ' resueltas</div>'
      + '<div class="s">' + (bulk.actual ? esc(bulk.actual) : 'Buscando…') + '</div></div>'
      + '<div class="bar"><div style="width:' + pct + '%"></div></div>'
      + '<button type="button" class="btn sm" id="stopBtn">Parar</button></div>';
    var sb = document.getElementById('stopBtn');
    if(sb) sb.onclick = function(){ cancelBulk = true; toast('Deteniendo…'); };
    return;
  }
  if(!configurado()){
    slot.innerHTML = '<div class="banner warn"><div><div class="t">Modo consulta</div>'
      + '<div class="s">Puedes mirar y buscar. Para editar, conecta este dispositivo con tu token</div></div>'
      + '<button type="button" class="btn pri sm" id="cfgBtn">' + I.key + 'Conectar</button></div>';
    var cb = document.getElementById('cfgBtn');
    if(cb) cb.onclick = pantallaSync;
    return;
  }
  var p = pendientes();
  if(!p.length){ slot.innerHTML = ''; return; }
  slot.innerHTML = '<div class="banner"><div><div class="t">' + p.length + (p.length === 1 ? ' disco incompleto' : ' discos incompletos') + '</div>'
    + '<div class="s">Falta carátula, tracklist, género, año o sello</div></div>'
    + '<button type="button" class="btn pri sm" id="bulkBtn">' + I.spark + 'Completar automáticamente</button></div>';
  document.getElementById('bulkBtn').onclick = function(){ bulkRun(); };
}

function filtrados(base){
  var q = (document.getElementById('q').value || '').trim().toLowerCase();
  var dups = dupSet();
  return base.filter(function(d){
    if(fType === 'Vinilo' && d.formato !== 'Vinilo') return false;
    if(fType === 'CD' && d.formato !== 'CD') return false;
    if(fType === 'dup' && !dups[d.id]) return false;
    if(fType === 'rev' && d.confianza !== 'baja') return false;
    if(fType === 'inc' && !incompleto(d) && !d.faltan && d.mbid) return false;
    if(fType === 'noesc' && totalEscuchas(d) > 0) return false;
    if(fType === 'esc'){
      var a = String(new Date().getFullYear());
      if(!(d.escuchasFechas || []).some(function(f){ return String(f).slice(0, 4) === a; })) return false;
    }
    if(fType === 'fav' && (d.valoracion || 0) < 4) return false;
    if(fGen && d.genero !== fGen) return false;
    if(fArt && d.artista !== fArt) return false;
    if(fTag && d.etiquetas.indexOf(fTag) < 0) return false;
    if(fDec && (String(d['año']).slice(0, 3) + '0s') !== fDec) return false;
    if(fPais && d.pais !== fPais) return false;
    if(fSello && d.sello !== fSello) return false;
    if(q){
      var hay = plain([d.titulo, d.artista, d.sello, d.genero, d.numeroCatalogo, d.pais, d.notas, d.etiquetas.join(' ')].join(' ')
        + ' ' + d.tracklist.map(function(t){ return t.titulo; }).join(' '));
      if(hay.indexOf(plain(q)) < 0) return false;
    }
    return true;
  });
}
function claveOrden(s){
  return String(s || '').replace(/^(el|la|los|las|the|a|an|le|les)\s+/i, '').trim();
}
function ordenar(list){
  var l = list.slice();
  if(sortBy === 'random') return rngShuffle(l, randomSeed);
  l.sort(function(a, b){
    if(sortBy === 'artist') return claveOrden(a.artista).localeCompare(claveOrden(b.artista), 'es')
      || String(a['año'] || '').localeCompare(String(b['año'] || ''))
      || (a.titulo || '').localeCompare(b.titulo || '', 'es');
    if(sortBy === 'title') return claveOrden(a.titulo).localeCompare(claveOrden(b.titulo), 'es');
    if(sortBy === 'year-desc') return (parseInt(b['año']) || 0) - (parseInt(a['año']) || 0);
    if(sortBy === 'year-asc') return (parseInt(a['año']) || 9999) - (parseInt(b['año']) || 9999);
    if(sortBy === 'plays') return totalEscuchas(b) - totalEscuchas(a) || (a.artista || '').localeCompare(b.artista || '', 'es');
    if(sortBy === 'last') return String(b.ultimaEscucha || '').localeCompare(String(a.ultimaEscucha || ''));
    if(sortBy === 'rating') return (b.valoracion || 0) - (a.valoracion || 0) || totalEscuchas(b) - totalEscuchas(a);
    return String(b.fechaAlta || '').localeCompare(String(a.fechaAlta || ''));
  });
  return l;
}
function claveGrupo(d){
  if(grupo === 'artista') return d.artista || 'Sin artista';
  if(grupo === 'genero') return d.genero || 'Sin clasificar';
  if(grupo === 'decada') return d['año'] ? String(d['año']).slice(0, 3) + '0s' : 'Sin año';
  if(grupo === 'sello') return d.sello || 'Sin sello';
  if(grupo === 'pais') return d.pais ? (bandera(d.pais) + ' ' + nombrePais(d.pais)) : 'Sin país';
  if(grupo === 'formato') return d.formato;
  if(grupo === 'ubicacion') return d.ubicacion || 'Sin ubicar';
  return '';
}
function tileHtml(d, dups){
  var vin = d.formato === 'Vinilo';
  var hoy = escuchadoHoy(d);
  var falto = !d.portada || !d.tracklist.length || !d['año'] || !d.sello;
  return '<div class="tile' + (vin ? ' vin' : '') + (falto ? ' amedias' : '') + '" data-id="' + d.id
    + '"><div class="art">' + coverHtml(d)
    + '<span class="badge ' + (vin ? 'vin' : 'cd') + '" data-tip="' + (vin ? 'Vinilo' : 'CD') + '">' + (vin ? I.vinBadge : I.cdBadge) + '</span>'
    + (dups && dups[d.id] ? '<span class="pill dup">REPETIDO</span>' : (d.confianza === 'baja' ? '<span class="pill low">REVISAR</span>' : ''))
    + (d.prestadoA ? '<span class="pill lend">PRESTADO</span>' : '')
    + (readOnly ? '' : '<button type="button" class="oir' + (hoy ? ' hoy' : '') + '" aria-pressed="' + hoy + '" data-oir="' + d.id + '" data-tip="'
        + (hoy ? 'Quitar escucha de hoy' : 'Marcar que lo has escuchado') + '">' + (hoy ? I.check : I.playF) + '</button>')
    + (readOnly ? '' : '<button type="button" class="magic" data-ai="' + d.id + '" data-tip="Buscar los datos que falten">' + I.spark + '</button>')
    + '</div><div class="meta"><div class="t">' + (esc(d.titulo) || 'Sin título') + '</div>'
    + '<div class="a">' + (esc(d.artista) || 'Artista desconocido') + '</div>'
    + '<div class="y"><span class="txt">' + (d['año'] || '—') + (d.genero ? ' · ' + esc(d.genero) : '')
    + (totalEscuchas(d) ? ' · ▶ ' + totalEscuchas(d) : '') + '</span>'
    + (d.valoracion ? estrellasHtml(d.valoracion) : '') + '</div></div></div>';
}
function filaListaHtml(d, dups){
  /* la información que antes faltaba llena el centro de la fila */
  var medio = [
    d.genero || '',
    d.sello || '',
    d.pais && PAISES[d.pais] ? nombrePais(d.pais) : '',
    totalEscuchas(d) ? totalEscuchas(d) + (totalEscuchas(d) === 1 ? ' escucha' : ' escuchas') : '',
    d.tracklist.length ? d.tracklist.length + ' temas' : '',
    duracionTotal(d) || '',
    d.ubicacion || ''
  ].filter(Boolean).slice(0, 4).join('  ·  ');
  return '<div class="lrow" data-id="' + d.id + '"><div class="mini">' + coverHtml(d) + '</div>'
    + '<div class="c1"><div class="t">' + (esc(d.titulo) || 'Sin título') + '</div>'
      + '<div class="a">' + esc(d.artista) + '</div></div>'
    + '<div class="cm">' + esc(medio) + '</div>'
    + (d.valoracion ? '<div class="cs">' + estrellasHtml(d.valoracion) + '</div>' : '')
    + '<div class="c3">' + (d['año'] || '') + '</div>'
    + '<div class="c4"><span class="sop ' + (d.formato === 'Vinilo' ? 'vin' : 'cd') + '">'
    + (d.formato === 'Vinilo' ? I.vinBadge : I.cdBadge) + '</span></div></div>';
}
function listHtml(items, dups){
  return '<div class="lista">' + items.map(function(d){ return filaListaHtml(d, dups); }).join('') + '</div>';
}
function shelfHtml(items){
  var vinilos = items.filter(function(d){ return d.formato === 'Vinilo'; });
  var cds = items.filter(function(d){ return d.formato === 'CD'; });
  var bloques = [];
  if(vinilos.length) bloques.push({t:'Vinilos', n:vinilos.length, lista:vinilos, icono:I.vinBadge});
  if(cds.length) bloques.push({t:'CDs', n:cds.length, lista:cds, icono:I.cdBadge});
  return bloques.map(function(b){
    return '<div class="pila"><div class="pilahd">' + b.icono + '<h4>' + b.t + '</h4><span>' + b.n + '</span></div>'
      + estantes(b.lista) + '</div>';
  }).join('');
}
/* Coloca los lomos en estantes, agrupados por artista */
function estantes(items){
  var grupos = [], actual = null;
  items.forEach(function(d){
    var a = d.artista || '—';
    if(!actual || actual.a !== a){ actual = {a:a, lista:[]}; grupos.push(actual); }
    actual.lista.push(d);
  });
  var esCD = items[0] && items[0].formato === 'CD';
  var anchoLomo = esCD ? 26 : 36;
  var filas = [], fila = [], ancho = 0;
  var max = Math.max(6, Math.floor((Math.min(window.innerWidth, 1320) - 100) / anchoLomo));
  grupos.forEach(function(g){
    if(ancho + g.lista.length > max && fila.length){ filas.push(fila); fila = []; ancho = 0; }
    fila.push(g); ancho += g.lista.length;
  });
  if(fila.length) filas.push(fila);
  return '<div class="shelfwrap">' + filas.map(function(f){
    return '<div class="shelf-sec"><div class="shelfrow"><div class="shelf">'
      + f.map(function(g){
          return g.lista.map(function(d){
            var c = colorDe(d);
            return '<div class="spine' + (d.formato === 'CD' ? ' cd' : '') + '" data-id="' + d.id + '"'
              + ' data-peek="' + d.id + '" style="background:linear-gradient(96deg,' + c
              + ',color-mix(in srgb,' + c + ' 62%, #000))">'
              + '<span style="color:' + textoSobre(d) + '">' + esc(d.titulo) + '</span></div>';
          }).join('');
        }).join('')
      + '</div></div><div class="shelf-base"></div></div>';
  }).join('') + '</div>';
}
/* Blanco o negro según lo claro que sea el lomo */
function textoSobre(d){
  if(!d.color) return '#fff';
  var p = String(d.color).split(',').map(Number);
  var lum = (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) / 255;
  return lum > 0.62 ? 'rgba(20,20,22,.92)' : '#fff';
}
/* Calcula en segundo plano el color dominante que falte, para que los lomos
   tengan el color real de su portada */
var calculandoColor = false;
function coloresParaEstanteria(items){
  if(calculandoColor) return;
  var faltan = items.filter(function(d){ return d.portada && !d.color; }).slice(0, 60);
  if(!faltan.length) return;
  calculandoColor = true;
  var i = 0, hechos = 0;
  var siguiente = function(){
    if(i >= faltan.length){
      calculandoColor = false;
      if(hechos) paintCol();
      return;
    }
    var d = faltan[i++];
    colorDominante(d.portada).then(function(c){
      d.color = c; hechos++;
      persist(true);
    }).catch(function(){}).then(function(){ setTimeout(siguiente, 30); });
  };
  for(var k = 0; k < 4; k++) setTimeout(siguiente, k * 60);
}
/* Deslizar una portada hacia la derecha marca la escucha de hoy */
function montarDeslizarEscucha(root){
  if(readOnly) return;
  root.querySelectorAll('.tile').forEach(function(el){
    var art = el.querySelector('.art');
    if(!art || el.dataset.desliz) return;
    el.dataset.desliz = '1';
    var x0 = null, y0 = 0, dx = 0, activo = false;
    art.addEventListener('touchstart', function(e){
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; activo = false;
      art.style.transition = 'none';
    }, {passive:true});
    art.addEventListener('touchmove', function(e){
      if(x0 === null) return;
      dx = e.touches[0].clientX - x0;
      var dy = Math.abs(e.touches[0].clientY - y0);
      if(!activo){
        if(dx > 14 && dx > dy * 1.6) activo = true;
        else if(dy > 12){ x0 = null; return; }
      }
      if(!activo) return;
      var d = Math.min(dx, 90);
      art.style.transform = 'translateX(' + d + 'px)';
      art.style.opacity = 1 - d / 260;
      if(e.cancelable) e.preventDefault();
    }, {passive:false});
    var soltar = function(){
      if(x0 === null) return;
      art.style.transition = 'transform .3s var(--ease),opacity .3s';
      art.style.transform = '';
      art.style.opacity = '';
      if(activo && dx > 70){
        var puesto = marcarEscucha(el.dataset.id);
        var d2 = DB.discos.filter(function(z){ return z.id === el.dataset.id; })[0];
        var y = el.querySelector('.meta .y .txt');
        if(y && d2) y.textContent = (d2['año'] || '—') + (d2.genero ? ' · ' + d2.genero : '')
          + (totalEscuchas(d2) ? ' · ▶ ' + totalEscuchas(d2) : '');
        art.insertAdjacentHTML('beforeend', '<span class="marcado">' + (puesto ? I.check : I.x) + '</span>');
        setTimeout(function(){
          var m = art.querySelector('.marcado');
          if(m) m.remove();
        }, 900);
        refrescarContadores();
      }
      x0 = null; dx = 0; activo = false;
    };
    art.addEventListener('touchend', soltar);
    art.addEventListener('touchcancel', soltar);
  });
}
function montarPeek(root){
  var peek = document.getElementById('shelfPeek');
  if(!peek){
    peek = document.createElement('div');
    peek.id = 'shelfPeek';
    peek.className = 'shelf-peek';
    document.body.appendChild(peek);
  }
  var ocultar = function(){ peek.classList.remove('on'); };
  root.querySelectorAll('[data-peek]').forEach(function(el){
    el.onmouseenter = function(){
      var d = DB.discos.filter(function(x){ return x.id === el.dataset.peek; })[0];
      if(!d) return;
      peek.innerHTML = (d.portada ? '<img class="pimg" src="' + esc(d.portada) + '" alt="" data-img-error="dim">'
          : '<div class="pimg"></div>')
        + '<div class="pinf"><div class="pt">' + esc(d.titulo) + '</div>'
        + '<div class="pa">' + esc(d.artista) + '</div>'
        + '<div class="py">' + [d['año'], d.formato, d.sello].filter(Boolean).join(' · ') + '</div></div>';
      var r = el.getBoundingClientRect();
      var x = Math.min(window.innerWidth - 206, Math.max(10, r.left + r.width / 2 - 95));
      var arriba = r.top > 300;
      peek.style.left = x + 'px';
      peek.style.top = (arriba ? r.top - 290 : r.bottom + 14) + 'px';
      peek.classList.add('on');
    };
    el.onmouseleave = ocultar;
  });
  root.addEventListener('scroll', ocultar, {passive:true});
  window.addEventListener('scroll', ocultar, {passive:true});
}
function bloque(items, dups){
  if(modo === 'list') return listHtml(items, dups);
  if(modo === 'shelf') return shelfHtml(items);
  return '<div class="grid">' + items.map(function(d){ return tileHtml(d, dups); }).join('') + '</div>';
}


function quickAlbumHtml(d){
  return '<div class="quick-album" data-quick-disco="' + d.id + '"><div class="qa-art">' + coverHtml(d) + '</div>'
    + '<div class="qa-title">' + esc(d.titulo || 'Sin título') + '</div>'
    + '<div class="qa-artist">' + esc(d.artista || 'Artista desconocido') + '</div></div>';
}
function listaRecienAnadidos(){
  return coleccion().slice().sort(function(a,b){
    return String(b.fechaAlta || '').localeCompare(String(a.fechaAlta || ''));
  }).slice(0,24);
}
function listaVolverAPoner(){
  var ds = coleccion();
  var escuchados = ds.filter(function(d){ return d.ultimaEscucha; }).sort(function(a,b){
    return String(a.ultimaEscucha).localeCompare(String(b.ultimaEscucha));
  });
  var nunca = ds.filter(function(d){ return !d.ultimaEscucha && totalEscuchas(d) === 0; }).sort(function(a,b){
    return String(a.fechaAlta || '').localeCompare(String(b.fechaAlta || ''));
  });
  return escuchados.concat(nunca).slice(0,24);
}
function abrirSeleccionColeccion(tipo){
  var lista = tipo === 'recientes' ? listaRecienAnadidos() : listaVolverAPoner();
  var titulo = tipo === 'recientes' ? 'Recién añadidos' : 'Vuelve a ponerlos';
  var sub = tipo === 'recientes'
    ? 'Lo último que ha entrado en tu colección.'
    : 'Discos que llevan más tiempo sin sonar, más algunos que aún no has estrenado.';
  var body = '<p style="font-size:13.5px;color:var(--txt2);margin:0 0 14px">' + esc(sub) + '</p>'
    + (lista.length ? '<div class="quick-albums">' + lista.map(quickAlbumHtml).join('') + '</div>'
      : '<div class="tl-empty">No hay discos para mostrar.</div>');
  var sh = sheet(titulo, body, null, true);
  sh.querySelectorAll('[data-quick-disco]').forEach(function(el){
    el.onclick = function(){ sh.remove(); openDetail(el.dataset.quickDisco); };
  });
}
function pintarAppleHome(){
  var box = document.getElementById('musicHome');
  if(!box) return;
  var qel = document.getElementById('q');
  var hayFiltro = fType !== 'all' || fGen || fArt || fTag || fDec || fPais || fSello
    || grupo !== 'none' || (qel && qel.value.trim());
  if(hayFiltro || !coleccion().length){ box.innerHTML = ''; return; }
  box.innerHTML = '<div class="music-home"><div class="collection-actions">'
    + '<button type="button" class="collection-action primary" data-collection-action="sesion">' + I.playF + 'Qué escucho ahora</button>'
    + '<button type="button" class="collection-action" data-collection-action="explorar">' + I.spark + 'Explorar</button>'
    + '<button type="button" class="collection-action" data-collection-action="recientes">' + I.plus + 'Recién añadidos</button>'
    + '<button type="button" class="collection-action" data-collection-action="volver">' + I.reloj2 + 'Vuelve a ponerlos</button>'
    + '</div></div>';
  box.querySelectorAll('[data-collection-action]').forEach(function(el){
    el.onclick = function(){
      var a = el.dataset.collectionAction;
      if(a === 'sesion') sesionEscucha();
      else if(a === 'explorar') explorarColeccion();
      else if(a === 'recientes') abrirSeleccionColeccion('recientes');
      else if(a === 'volver') abrirSeleccionColeccion('volver');
    };
  });
}

function paintCol(){
  if(!document.getElementById('board')) return;
  var dups = dupSet();
  var base = coleccion();
  pintarAppleHome();

  var gsel = document.getElementById('fGenre');
  var gs = [];
  base.forEach(function(d){ if(d.genero && gs.indexOf(d.genero) < 0) gs.push(d.genero); });
  gs.sort();
  gsel.innerHTML = '<option value="">Todos los géneros</option>'
    + gs.map(function(g){ return '<option value="' + esc(g) + '"' + (g === fGen ? ' selected' : '') + '>' + esc(g) + '</option>'; }).join('');

  var chips = [];
  if(fArt) chips.push(['artista', fArt]);
  if(fTag) chips.push(['etiqueta', fTag]);
  if(fDec) chips.push(['década', fDec]);
  if(fPais) chips.push(['país', nombrePais(fPais)]);
  if(fSello) chips.push(['sello', fSello]);
  document.getElementById('activeChips').innerHTML = chips.map(function(c){
    return '<span class="chipf">' + esc(c[1]) + '<button type="button" data-clear="' + c[0] + '">' + I.x + '</button></span>';
  }).join('');
  document.querySelectorAll('[data-clear]').forEach(function(b){
    b.onclick = function(){
      var k = b.dataset.clear;
      if(k === 'artista') fArt = ''; if(k === 'etiqueta') fTag = ''; if(k === 'década') fDec = '';
      if(k === 'país') fPais = ''; if(k === 'sello') fSello = '';
      paintCol();
    };
  });

  var list = ordenar(filtrados(base));

  var nv = base.filter(function(d){ return d.formato === 'Vinilo'; }).length;
  var nc = base.filter(function(d){ return d.formato === 'CD'; }).length;
  var anio = String(new Date().getFullYear());
  var esteAnio = base.filter(function(d){
    return (d.escuchasFechas || []).some(function(f){ return String(f).slice(0, 4) === anio; });
  }).length;
  var segs = 0;
  base.forEach(function(d){
    d.tracklist.forEach(function(t){
      var m = String(t.duracion || '').match(/^(\d+):(\d{2})$/);
      if(m) segs += (+m[1]) * 60 + (+m[2]);
    });
  });
  var horas = segs / 3600;

  pintarResumenColeccion();
  document.getElementById('kpis').innerHTML =
      kpi(I.layers, 'Discos', base.length, 'var(--blue)')
    + kpi(I.vinBadge, 'Vinilos', nv, 'var(--purple)')
    + kpi(I.cdBadge, 'CDs', nc, 'var(--teal)')
    + kpi(I.reloj2, 'Horas de música', (horas >= 10 ? Math.round(horas) : horas.toFixed(1)) + '<small>h</small>', 'var(--orange)')
    + kpi(I.playF, 'Escuchados en ' + anio, esteAnio, 'var(--green)', 'esc');

  document.querySelectorAll('[data-kpi]').forEach(function(el){
    el.onclick = function(){
      fType = el.dataset.kpi;
      document.querySelectorAll('#segType button').forEach(function(x){ x.className = ''; });
      var b = document.querySelector('#segType [data-f=' + fType + ']');
      if(b) b.className = 'on';
      else document.querySelector('#segType [data-f=all]').className = 'on';
      paintCol();
    };
  });

  paintBanner();

  var board = document.getElementById('board');
  if(!list.length){
    pararCargaIncremental();
    board.innerHTML = '<div class="blank">' + I.music + '<h3>' + (base.length ? 'Sin resultados' : 'Tu discoteca está vacía')
      + '</h3><p>' + (base.length ? 'Prueba con otra búsqueda o quita algún filtro.' : 'Añade un disco o importa tu CSV de Discogs.') + '</p></div>';
    pintarAZ([]);
    return;
  }

  if(grupo === 'none'){
    if((modo === 'grid' || modo === 'list') && list.length > LOTE_TAM){
      var primerLote = list.slice(0, LOTE_TAM);
      board.innerHTML = (modo === 'list')
        ? '<div class="lista">' + primerLote.map(function(d){ return filaListaHtml(d, dups); }).join('') + '</div>'
        : '<div class="grid">' + primerLote.map(function(d){ return tileHtml(d, dups); }).join('') + '</div>';
      configurarCargaIncremental(board, list, dups);
    }else{
      pararCargaIncremental();
      board.innerHTML = bloque(list, dups);
    }
    pintarAZ(sortBy === 'artist' || sortBy === 'title' ? list.map(function(d){ return (sortBy === 'artist' ? d.artista : d.titulo); }) : []);
  }else{
    pararCargaIncremental();
    var orden = [], mapa = {};
    list.forEach(function(d){
      var k = claveGrupo(d);
      if(!mapa[k]){ mapa[k] = []; orden.push(k); }
      mapa[k].push(d);
    });
    if(grupo === 'artista' || grupo === 'sello' || grupo === 'pais' || grupo === 'genero' || grupo === 'ubicacion'){
      orden.sort(function(a, b){ return claveOrden(a).localeCompare(claveOrden(b), 'es'); });
    }
    if(grupo === 'decada') orden.sort();
    board.innerHTML = orden.map(function(k, i){
      var items = mapa[k];
      var av = items.filter(function(d){ return d.portada; })[0];
      return '<section class="gsec" id="g' + i + '"><div class="ghead">'
        + (grupo === 'artista' && av ? '<img class="gav" src="' + esc(av.portada) + '" alt="" loading="lazy" data-img-error="hide">' : '')
        + '<h3>' + esc(k) + '</h3><span class="n">' + items.length + '</span>'
        + (grupo === 'artista' && !readOnly ? '<button type="button" class="btn xs gbtn" data-gaps="' + esc(k) + '">' + I.gap + 'Huecos</button>' : '')
        + '<button type="button" class="btn xs gbtn" data-only="' + esc(k) + '">Ver solo</button>'
        + '</div>' + bloque(items, dups) + '</section>';
    }).join('');
    pintarAZ(orden, true);
    board.querySelectorAll('[data-gaps]').forEach(function(b){
      b.onclick = function(e){ e.stopPropagation(); verHuecos(b.dataset.gaps); };
    });
    board.querySelectorAll('[data-only]').forEach(function(b){
      b.onclick = function(e){
        e.stopPropagation();
        var k = b.dataset.only;
        if(grupo === 'artista') fArt = k;
        else if(grupo === 'genero') fGen = k;
        else if(grupo === 'sello') fSello = k;
        else if(grupo === 'decada') fDec = k;
        grupo = 'none';
        document.getElementById('selGroup').value = 'none';
        paintCol();
      };
    });
  }
  pintarListas();
  /* Las recomendaciones avanzadas ya no ocupan espacio por defecto:
     se abren solo cuando el usuario pulsa «Explorar». */
  var sugerencias = document.getElementById('sugerencias');
  if(sugerencias) sugerencias.innerHTML = '';
  enlazarTiles(board, dups);
  if(modo === 'shelf'){ montarPeek(board); coloresParaEstanteria(list); }
  montarPulsacionLarga(board);
  montarDeslizarEscucha(board);
  if(modo === 'grid'){
    var tiles = board.querySelectorAll('.tile');
    for(var i = 0; i < tiles.length && i < 40; i++) tiles[i].style.animationDelay = (i * 22) + 'ms';
  }
}
function kpi(icon, label, val, color, filtro){
  return '<div class="kpi' + (filtro ? ' click" data-kpi="' + filtro : '') + '">'
    + '<div class="ico" style="background:color-mix(in srgb,' + color + ' 15%, transparent);color:' + color + '">' + icon + '</div>'
    + '<div style="min-width:0"><div class="lbl">' + label + '</div><div class="val">' + val + '</div></div></div>';
}
/* ============================================================
   CARGA INCREMENTAL DE LA REJILLA Y LA LISTA
   Con colecciones grandes, meter todas las fichas en la pantalla de
   golpe es lo que hacía que pintar la colección se volviera lento e
   incluso llegara a colgarse. Se pintan solo las primeras y el resto
   se añade solo cuando de verdad hace falta, al acercarte al final.
   Nada de esto toca los datos ni cambia cómo se ven grupos, listas
   pequeñas o el modo estantería, que se quedan igual que siempre.
   ============================================================ */
var LOTE_TAM = 80;
var _paginacion = {observer: null, lista: [], dups: null, mostrados: 0};
function pararCargaIncremental(){
  if(_paginacion.observer){ _paginacion.observer.disconnect(); _paginacion.observer = null; }
}
function configurarCargaIncremental(board, listaCompleta, dups){
  pararCargaIncremental();
  _paginacion.lista = listaCompleta;
  _paginacion.dups = dups;
  _paginacion.mostrados = Math.min(LOTE_TAM, listaCompleta.length);
  if(listaCompleta.length <= LOTE_TAM) return;
  /* las tandas siguientes tienen que entrar DENTRO de la rejilla o la lista,
     no como hijos sueltos de #board, o pierden las columnas del grid y
     ocupan todo el ancho de la pantalla */
  var contenedor = board.querySelector(modo === 'list' ? '.lista' : '.grid');
  if(!contenedor) return;
  if(typeof IntersectionObserver === 'undefined'){
    /* sin IntersectionObserver, no hay forma de saber cuándo cargar más
       sobre la marcha: se pinta la colección entera de una vez, para que
       siga viéndose completa en vez de cortada en los primeros 80 */
    var resto = _paginacion.lista.slice(_paginacion.mostrados);
    var htmlResto = (modo === 'list')
      ? resto.map(function(d){ return filaListaHtml(d, dups); }).join('')
      : resto.map(function(d){ return tileHtml(d, dups); }).join('');
    contenedor.insertAdjacentHTML('beforeend', htmlResto);
    enlazarTiles(board, dups);
    montarPulsacionLarga(board);
    montarDeslizarEscucha(board);
    _paginacion.mostrados = _paginacion.lista.length;
    return;
  }
  var centinela = document.createElement('div');
  centinela.id = 'masDiscos';
  centinela.className = 'mas-discos';
  centinela.textContent = 'Cargando más…';
  board.appendChild(centinela);
  var cargarSiguienteLote = function(){
    var antes = _paginacion.mostrados;
    var siguiente = _paginacion.lista.slice(antes, antes + LOTE_TAM);
    if(!siguiente.length) return;
    var html = (modo === 'list')
      ? siguiente.map(function(d){ return filaListaHtml(d, _paginacion.dups); }).join('')
      : siguiente.map(function(d){ return tileHtml(d, _paginacion.dups); }).join('');
    var previos = contenedor.querySelectorAll('.tile,.lrow').length;
    contenedor.insertAdjacentHTML('beforeend', html);
    var todos = contenedor.querySelectorAll('.tile,.lrow');
    var nuevosEl = Array.prototype.slice.call(todos, previos);
    var raizNueva = {querySelectorAll: function(sel){
      return nuevosEl.filter(function(el){ return el.matches(sel); });
    }};
    enlazarTiles(board, _paginacion.dups);
    montarPulsacionLarga(raizNueva);
    montarDeslizarEscucha(raizNueva);
    _paginacion.mostrados = antes + siguiente.length;
    if(_paginacion.mostrados >= _paginacion.lista.length){
      pararCargaIncremental();
      centinela.remove();
    }
  };
  _paginacion.cargarHasta = function(indice){
    /* usado por el índice A-Z: si saltas a una letra que aún no está
       cargada, se completa hasta ahí antes de desplazar la pantalla */
    while(_paginacion.mostrados <= indice && _paginacion.mostrados < _paginacion.lista.length) cargarSiguienteLote();
  };
  _paginacion.observer = new IntersectionObserver(function(entradas){
    if(entradas[0].isIntersecting) cargarSiguienteLote();
  }, {rootMargin: '600px'});
  _paginacion.observer.observe(centinela);
}


function enlazarTiles(root, dups){
  root.querySelectorAll('.tile,.lrow,.spine').forEach(function(t){
    t.onclick = function(e){
      if(e.target.closest('[data-ai]') || e.target.closest('[data-oir]') || e.target.closest('[data-comprado]')) return;
      if(selMulti){ alternarSeleccion(t.dataset.id); return; }
      openDetail(t.dataset.id, t.querySelector('.art') || t.querySelector('.mini'));
    };
    if(selMulti && seleccion[t.dataset.id]) t.classList.add('sel');
  });
  root.querySelectorAll('[data-oir]').forEach(function(b){
    b.onclick = function(e){
      e.stopPropagation();
      var puesto = marcarEscucha(b.dataset.oir);
      b.className = 'oir' + (puesto ? ' hoy' : '');
      microFeedback(b);
      b.innerHTML = puesto ? I.check : I.playF;
      b.dataset.tip = puesto ? 'Quitar escucha de hoy' : 'Marcar que lo has escuchado';
      b.setAttribute('aria-pressed', String(puesto));
      b.setAttribute('aria-label', b.dataset.tip);
      var d = DB.discos.filter(function(x){ return x.id === b.dataset.oir; })[0];
      var y = b.closest('.tile') && b.closest('.tile').querySelector('.meta .y .txt');
      if(y && d) y.textContent = (d['año'] || '—') + (d.genero ? ' · ' + d.genero : '')
        + (totalEscuchas(d) ? ' · ▶ ' + totalEscuchas(d) : '');
      refrescarContadores();
    };
  });
  root.querySelectorAll('[data-ai]').forEach(function(b){
    b.onclick = function(e){
      e.stopPropagation();
      b.classList.add('busy'); b.disabled = true;
      enrich(b.dataset.ai, true).then(function(ok){
        toast(ok ? 'Ficha actualizada' : 'No se encontró el disco · prueba a pegar su URL de MusicBrainz', !ok);
        paintCol();
      });
    };
  });
}
/* Actualiza solo los contadores, sin repintar toda la rejilla */
/* Único sitio que pinta la tira de resumen de la colección, para que
   nunca vuelva a haber dos versiones que se contradigan entre sí. */
function pintarResumenColeccion(){
  var res = document.getElementById('resumen');
  if(!res) return;
  var base = coleccion();
  var nv = base.filter(function(d){ return d.formato === 'Vinilo'; }).length;
  var nc = base.length - nv;
  var segs = 0;
  base.forEach(function(d){
    d.tracklist.forEach(function(t){
      var m = String(t.duracion || '').match(/^(\d+):(\d{2})$/);
      if(m) segs += (+m[1]) * 60 + (+m[2]);
    });
  });
  var horas = segs / 3600;
  var cel = function(icono, valor, etiqueta, clase){
    return '<div class="rcol"><span class="ri">' + icono + '</span>'
      + '<span class="v ' + (clase || '') + '">' + valor + '</span>'
      + '<span class="k">' + etiqueta + '</span></div>';
  };
  res.innerHTML = cel(I.layers, base.length, 'discos')
    + cel(I.vinBadge, nv, 'vinilos', 'rvin')
    + cel(I.cdBadge, nc, 'CDs', 'rcd')
    + cel(I.reloj2, (horas >= 10 ? Math.round(horas) : horas.toFixed(1)), 'de música');
}
function refrescarContadores(){ pintarResumenColeccion(); }
function pintarAZ(claves, esGrupo){
  var bar = document.getElementById('azbar');
  if(!claves || !claves.length || modo === 'shelf'){ bar.innerHTML = ''; return; }
  var letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');
  var dest = {};
  claves.forEach(function(k, i){
    var L = (String(k).replace(/^(el|la|los|las|the|a|an)\s+/i, '').trim()[0] || '#').toUpperCase();
    if(!/[A-Z]/.test(L)) L = '#';
    if(dest[L] === undefined) dest[L] = esGrupo ? ('g' + i) : i;
  });
  bar.innerHTML = letras.map(function(L){
    return '<button type="button" data-l="' + L + '"' + (dest[L] === undefined ? ' disabled' : '') + '>' + L + '</button>';
  }).join('');
  bar.querySelectorAll('button').forEach(function(b){
    b.onclick = function(){
      var t = dest[b.dataset.l];
      if(t === undefined) return;
      if(!esGrupo && _paginacion.cargarHasta) _paginacion.cargarHasta(t);
      var el = esGrupo ? document.getElementById(t) : document.querySelectorAll('.tile,.lrow')[t];
      if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
    };
  });
}

/* ---------- deseos ---------- */
function paintWish(){
  var box = document.getElementById('wishBody');
  if(!box) return;
  var ds = deseos();
  var valor = ds.reduce(function(a, d){
    return a + ((d.tecnica && d.tecnica.valor) || 0);
  }, 0);
  var head = '<div class="wishhd">'
    + '<div class="wlamp">' + I.lampara + '</div>'
    + '<div class="wtxt"><div class="wt">Lista de deseos</div>'
    + '<div class="ws">' + (ds.length
        ? ds.length + (ds.length === 1 ? ' disco que quieres conseguir' : ' discos que quieres conseguir')
          + (valor ? ' · desde ' + valor.toFixed(0) + ' €' : '')
        : 'Aquí van los discos que buscas') + '</div></div>'
    + (readOnly ? '' : '<button type="button" class="btn pri" id="addWish">' + I.plus + 'Añadir</button>') + '</div>';
  if(!ds.length){
    box.innerHTML = head + '<div class="blank wishblank">' + I.lampara + '<h3>Aún no hay nada</h3><p>Los discos que añadas aquí se completan igual que los de tu colección.</p></div>';
  }else{
    var gasto = ds.reduce(function(a, d){ return a + (d.valorMercado || 0); }, 0);
    box.innerHTML = head
      + (gasto ? '<div class="banner" style="border-left-color:var(--pink)"><div><div class="t">Valor estimado de la lista: ' + gasto.toFixed(0) + ' €</div>'
        + '<div class="s">Según los precios que hayas anotado</div></div></div>' : '')
      + '<div class="grid">' + ds.map(function(d){
          return tileHtml(d, null).replace('</div><div class="meta">',
            (readOnly ? '' : '<button type="button" class="gotit" data-comprado="' + d.id + '">' + I.carrito + 'Ya lo tengo</button>') + '</div><div class="meta">');
        }).join('') + '</div>';
    enlazarTiles(box, null);
    box.querySelectorAll('[data-comprado]').forEach(function(b){
      b.onclick = function(e){ e.stopPropagation(); marcarComprado(b.dataset.comprado); };
    });
  }
  var aw = document.getElementById('addWish');
  if(aw) aw.onclick = function(){ openForm(null, 'deseos'); };
}

/* ---------- paleta de búsqueda ⌘K ---------- */
/* Interpreta lo que escribes: 1987, Geffen, vinilo, España, 5 estrellas… */
function buscarInteligente(q){
  var ds = coleccion();
  var termino = plain(q);
  var out = [], vistos = {};
  var mete = function(d, por){
    if(vistos[d.id]) return;
    vistos[d.id] = 1;
    out.push({d:d, por:por});
  };
  /* año o década */
  var mAnio = q.match(/^(19|20)\d{2}$/);
  if(mAnio) ds.filter(function(d){ return String(d['año']) === q; }).forEach(function(d){ mete(d, 'de ' + q); });
  var mDec = q.match(/^(los\s+)?(\d{2})s?$/i);
  if(mDec){
    var base = +mDec[2] > 30 ? 1900 + (+mDec[2]) : 2000 + (+mDec[2]);
    ds.filter(function(d){
      var y = parseInt(d['año']);
      return y >= base && y < base + 10;
    }).forEach(function(d){ mete(d, 'de los ' + mDec[2]); });
  }
  /* formato */
  if(/^(vinilo|vinilos|lp)$/.test(termino))
    ds.filter(function(d){ return d.formato === 'Vinilo'; }).forEach(function(d){ mete(d, 'vinilo'); });
  if(/^(cd|cds)$/.test(termino))
    ds.filter(function(d){ return d.formato === 'CD'; }).forEach(function(d){ mete(d, 'CD'); });
  /* valoración */
  var mEst = q.match(/^([1-5])\s*(estrellas?|\*)?$/i);
  if(mEst && /estrella|\*/.test(q))
    ds.filter(function(d){ return d.valoracion === +mEst[1]; }).forEach(function(d){ mete(d, mEst[1] + ' estrellas'); });
  /* sello, país, género, etiqueta y ubicación */
  ds.forEach(function(d){
    if(d.sello && plain(d.sello).indexOf(termino) >= 0) mete(d, d.sello);
    else if(d.genero && plain(d.genero).indexOf(termino) >= 0) mete(d, d.genero);
    else if(d.pais && PAISES[d.pais] && plain(nombrePais(d.pais)).indexOf(termino) >= 0) mete(d, nombrePais(d.pais));
    else if(d.ubicacion && plain(d.ubicacion).indexOf(termino) >= 0) mete(d, d.ubicacion);
    else if((d.etiquetas || []).some(function(t){ return plain(t).indexOf(termino) >= 0; })) mete(d, 'etiqueta');
  });
  return out;
}
function abrirPaleta(){
  if(document.querySelector('.pal')) return;
  var origen = document.activeElement;
  var p = document.createElement('div');
  p.className = 'pal';
  var tactil = window.matchMedia && window.matchMedia('(hover: none)').matches;
  p.innerHTML = '<div class="palbox"><div class="palin">' + I.search
    + '<input id="pq" role="combobox" aria-label="Buscar en la colección" aria-autocomplete="list" aria-expanded="true" aria-controls="pres" placeholder="Disco, artista, canción, 1987, Geffen…" autocomplete="off">'
    + '<button type="button" class="palx" id="palCerrar" aria-label="Cerrar">' + I.x + '</button></div>'
    + '<div class="palres" id="pres" role="listbox" aria-label="Resultados y acciones"></div>'
    + (tactil ? '<div class="palhint"><span>Toca fuera para cerrar</span></div>'
      : '<div class="palhint"><span>↑↓ moverse</span><span>↵ abrir</span><span>esc cerrar</span></div>') + '</div>';
  document.body.appendChild(p);
  var inp = p.querySelector('#pq'), res = p.querySelector('#pres'), sel = 0, items = [];
  var cerrarPal = cerrar;
  p.querySelector('#palCerrar').onclick = cerrarPal;
  p.addEventListener('click', function(e){ if(e.target === p) cerrarPal(); });
  var acciones = [
    {t:'Añadir disco', s:'Nueva ficha', k:'Acción', i:I.plus, run:function(){ openForm(null); }},
    {t:'Añadir a deseos', s:'Lista de deseos', k:'Acción', i:I.lampara, run:function(){ openForm(null, 'deseos'); }},
    {t:'Modo tienda', s:'Escanear estando en una tienda', k:'Acción', i:I.scan, run:function(){ modoTienda(); }},
    {t:'Escanear código de barras', s:'Alta con la cámara', k:'Acción', i:I.scan, run:function(){ escanear(); }},
    {t:'Completar fichas', s:'Rellena lo que esté incompleto', k:'Acción', i:I.spark, run:function(){ setView('col'); bulkRun(); }},
    {t:'Revisar y actualizar todo', s:'Repasa la colección entera', k:'Acción', i:I.refresh, run:pantallaRevision},
    {t:'Sorpréndeme', s:'Un disco al azar', k:'Acción', i:I.aleatorio, run:function(){ discoAlAzar(); }},
    {t:'Estadísticas', s:'Gráficos de la colección', k:'Ir a', i:I.aguja, run:function(){ setView('stats'); }},
    {t:'Radar de la colección', s:'Lo que merece tu atención', k:'Acción', i:I.warn, run:radarColeccion},
    {t:'Qué escucho ahora', s:'Sesión por tiempo disponible', k:'Acción', i:I.playF, run:sesionEscucha},
    {t:'El ADN de tu colección', s:'Perfil sacado de tus propios datos', k:'Acción', i:I.vinResumen, run:adnMusical},
    {t:'Tendencia de escucha', s:'Cómo ha cambiado mes a mes', k:'Acción', i:I.aguja, run:tendenciaEscucha},
    {t:'Ajustes', s:'Sincronía, copias, herramientas', k:'Ir a', i:I.db, run:function(){ setView('db'); }},
    {t:'Catálogo imprimible', s:'Con portadas, listo para PDF', k:'Acción', i:I.hojaDisco, run:catalogoImprimible},
    {t:'Copia de seguridad', s:'Descarga un JSON con todo', k:'Acción', i:I.save, run:exportBackup}
  ];
  function pinta(){
    var q = inp.value.trim().toLowerCase();
    items = [];
    if(q){
      var vistos = 0;
      DB.discos.forEach(function(d){
        if(vistos >= 8) return;
        var enFicha = plain(d.titulo + ' ' + d.artista + ' ' + d.sello).indexOf(plain(q)) >= 0;
        var cancion = enFicha ? null : d.tracklist.filter(function(t){ return plain(t.titulo).indexOf(plain(q)) >= 0; })[0];
        if(enFicha || cancion){
          items.push({
            t: d.titulo,
            s: d.artista + ' · ' + (d['año'] || '') + (cancion ? ' · ♪ ' + cancion.titulo : '')
               + (d.lista === 'deseos' ? ' · deseos' : '') + (escuchadoHoy(d) ? ' · escuchado hoy' : ''),
            img: d.portada, d: d, k: cancion ? 'Canción' : d.formato
          });
          if(!readOnly) items.push({
            t: 'Marcar escucha: ' + d.titulo, s: 'Registra que lo has puesto hoy', k: '▶',
            run: (function(x){ return function(){ marcarEscucha(x.id); renderAll(); }; })(d)
          });
          vistos++;
        }
      });
      var arts = [];
      DB.discos.forEach(function(d){ if(d.artista && arts.indexOf(d.artista) < 0 && plain(d.artista).indexOf(plain(q)) >= 0) arts.push(d.artista); });
      arts.slice(0, 3).forEach(function(a){
        items.push({t:a, s:'Ver todos sus discos', k:'Artista', run:function(){ fArt = a; grupo = 'none'; document.getElementById('selGroup').value = 'none'; setView('col'); paintCol(); }});
      });
      /* además de discos y canciones, entiende años, sellos, países y formatos */
      if(items.length < 14){
        buscarInteligente(inp.value.trim()).slice(0, 14 - items.length).forEach(function(x){
          if(items.some(function(it){ return it.id === x.d.id; })) return;
          items.push({id:x.d.id, t:x.d.titulo, s:x.d.artista + ' · ' + x.por, k:'Disco',
            img:x.d.portada, run:function(){ openDetail(x.d.id); }});
        });
      }
      acciones.forEach(function(a){ if(a.t.toLowerCase().indexOf(q) >= 0) items.push(a); });
    }else{
      items = acciones.slice();
    }
    sel = 0;
    res.innerHTML = items.map(function(it, i){
      var img = it.img
        ? '<img src="' + esc(it.img) + '" alt="" data-img-error="hide">'
        : '<div class="phb">' + (it.i || I.music) + '</div>';
      return '<div class="palrow' + (i === 0 ? ' sel' : '') + '" role="option" id="pal-option-' + i + '" aria-selected="' + (i === 0) + '" data-i="' + i + '">' + img
        + '<div class="txt"><div class="t">' + esc(it.t) + '</div><div class="s">' + esc(it.s || '') + '</div></div>'
        + '<span class="k">' + esc(it.k || '') + '</span></div>';
    }).join('') || '<div class="tl-empty">Sin resultados</div>';
    marca();
    res.querySelectorAll('.palrow').forEach(function(r){
      r.onclick = function(){ ejecutar(+r.dataset.i); };
    });
  }
  function marca(){
    res.querySelectorAll('.palrow').forEach(function(r, i){ r.className = 'palrow' + (i === sel ? ' sel' : ''); r.setAttribute('aria-selected', String(i === sel)); });
    var el = res.querySelectorAll('.palrow')[sel];
    if(el){ inp.setAttribute('aria-activedescendant', el.id); el.scrollIntoView({block:'nearest'}); }
    else inp.removeAttribute('aria-activedescendant');
  }
  function ejecutar(i){
    var it = items[i];
    if(!it) return;
    cerrar();
    if(it.run) it.run();
    else if(it.d) openDetail(it.d.id);
  }
  function cerrar(){ p.remove(); document.removeEventListener('keydown', tecla, true); if(origen && origen.isConnected) origen.focus(); }
  function tecla(e){
    if(e.key === 'Escape'){ e.preventDefault(); e.stopImmediatePropagation(); cerrar(); }
    else if(e.key === 'Tab'){
      e.preventDefault(); e.stopImmediatePropagation();
      (document.activeElement === inp ? p.querySelector('#palCerrar') : inp).focus();
    }
    else if(e.target !== inp) return;
    else if(e.key === 'ArrowDown'){ e.preventDefault(); sel = Math.min(sel + 1, items.length - 1); marca(); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); sel = Math.max(sel - 1, 0); marca(); }
    else if(e.key === 'Enter'){ e.preventDefault(); ejecutar(sel); }
  }
  inp.oninput = pinta;
  document.addEventListener('keydown', tecla, true);
  p.addEventListener('mousedown', function(e){ if(e.target === p) cerrar(); });
  pinta();
  inp.focus();
}
function discoAlAzar(){
  var ds = coleccion();
  if(!ds.length) return;
  openDetail(ds[Math.floor(Math.random() * ds.length)].id);
}


/* ============================================================
   10. FICHAS Y FORMULARIOS
   ============================================================ */
function sheet(title, bodyHtml, footHtml, ancho, alCerrar){
  var s = document.createElement('div');
  s.className = 'scrim';
  s.innerHTML = '<div class="sheet' + (ancho ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(title) + '" tabindex="-1"><div class="grabber"></div>'
    + '<div class="sheet-hd">'
    + '<button type="button" class="atras only-mob" data-close><svg class="ic" viewBox="0 0 24 24"><polyline points="15 5 8 12 15 19"/></svg>Atrás</button>'
    + '<h2>' + esc(title) + '</h2>'
    + '<button type="button" class="xbtn no-mob" data-close aria-label="Cerrar">' + I.x + '</button>'
    + '<button type="button" class="xbtn only-mob" data-close style="visibility:hidden" aria-hidden="true" tabindex="-1">' + I.x + '</button>'
    + '</div><div class="sheet-bd">' + bodyHtml + '</div>'
    + (footHtml ? '<div class="sheet-ft">' + footHtml + '</div>' : '') + '</div>';
  document.body.appendChild(s);
  var focoPrevio = document.activeElement;
  var cerrada = false;
  var cerrar = function(){
    if(cerrada) return;
    cerrada = true;
    s.remove(); document.removeEventListener('keydown', onKey); pararAudio();
    if(focoPrevio && document.contains(focoPrevio) && typeof focoPrevio.focus === 'function') focoPrevio.focus();
    if(typeof alCerrar === 'function') alCerrar();
  };
  s.querySelectorAll('[data-close]').forEach(function(b){ b.onclick = cerrar; });
  /* el título de la cabecera aparece al desplazar, como en iOS */
  var hd = s.querySelector('.sheet-hd');
  s.addEventListener('scroll', function(){ hd.classList.toggle('visto', s.scrollTop > 90); }, {passive:true});
  s.dataset.cerrable = '1';
  s.addEventListener('mousedown', function(e){ if(e.target === s) cerrar(); });
  var caja = s.querySelector('.sheet');
  function focosDe(){
    return Array.prototype.slice.call(caja.querySelectorAll(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    )).filter(function(el){ return el.offsetParent !== null; });
  }
  function onKey(ev){
    if(ev.key === 'Escape' && !document.querySelector('.pal')){ cerrar(); return; }
    /* Foco atrapado dentro de la hoja: Tab en el último elemento vuelve al
       primero, Shift+Tab en el primero va al último -no bloquea nada más. */
    if(ev.key === 'Tab'){
      var focos = focosDe();
      if(!focos.length) return;
      var primero = focos[0], ultimo = focos[focos.length - 1];
      if(ev.shiftKey && document.activeElement === primero){ ev.preventDefault(); ultimo.focus(); }
      else if(!ev.shiftKey && document.activeElement === ultimo){ ev.preventDefault(); primero.focus(); }
    }
  }
  document.addEventListener('keydown', onKey);
  arrastrarParaCerrar(s, cerrar);
  s.scrollTop = 0;
  /* Foco inicial: el primer campo/control con autofoco si lo pide el propio
     formulario, si no la propia hoja (para que el lector de pantalla anuncie
     el diálogo y Escape/Tab funcionen desde el primer momento). */
  setTimeout(function(){
    var auto = caja.querySelector('[autofocus]');
    if(auto) auto.focus(); else caja.focus();
  }, 0);
  return s;
}
/* En el móvil, deslizar desde el borde izquierdo cierra la hoja, como el gesto
   de volver atrás. Nunca interfiere con el desplazamiento vertical. */
function arrastrarParaCerrar(scrim, cerrar){
  var hoja = scrim.querySelector('.sheet');
  if(!hoja || window.innerWidth > 760) return;
  var x0 = null, y0 = 0, dx = 0, valido = false;
  scrim.addEventListener('touchstart', function(e){
    var t = e.touches[0];
    if(t.clientX > 26){ x0 = null; return; }
    x0 = t.clientX; y0 = t.clientY; dx = 0; valido = false;
    hoja.style.transition = 'none';
  }, {passive:true});
  scrim.addEventListener('touchmove', function(e){
    if(x0 === null) return;
    var t = e.touches[0];
    dx = t.clientX - x0;
    var dyAbs = Math.abs(t.clientY - y0);
    if(!valido){
      if(dx > 12 && dx > dyAbs) valido = true;
      else if(dyAbs > 12){ x0 = null; hoja.style.transform = ''; return; }
    }
    if(!valido) return;
    hoja.style.transform = 'translateX(' + Math.max(0, dx) + 'px)';
    if(e.cancelable) e.preventDefault();
  }, {passive:false});
  var soltar = function(){
    if(x0 === null) return;
    hoja.style.transition = 'transform .26s var(--ease)';
    if(valido && dx > 90){ hoja.style.transform = 'translateX(100%)'; setTimeout(cerrar, 220); }
    else hoja.style.transform = '';
    x0 = null; dx = 0; valido = false;
  };
  scrim.addEventListener('touchend', soltar);
  scrim.addEventListener('touchcancel', soltar);
}
function fieldRow(label, inner){ return '<div class="grow"><label>' + label + '</label>' + inner + '</div>'; }
function genOpts(sel){
  return '<option value="">Sin clasificar</option>' + GENEROS.map(function(g){
    return '<option value="' + esc(g) + '"' + (g === sel ? ' selected' : '') + '>' + esc(g) + '</option>';
  }).join('');
}
function spec(k, v){
  var vacio = (v === '—' || v === '' || v === null || v === undefined);
  return '<div class="spec' + (vacio ? ' vacio' : '') + '"><div class="k">' + k + '</div><div class="v">' + esc(v) + '</div></div>';
}
function lightbox(url){
  url = urlSegura(url);
  if(!url) return;
  var big = urlSegura(url.indexOf('mzstatic') >= 0 ? artBig(url.replace(/\d+x\d+bb/, '100x100bb'), 1200)
    : url.replace('/front-500', '/front-1200').replace('/front-250', '/front-1200')) || url;
  var origen = document.activeElement;
  var l = document.createElement('div');
  l.className = 'lightbox';
  /* construido por DOM, no con un onerror inline metido dentro de una
     cadena de HTML: así no depende de que la URL no rompa el atributo */
  var img = document.createElement('img');
  img.src = big;
  img.alt = 'Imagen ampliada';
  img.onerror = function(){ img.onerror = null; img.src = url; };
  l.appendChild(img);
  l.setAttribute('role', 'dialog');
  l.setAttribute('aria-modal', 'true');
  l.setAttribute('aria-label', 'Portada ampliada');
  l.tabIndex = -1;
  var cerrar = function(){ l.remove(); document.removeEventListener('keydown', onKey, true); if(origen && origen.isConnected) origen.focus(); };
  l.onclick = cerrar;
  var onKey = function(e){ if(e.key === 'Escape'){ e.preventDefault(); e.stopImmediatePropagation(); cerrar(); } else if(e.key === 'Tab'){ e.preventDefault(); l.focus(); } };
  document.addEventListener('keydown', onKey, true);
  document.body.appendChild(l);
  l.focus();
}

/* ---------- reproductor ---------- */
var player = null, playingId = '';
function pararAudio(){
  if(player){ player.pause(); player.currentTime = 0; }
  playingId = '';
}
function reproducir(url, id, boton){
  if(!player) player = document.getElementById('player');
  if(playingId === id){ pararAudio(); pintarBotonesAudio(); return; }
  player.src = url;
  player.play().then(function(){ playingId = id; pintarBotonesAudio(); }).catch(function(){ toast('No se pudo reproducir', true); });
  player.ontimeupdate = function(){
    var fila = document.querySelector('.trk.playing .prog');
    if(fila && player.duration) fila.style.width = (player.currentTime / player.duration * 100) + '%';
  };
  player.onended = function(){ playingId = ''; pintarBotonesAudio(); };
}
function pintarBotonesAudio(){
  document.querySelectorAll('[data-prev]').forEach(function(b){
    var on = b.dataset.prev === playingId;
    b.className = 'play' + (on ? ' on' : '');
    b.innerHTML = on ? I.pause : I.play;
    var fila = b.closest('.trk');
    fila.className = 'trk' + (on ? ' playing' : '');
    var pr = fila.querySelector('.prog');
    if(on && !pr){ fila.insertAdjacentHTML('beforeend', '<span class="prog"></span>'); }
    else if(!on && pr) pr.remove();
  });
}

/* ---------- ficha ---------- */
var autoHecho = {};
/* La portada pulsada vuela hasta su posición en la ficha */
function volarPortada(origen, destino){
  if(!origen || !destino || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var a = origen.getBoundingClientRect(), b = destino.getBoundingClientRect();
  if(!a.width || !b.width) return;
  var clon = origen.cloneNode(true);
  clon.style.cssText = 'position:fixed;z-index:70;margin:0;pointer-events:none;border-radius:12px;overflow:hidden;'
    + 'left:' + a.left + 'px;top:' + a.top + 'px;width:' + a.width + 'px;height:' + a.height + 'px;'
    + 'transition:all .42s cubic-bezier(.32,.72,0,1);box-shadow:0 12px 40px rgba(0,0,0,.28)';
  document.body.appendChild(clon);
  destino.style.opacity = '0';
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      var r = destino.getBoundingClientRect();
      clon.style.left = r.left + 'px';
      clon.style.top = r.top + 'px';
      clon.style.width = r.width + 'px';
      clon.style.height = r.height + 'px';
      clon.style.borderRadius = getComputedStyle(destino).borderRadius;
    });
  });
  setTimeout(function(){
    destino.style.opacity = '';
    clon.remove();
  }, 440);
}
/* Vuelve a pintar las partes de la ficha que dependen de los datos, sin cerrarla */
function refrescarFicha(s, d){
  var cov = s.querySelector('#cov');
  if(cov && d.portada && !cov.querySelector('img')) cov.innerHTML = coverHtml(d);
  var mapa = {
    'Formato': d.formatoDetalle || '—', 'Año': d['año'] || '—', 'Sello': d.sello || '—',
    'Catálogo': d.numeroCatalogo || '—', 'País': d.pais ? (bandera(d.pais) + ' ' + nombrePais(d.pais)) : '—'
  };
  s.querySelectorAll('.spec').forEach(function(sp){
    var k = sp.querySelector('.k').textContent;
    if(mapa[k] !== undefined) sp.querySelector('.v').textContent = mapa[k];
  });
  var tl = s.querySelector('#dTL');
  if(tl && d.tracklist.length && !tl.querySelector('.trk')){
    tl.innerHTML = '<div class="tl">' + d.tracklist.map(function(t, i){
      return '<div class="trk"><span class="num">' + (i + 1) + '</span><span class="nm">' + esc(t.titulo) + '</span>'
        + '<span class="dur">' + esc(t.duracion || '') + '</span>'
        + '<a class="lyr" target="_blank" rel="noopener" data-tip="Ver la letra en Genius" href="'
        + esc(urlLetra(d.artista, t.titulo)) + '">' + I.letra + '</a></div>';
    }).join('') + '</div>';
    var n = s.querySelector('#dN');
    if(n) n.textContent = ' · ' + d.tracklist.length;
  }
  if(d.genero){
    var tags = s.querySelector('.dhero .tags');
    if(tags && tags.textContent.indexOf(d.genero) < 0){
      tags.insertAdjacentHTML('beforeend', '<span class="tag">' + esc(d.genero) + '</span>');
    }
  }
  toast('Ficha completada');
}
/* Agrupa el tracklist por unidad (Disco 1, Disco 2) y por cara (A, B) cuando se sabe */
/* La portada gira y enseña el disco físico, si existe foto de él */
function montarGiro(s, d){
  var cov = s.querySelector('#cov');
  if(!cov) return;
  var lupa = s.querySelector('#covZoom');
  if(lupa) lupa.onclick = function(e){ e.stopPropagation(); if(d.portada) lightbox(d.portada); };
  var pinta = function(){
    var cara = cov.querySelector('.caraB');
    if(cara) cara.remove();
    var ind = cov.querySelector('.girind');
    if(ind) ind.remove();
    var real = !!d.fotoDisco;
    /* si no hay foto real, se dibuja el soporte con la propia portada */
    var contenido = real
      ? '<img src="' + esc(d.fotoDisco) + '" alt="" data-img-error="fail">'
      : soporteGenerado(d);
    cov.classList.add('girable');
    cov.insertAdjacentHTML('beforeend', '<div class="caraB' + (real ? '' : ' gen') + '">' + contenido + '</div>');
    cov.insertAdjacentHTML('beforeend', '<span class="girind" data-tip="'
      + (real ? 'Ver el disco' : 'Ver el disco (representación)') + '">' + I.girar + '</span>');
    montarAyudas(cov);
  };
  pinta();
  cov.onclick = function(){ cov.classList.toggle('vuelta'); };
  /* si no la tenemos, se busca en segundo plano */
  if(!d.fotoDisco && d.mbid && !d.sinFoto){
    fotoDelSoporte(d.mbid, d.rgid).then(function(url){
      d.fotoDisco = url;
      d.fotoDiscoMbid = d.mbid;
      persist(true);
      if(document.body.contains(s)) pinta();
    }).catch(function(){ d.sinFoto = 1; persist(true); });
  }
}
function pintarTracklist(d, tracks){
  var porDisco = {}, orden = [];
  tracks.forEach(function(t, i){
    var k = t.disco || 1;
    if(!porDisco[k]){ porDisco[k] = []; orden.push(k); }
    porDisco[k].push({t:t, i:i});
  });
  var varios = orden.length > 1;
  var caraDe = function(t){
    var m = String(t.pos || '').match(/^([A-Z])/i);
    return m ? m[1].toUpperCase() : '';
  };
  return orden.map(function(k){
    var lista = porDisco[k];
    var caras = [], porCara = {};
    lista.forEach(function(x){
      var c = caraDe(x.t);
      if(!porCara[c]){ porCara[c] = []; caras.push(c); }
      porCara[c].push(x);
    });
    var hayCaras = caras.length > 1 || (caras.length === 1 && caras[0] !== '');
    var cuerpo = hayCaras
      ? caras.map(function(c){
          return (c ? '<div class="cara">Cara ' + c + '</div>' : '')
            + porCara[c].map(function(x, j){ return filaTrack(d, x.t, x.i, j + 1); }).join('');
        }).join('')
      : lista.map(function(x, j){ return filaTrack(d, x.t, x.i, j + 1); }).join('');
    return (varios ? '<div class="unidad">' + (d.formato === 'Vinilo' ? 'Disco ' : 'CD ') + k
        + '<span>' + lista.length + ' temas' + (duracionLista(lista.map(function(x){ return x.t; })) ? ' · '
        + duracionLista(lista.map(function(x){ return x.t; })) : '') + '</span></div>' : '')
      + '<div class="tl">' + cuerpo + '</div>';
  }).join('');
}
function duracionLista(ts){
  var seg = 0;
  ts.forEach(function(t){
    var m = String(t.duracion || '').match(/^(\d+):(\d{2})$/);
    if(m) seg += (+m[1]) * 60 + (+m[2]);
  });
  if(!seg) return '';
  return Math.round(seg / 60) + ' min';
}
function filaTrack(d, t, i, n){
  return '<div class="trk' + (t.fav ? ' fav' : '') + '">'
    + '<span class="' + (t.pos ? 'pos' : 'num') + '">' + (t.pos ? esc(t.pos) : n) + '</span>'
    + (t.preview
        ? '<button type="button" class="play" data-prev="' + d.id + ':' + i + '" data-url="' + esc(t.preview) + '">' + I.play + '</button>'
        : '')
    + '<span class="nm">' + esc(t.titulo) + '</span>'
    + (t.duracion ? '<span class="dur">' + esc(t.duracion) + '</span>' : '<span class="dur"></span>')
    + (readOnly ? '' : '<button type="button" class="cora' + (t.fav ? ' on' : '') + '" data-fav="' + i
        + '" aria-pressed="' + !!t.fav + '" data-tip="' + (t.fav ? 'Quitar de favoritas' : 'Marcar como favorita') + '">' + I.corazon + '</button>')
    + '<a class="lyr" target="_blank" rel="noopener" data-tip="Ver la letra en Genius" href="'
    + esc(urlLetra(d.artista, t.titulo)) + '">' + I.letra + '</a></div>';
}
/* Recomienda otros discos de tu propia colección parecidos a uno dado,
   sin consultar nada fuera: solo con lo que ya tienes catalogado. */
function similares(d){
  var candidatos2 = coleccion().filter(function(x){ return x.id !== d.id; });
  var decD = parseInt(d['año']) ? Math.floor(parseInt(d['año']) / 10) * 10 : null;
  var puntuados = candidatos2.map(function(x){
    var p = 0, motivos = [];
    if(x.sello && d.sello && plain(x.sello) === plain(d.sello)){ p += 3; motivos.push('mismo sello'); }
    if(x.genero && d.genero && x.genero === d.genero){ p += 2; motivos.push('mismo género'); }
    if(x.pais && d.pais && x.pais === d.pais){ p += 1; motivos.push('mismo país'); }
    var decX = parseInt(x['año']) ? Math.floor(parseInt(x['año']) / 10) * 10 : null;
    if(decD != null && decX === decD){ p += 1; motivos.push('misma década'); }
    if(x.artista && d.artista && plain(x.artista) === plain(d.artista)) p -= 5; /* ya sale en «Más de este artista» */
    return {d:x, p:p, motivo:motivos[0] || ''};
  }).filter(function(x){ return x.p >= 3; })
    .sort(function(a, b){ return b.p - a.p; });
  return puntuados.slice(0, 6);
}
function pintaSimilares(caja, d, s){
  if(!caja) return;
  var lista = similares(d);
  if(!lista.length){ caja.innerHTML = ''; return; }
  caja.innerHTML = '<div class="tl-hd" style="margin-top:22px"><h4>Discos parecidos en tu colección</h4></div>'
    + '<div class="masgrid">' + lista.map(function(x){
        return '<div class="mastile" data-id="' + x.d.id + '" title="' + esc(x.motivo) + '">'
          + '<div class="masart">' + coverHtml(x.d) + '</div>'
          + '<div class="mast">' + esc(x.d.titulo) + '</div>'
          + '<div class="masy">' + esc(x.motivo) + '</div></div>';
      }).join('') + '</div>';
  caja.querySelectorAll('.mastile').forEach(function(el){
    el.onclick = function(){ s.remove(); openDetail(el.dataset.id); };
  });
}
function openDetail(id, desde, volverSesion){
  var d = DB.discos.filter(function(x){ return x.id === id; })[0];
  if(!d) return;
  var tracks = normTracks(d.tracklist), editing = false;
  var dups = dupSet();
  var hermanos = DB.discos.filter(function(x){ return x.id !== d.id && key(x) === key(d); });

  var body =
    (d.prestadoA ? '<div class="warnb">' + I.hand + '<span>Prestado a <b>' + esc(d.prestadoA) + '</b>'
      + (d.prestadoDesde ? ' desde el ' + new Date(d.prestadoDesde).toLocaleDateString('es-ES') : '')
      + '. <a href="#" id="devolver" style="color:var(--blue)">Marcar como devuelto</a></span></div>' : '')
    + (hermanos.length && !readOnly ? '<div class="warnb">' + I.copy + '<span>Tienes ' + (hermanos.length + 1)
      + ' fichas iguales de este disco. <a href="#" id="fusionar" style="color:var(--blue)">Fusionarlas en una</a></span></div>' : '')
    + (d.confianza === 'baja' && !readOnly ? '<div class="warnb">' + I.warn
      + '<span>Estos datos se rellenaron con una coincidencia dudosa. Revísalos, '
      + '<a href="#" id="otraEd" style="color:var(--blue)">elige otra edición</a> '
      + 'o <a href="#" id="darPorBueno" style="color:var(--blue)">da estos por buenos</a>.</span></div>' : '')
    + (function(){
        if(window._reciénCompletado === d.id && !readOnly){
          window._reciénCompletado = '';
          return '<div class="warnb info">' + I.info + '<span>Ficha rellenada. Si esta edición no es exactamente la tuya, '
            + '<a href="#" id="otraEdRC" style="color:var(--blue)">elige la edición correcta</a>.</span></div>';
        }
        return '';
      })()
    + '<div class="specs">'
    + spec('Soporte', d.formato) + spec('Formato', d.formatoDetalle || '—') + spec('Año', d['año'] || '—')
    + spec('Sello', d.sello || '—') + spec('Catálogo', d.numeroCatalogo || '—')
    + spec('País', d.pais ? (bandera(d.pais) + ' ' + nombrePais(d.pais)) : '—')
    + spec('Estado del disco', d.estado || '—')
    + spec('Estado de la funda', d.estadoFunda || '—')
    + spec('Comprado', d.fechaCompra ? new Date(d.fechaCompra).toLocaleDateString('es-ES') : '—')
    + spec('Precio', d.precioCompra ? d.precioCompra.toFixed(2) + ' €' : '—')
    + spec('Dónde está', d.ubicacion || '—')
    + ((d.ejemplares || 1) > 1 ? spec('Ejemplares', d.ejemplares) : '')
    + spec('Escuchas', totalEscuchas(d) ? totalEscuchas(d) + (d.ultimaEscucha ? ' · última ' + fechaBonita(d.ultimaEscucha) : '') : '—')
    + '</div>'
    + (d.notas ? '<p style="font-size:14.5px;color:var(--txt2);line-height:1.5;margin:0 3px 16px">' + esc(d.notas) + '</p>' : '')
    + '<div id="dConsistencia"></div><div id="dExtra"></div><div id="dTecnica"></div><div id="dMas"></div><div id="dSimilares"></div>'
    + '<div class="tl-hd"><h4>Tracklist<span class="n" id="dN"></span></h4><div class="rowb">'
    + (readOnly ? '' : '<button type="button" class="iconbtn" id="loadPrev" data-tip="Cargar fragmentos de audio">' + I.play + '</button>')
    + (readOnly ? '' : '<button type="button" class="iconbtn" id="pen" data-tip="Editar el tracklist">' + I.pencil + '</button>') + '</div></div>'
    + '<div id="dTL"></div>';

  /* el Detective solo lee (MusicBrainz/Discogs) y no toca la ficha, así que
     se ofrece también en modo solo-lectura, a diferencia del resto de botones */
  var pie = readOnly
    ? '<div class="rowb"><button type="button" class="btn sm" id="detective" data-tip="Comprobar si es exactamente esta edición">'
      + I.search + '<span class="txt">Detective</span></button></div><span></span>'
    : '<div class="rowb"><button type="button" class="btn sm" id="aiFull" title="Completar">' + I.spark + '<span class="txt">Completar</span></button>'
      + '<button type="button" class="btn sm" id="edics" data-tip="Elegir otra edición">' + I.layers + '<span class="txt">Ediciones</span></button>'
      + '<button type="button" class="btn sm" id="detective" data-tip="Comprobar si es exactamente esta edición">' + I.search + '<span class="txt">Detective</span></button></div>'
      + '<div class="rowb"><button type="button" class="btn sm" id="mas">···</button><button type="button" class="btn pri sm" id="edit">' + I.pencil + 'Editar</button></div>';

  var s = sheet(d.titulo || 'Sin título', body, pie, false, volverSesion);
  if(typeof volverSesion === 'function'){
    var retorno = document.createElement('button');
    retorno.type = 'button'; retorno.className = 'btn sm session-return';
    retorno.textContent = 'Volver a mi sesión';
    retorno.onclick = function(){ s.querySelector('[data-close]').click(); };
    s.querySelector('.sheet-bd').prepend(retorno);
  }
  s.classList.add('album-sheet');
  var $ = function(q){ return s.querySelector(q); };

  var tint = d.color ? 'linear-gradient(180deg, rgba(' + d.color + ',.30), rgba(' + d.color + ',.05))' : 'var(--sunk)';
  $('.sheet-bd').insertAdjacentHTML('beforebegin',
    '<div class="dhero" style="--herobg:' + tint + '"><div class="covwrap">'
    + '<div class="cov' + (d.formato === 'Vinilo' ? ' vin' : '') + '" id="cov"><div class="caraA">' + coverHtml(d) + '</div></div>'
    + '<button type="button" class="covzoom" id="covZoom" data-tip="Ver la portada grande">' + I.lupa + '</button></div>'
    + '<div class="dmeta"><h3>' + (esc(d.titulo) || 'Sin título') + '</h3>'
    + '<div class="art2" id="byArt">' + (esc(d.artista) || 'Artista desconocido')
    + '<svg class="ic" viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"/></svg></div>'
    + '<div class="starbox"><div id="dStars">' + estrellasHtml(d.valoracion, true, d.id) + '</div>'
    + '<div class="lbl" id="dStarsL">' + (d.valoracion ? TEXTO_VALORACION[d.valoracion] : (readOnly ? '' : 'Toca para valorar')) + '</div></div>'
    + '<div class="tags">'
    + (function(){
        var otra = otraEdicion(d);
        if(!otra) return '<span class="dato ' + (d.formato === 'Vinilo' ? 'vin' : 'cd') + '">'
          + (d.formato === 'Vinilo' ? I.vinBadge : I.cdBadge) + d.formato + '</span>';
        return '<span class="dato edics"><button type="button" class="ed on">'
          + (d.formato === 'Vinilo' ? I.vinBadge : I.cdBadge) + d.formato + '</button>'
          + '<button type="button" class="ed" data-otra="' + otra.id + '" data-tip="Ver tu edición en ' + otra.formato + '">'
          + (otra.formato === 'Vinilo' ? I.vinBadge : I.cdBadge) + otra.formato + '</button></span>';
      })()
    + (d.genero ? '<span class="dato">' + esc(d.genero) + '</span>' : '')
    + (d['año'] ? '<span class="dato">' + esc(d['año']) + '</span>' : '')
    + (tracks.length ? '<span class="dato">' + tracks.length + ' temas</span>' : '')
    + (duracionTotal(d) ? '<span class="dato">' + duracionTotal(d) + '</span>' : '')
    + (d.lista === 'deseos' ? '<span class="tag pur">En deseos</span>' : '')
    + (d.extra && d.extra.secundarios ? '<span class="tag">' + esc(traduceTipo(d.extra.secundarios)) + '</span>' : '')
    + d.etiquetas.map(function(t){ return '<span class="tag usr" data-tag="' + esc(t) + '">' + esc(t) + '</span>'; }).join('')
    + '</div><div class="linkrow">'
    /* validar (urlSegura, o el formato del mbid) evita esquemas peligrosos,
       pero no basta para meterlo en un atributo HTML: si el valor trae una
       comilla, hay que escaparlo aparte (esc) o se sale del href. Las dos
       cosas hacen falta, no una en lugar de la otra. */
    + '<a class="lnk ext" target="_blank" rel="noopener" href="' + esc(/^[0-9a-f-]{36}$/i.test(d.mbid || '') ? 'https://musicbrainz.org/release/' + d.mbid
        : 'https://musicbrainz.org/search?type=release&query=' + encodeURIComponent(d.artista + ' ' + d.titulo)) + '">' + I.link + 'MusicBrainz</a>'
    + '<a class="lnk ext" target="_blank" rel="noopener" href="' + esc(urlSegura(d.discogs) || 'https://www.discogs.com/search/?q=' + encodeURIComponent(d.artista + ' ' + d.titulo) + '&type=release') + '">' + I.link + 'Discogs</a>'
    + '<a class="lnk ext" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query='
        + encodeURIComponent(d.artista + ' ' + d.titulo + ' full album') + '">' + I.play + 'YouTube</a>'
    + '<a class="lnk ext" target="_blank" rel="noopener" data-tip="'
      + (d.appleUrl ? 'Abrir este álbum en Apple Music' : 'Buscarlo en Apple Music')
      + '" href="' + esc(urlSegura(d.appleUrl) || ('https://music.apple.com/es/search?term='
        + encodeURIComponent(d.artista + ' ' + d.titulo))) + '">' + I.apple + 'Apple Music</a>'
    + '<button type="button" class="lnk ext" id="btnWiki">' + I.libro + 'Datos Artista / Álbum</button>'
    + '<span class="sep"></span>'
    + '<button type="button" class="lnk" id="btnShare">' + I.compartir + 'Compartir</button>'
    + (readOnly ? '' : '<button type="button" class="lnk' + (escuchadoHoy(d) ? ' hecho' : '') + '" id="escuchado" aria-pressed="' + escuchadoHoy(d) + '" aria-label="' + (escuchadoHoy(d) ? 'Quitar escucha de hoy' : 'Marcar escuchado hoy') + '">'
        + (escuchadoHoy(d) ? I.check + 'Escuchado hoy' : I.playF + 'Escuchado hoy') + '</button>')
    + '</div></div></div>');

  aseguraColor(d).then(function(c){
    if(c) { var h = s.querySelector('.dhero'); if(h) h.style.setProperty('--herobg', 'linear-gradient(180deg, rgba(' + c + ',.30), rgba(' + c + ',.05))'); }
  });

  if(desde) volarPortada(desde, $('#cov'));
  montarGiro(s, d);
  if($('#btnWiki')) $('#btnWiki').onclick = function(){ verWikipedia(d, false); };
  if($('#btnShare')) $('#btnShare').onclick = function(){ compartirDisco(d); };
  s.querySelectorAll('[data-otra]').forEach(function(b){
    b.onclick = function(){ var id2 = b.dataset.otra; s.remove(); openDetail(id2); };
  });
  s.querySelectorAll('[data-otra]').forEach(function(b){
    b.onclick = function(){
      var o = DB.discos.filter(function(x){ return x.id === b.dataset.otra; })[0];
      if(!o) return;
      if(!d.enlazado) enlazarEdiciones(d, o);
      s.remove();
      openDetail(o.id);
    };
  });
  if($('#byArt')) $('#byArt').onclick = function(){ verArtista(d.artista); };
  if(!readOnly) montarEstrellas($('#dStars'), d, function(v){
    $('#dStarsL').textContent = v ? TEXTO_VALORACION[v] : 'Toca para valorar';
    paintCol();
  });
  pintaExtra($('#dExtra'), d);
  pintaTecnica($('#dTecnica'), d);
  pintaConsistencia($('#dConsistencia'), d);
  (function(){
    var hermanos = DB.discos.filter(function(x){
      return x.id !== d.id && x.lista === d.lista && plain(x.artista) === plain(d.artista);
    }).sort(function(a, b){ return String(a['año']).localeCompare(String(b['año'])); });
    if(!hermanos.length){
      $('#dMas').innerHTML = '<div class="masuno"><span>Es el único disco que tienes de ' + esc(d.artista) + '.</span>'
        + '<button type="button" class="btn xs" id="verArt">' + I.layers + 'Discografía</button></div>';
      $('#verArt').onclick = function(){ s.remove(); verArtista(d.artista); };
      return;
    }
    if(hermanos.length <= 2){
      /* con uno o dos, una línea se lee mejor que una rejilla medio vacía */
      $('#dMas').innerHTML = '<div class="masuno"><span>También tienes '
        + hermanos.map(function(x){ return '<a data-id="' + x.id + '">' + esc(x.titulo) + '</a>'; })
            .join(' y ') + ' de ' + esc(d.artista) + '.</span>'
        + '<button type="button" class="btn xs" id="verArt">' + I.layers + 'Discografía</button></div>';
      $('#dMas').querySelectorAll('[data-id]').forEach(function(el){
        el.onclick = function(){ s.remove(); openDetail(el.dataset.id); };
      });
      $('#verArt').onclick = function(){ s.remove(); verArtista(d.artista); };
      return;
    }
    $('#dMas').innerHTML = '<div class="tl-hd" style="margin-top:22px"><h4>Más de ' + esc(d.artista)
      + '<span class="n"> · ' + hermanos.length + '</span></h4>'
      + '<button type="button" class="btn xs" id="verArt">' + I.layers + 'Discografía</button></div>'
      + '<div class="masgrid">' + hermanos.slice(0, 12).map(function(x){
          return '<div class="mastile" data-id="' + x.id + '">'
            + '<div class="masart">' + coverHtml(x) + '</div>'
            + '<div class="mast">' + esc(x.titulo) + '</div>'
            + '<div class="masy">' + (x['año'] || '') + '</div></div>';
        }).join('') + '</div>';
    $('#dMas').querySelectorAll('.mastile').forEach(function(el){
      el.onclick = function(){ s.remove(); openDetail(el.dataset.id); };
    });
    $('#verArt').onclick = function(){ s.remove(); verArtista(d.artista); };
  })();
  pintaSimilares($('#dSimilares'), d, s);
  if(d.mbid && (!d.extra || !d.extra.cargado)){
    cargarExtra(d).then(function(){ pintaExtra($('#dExtra'), d); }).catch(function(){});
  }
  if(hayDiscogs() && (!d.tecnica || !d.tecnica.cargado)){
    cargarDiscogs(d).then(function(){
      if(!document.body.contains(s)) return;
      pintaTecnica($('#dTecnica'), d);
      pintaConsistencia($('#dConsistencia'), d);
      if(d.tracklist.some(function(t){ return t.pos; })) paintTL();
    }).catch(function(){});
  }
  /* Se intenta rellenar lo que falte una única vez por disco y sesión.
     Nunca se reabre la ficha: se refrescan los datos en su sitio. */
  if(!readOnly && incompleto(d) && (d.titulo || d.artista) && !autoHecho[d.id]){
    autoHecho[d.id] = 1;
    enrich(d.id, false).then(function(ok){
      if(!ok || !document.body.contains(s)) return;
      refrescarFicha(s, d);
      paintCol();
    }).catch(function(){});
  }
  s.querySelectorAll('[data-tag]').forEach(function(t){
    t.onclick = function(){ fTag = t.dataset.tag; setView('col'); paintCol(); s.remove(); };
  });
  if($('#devolver')) $('#devolver').onclick = function(e){
    e.preventDefault();
    d.prestadoA = ''; d.prestadoDesde = '';
    persist(); s.remove(); openDetail(d.id); toast('Marcado como devuelto');
  };
  if($('#fusionar')) $('#fusionar').onclick = function(e){ e.preventDefault(); s.remove(); fusionarDuplicados(d); };
  if($('#otraEd')) $('#otraEd').onclick = function(e){ e.preventDefault(); elegirEdicion(d, s); };
  if($('#otraEdRC')) $('#otraEdRC').onclick = function(e){ e.preventDefault(); window._reciénCompletado = ''; elegirEdicion(d, s); };
  if($('#darPorBueno')) $('#darPorBueno').onclick = function(e){
    e.preventDefault();
    d.confianza = '';
    persist();
    toast('Datos confirmados');
    s.remove();
    openDetail(d.id);
  };
  if($('#escuchado')) $('#escuchado').onclick = function(){
    var otra = otraEdicion(d);
    if(otra && d.enlazado && !escuchadoHoy(d) && !escuchadoHoy(otra)){
      var s3 = sheet('¿Cuál has puesto?',
        '<p style="font-size:14.5px;color:var(--txt2);margin:0 0 16px">Tienes este álbum en dos formatos. '
        + 'Marca el que has escuchado para que las horas de aguja cuadren.</p>'
        + '<div class="segtype" id="cualEd">'
        + '<button type="button" data-id="' + d.id + '">' + (d.formato === 'Vinilo' ? I.vinBadge : I.cdBadge) + d.formato + '</button>'
        + '<button type="button" data-id="' + otra.id + '">' + (otra.formato === 'Vinilo' ? I.vinBadge : I.cdBadge) + otra.formato + '</button>'
        + '</div>');
      s3.querySelectorAll('#cualEd button').forEach(function(b){
        b.onclick = function(){
          marcarEscucha(b.dataset.id);
          s3.remove();
          s.remove();
          openDetail(b.dataset.id);
        };
      });
      return;
    }
    var puesto = marcarEscucha(d.id);
    var b = $('#escuchado');
    b.className = 'lnk' + (puesto ? ' hecho' : '');
    b.setAttribute('aria-pressed', String(puesto));
    b.setAttribute('aria-label', puesto ? 'Quitar escucha de hoy' : 'Marcar escuchado hoy');
    microFeedback(b);
    b.innerHTML = puesto ? I.check + 'Escuchado hoy' : I.playF + 'Escuchado hoy';
    var sp = s.querySelectorAll('.spec');
    for(var i = 0; i < sp.length; i++){
      if(sp[i].querySelector('.k').textContent === 'Escuchas'){
        sp[i].querySelector('.v').textContent = totalEscuchas(d)
          ? totalEscuchas(d) + (d.ultimaEscucha ? ' · última ' + fechaBonita(d.ultimaEscucha) : '') : '—';
      }
    }
    paintCol();
  };

  function paintTL(){
    $('#dN').textContent = tracks.length ? ' · ' + tracks.length : '';
    if($('#pen')){
      $('#pen').className = 'iconbtn' + (editing ? ' on' : '');
      $('#pen').innerHTML = editing ? I.check : I.pencil;
    }
    if(!tracks.length && !editing){
      $('#dTL').innerHTML = '<div class="tl"><div class="tl-empty">Sin tracklist' + (readOnly ? '' : ' · usa el lápiz o «Completar»') + '</div></div>';
      return;
    }
    if(!editing){
      $('#dTL').innerHTML = pintarTracklist(d, tracks);
      $('#dTL').querySelectorAll('[data-prev]').forEach(function(b){
        b.onclick = function(){ reproducir(b.dataset.url, b.dataset.prev, b); };
      });
      $('#dTL').querySelectorAll('[data-fav]').forEach(function(b){
        b.onclick = function(){
          var t = tracks[+b.dataset.fav];
          if(!t) return;
          if(t.fav) delete t.fav; else t.fav = 1;
          d.tracklist = tracks;
          persist(true);
          b.className = 'cora' + (t.fav ? ' on' : '');
          b.setAttribute('aria-pressed', String(!!t.fav));
          microFeedback(b);
          b.dataset.tip = t.fav ? 'Quitar de favoritas' : 'Marcar como favorita';
          b.setAttribute('aria-label', b.dataset.tip);
          b.closest('.trk').className = 'trk' + (t.fav ? ' fav' : '');
        };
      });
      montarAyudas($('#dTL'));
      pintarBotonesAudio();
      return;
    }
    $('#dTL').innerHTML = '<div class="tl">' + (tracks.length ? tracks.map(function(t, i){
      return '<div class="trk"><span class="num">' + (i + 1) + '</span>'
        + '<input class="tn" data-i="' + i + '" value="' + esc(t.titulo) + '" placeholder="Título de la canción">'
        + '<input class="d td" data-i="' + i + '" value="' + esc(t.duracion) + '" placeholder="—">'
        + '<button type="button" class="del" data-del="' + i + '">' + I.minus + '</button></div>';
    }).join('') : '<div class="tl-empty">Sin canciones</div>')
      + '<button type="button" class="tl-add" id="addT">' + I.plus + 'Añadir canción</button></div>';
    $('#addT').onclick = function(){ tracks.push({titulo:'', duracion:'', preview:''}); paintTL(); var a = $('#dTL').querySelectorAll('.tn'); if(a.length) a[a.length-1].focus(); };
    $('#dTL').querySelectorAll('.tn').forEach(function(i){ i.oninput = function(e){ tracks[+e.target.dataset.i].titulo = e.target.value; }; });
    $('#dTL').querySelectorAll('.td').forEach(function(i){ i.oninput = function(e){ tracks[+e.target.dataset.i].duracion = e.target.value; }; });
    $('#dTL').querySelectorAll('[data-del]').forEach(function(b){ b.onclick = function(){ tracks.splice(+b.dataset.del, 1); paintTL(); }; });
  }
  paintTL();

  if($('#pen')) $('#pen').onclick = function(){
    if(editing){
      d.tracklist = tracks.filter(function(t){ return t.titulo.trim(); });
      tracks = normTracks(d.tracklist);
      persist();
      editing = false; paintTL();
      toast('Tracklist guardado');
    }else{ editing = true; paintTL(); }
  };
  if($('#loadPrev')) $('#loadPrev').onclick = function(){
    var b = $('#loadPrev'); b.disabled = true; b.innerHTML = I.spark;
    itBuscar(d.titulo, d.artista).then(function(hit){ return itTracks(hit.c.collectionId); }).then(function(tr){
      var mapa = {};
      tr.forEach(function(t){ mapa[plain(t.titulo)] = t.preview; });
      var n = 0;
      tracks.forEach(function(t, i){
        var p = mapa[plain(t.titulo)] || (tr[i] && plain(tr[i].titulo) === plain(t.titulo) ? tr[i].preview : '');
        if(p){ t.preview = p; n++; }
      });
      d.tracklist = tracks;
      persist(true);
      paintTL();
      toast(n ? n + ' fragmentos listos para escuchar' : 'No hay fragmentos disponibles', !n);
      b.disabled = false; b.innerHTML = I.play;
    }).catch(function(){
      toast('No se encontraron fragmentos', true);
      b.disabled = false; b.innerHTML = I.play;
    });
  };

  if($('#edit')) $('#edit').onclick = function(){ s.remove(); openForm(d); };
  if($('#edics')) $('#edics').onclick = function(){ elegirEdicion(d, s); };
  if($('#detective')) $('#detective').onclick = function(){ detectiveEdiciones(d); };
  if($('#aiFull')) $('#aiFull').onclick = function(e){
    var b = e.currentTarget; b.disabled = true; b.innerHTML = I.spark + '<span class="txt">Buscando…</span>';
    enrich(d.id, true).then(function(ok){
      if(ok){ s.remove(); toast('Ficha actualizada'); window._reciénCompletado = d.id; openDetail(d.id); return; }
      b.disabled = false; b.innerHTML = I.spark + '<span class="txt">Completar</span>';
      toast('Sin coincidencia exacta · mira las ediciones parecidas', true);
      elegirEdicion(d, s);
    });
  };
  if($('#mas')) $('#mas').onclick = function(){ menuDisco(d, s); };
}

/* ---------- menú adicional ---------- */
function menuDisco(d, padre){
  var body = '<div class="dbact">'
    + accion(I.tag, 'Etiquetas', 'Marca este disco con etiquetas libres: firmado, primera edición, para vender…', 'tags', '', 'Editar etiquetas')
    + accion(I.hand, d.prestadoA ? 'Prestado a ' + d.prestadoA : 'Prestar', 'Anota a quién se lo dejas y desde cuándo.', 'lend', '', d.prestadoA ? 'Cambiar' : 'Prestar')
    + (d.lista === 'deseos'
        ? accion(I.carrito, 'Ya lo tengo', 'Pásalo a tu colección indicando en qué formato lo has comprado.', 'comprado', '', 'Lo he comprado')
        : accion(I.heart, 'Mover a deseos', 'Guárdalo como disco pendiente de comprar.', 'wish', '', 'Mover'))
    + accion(I.gap, 'Huecos del artista', 'Compara tu colección con la discografía completa de ' + esc(d.artista) + '.', 'gaps', '', 'Buscar huecos')
    + accion(I.link, 'Fijar edición por URL', 'Pega el enlace de MusicBrainz o Discogs de tu prensado exacto.', 'url', '', 'Pegar URL')
    + (d.enlazado && otraEdicion(d)
        ? accion(I.link, 'Ediciones enlazadas', 'Este disco está enlazado con su edición en '
            + otraEdicion(d).formato + '. Puedes separarlas.', 'desenlazar', '', 'Separar')
        : (candidatasEnlace(d).length
          ? accion(I.link, 'Enlazar ediciones', 'Tienes este mismo álbum en '
              + candidatasEnlace(d)[0].formato + '. Enlázalos para saltar de uno a otro.', 'enlazar', '', 'Enlazar')
          : ''))
    + accion(I.img, 'Imágenes de la edición', d.fotoDisco
        ? 'Cambia la carátula o la foto del disco que se ve al girar la portada.'
        : 'Busca en Discogs las imágenes de esta edición: sirven de carátula o de cara B.', 'foto', '', 'Ver imágenes')
    + accion(I.copy, 'Duplicar ficha', 'Crea una copia, útil si tienes el mismo disco en dos formatos.', 'dup', '', 'Duplicar')
    + '</div>';
  var s = sheet(d.titulo, body);
  var cerrar = function(){ s.remove(); };
  s.querySelector('[data-a=tags]').onclick = function(){ cerrar(); editarEtiquetas(d, padre); };
  s.querySelector('[data-a=lend]').onclick = function(){ cerrar(); prestar(d, padre); };
  var bw = s.querySelector('[data-a=wish]');
  if(bw) bw.onclick = function(){
    d.lista = 'deseos';
    persist(); cerrar(); if(padre) padre.remove();
    toast('Movido a deseos');
  };
  var bc = s.querySelector('[data-a=comprado]');
  if(bc) bc.onclick = function(){ cerrar(); marcarComprado(d.id, padre); };
  s.querySelector('[data-a=gaps]').onclick = function(){ cerrar(); verHuecos(d.artista); };
  s.querySelector('[data-a=url]').onclick = function(){ cerrar(); pedirUrl(d, padre); };
  var bel = s.querySelector('[data-a=enlazar]');
  if(bel) bel.onclick = function(){
    var otras = candidatasEnlace(d);
    cerrar();
    if(otras.length === 1){
      enlazarEdiciones(d, otras[0]);
      if(padre) padre.remove();
      toast('Enlazado con la edición en ' + otras[0].formato);
      openDetail(d.id);
      return;
    }
    var s2 = sheet('¿Con cuál lo enlazo?',
      '<div class="cands">' + otras.map(function(o, i){
        return '<div class="cand" data-i="' + i + '">'
          + (o.portada ? '<img class="cimg" src="' + esc(o.portada) + '">' : '<div class="cimg"></div>')
          + '<div class="cinf"><div class="t">' + esc(o.titulo) + '</div><div class="s">' + o.formato
          + (o['año'] ? ' · ' + o['año'] : '') + '</div></div></div>';
      }).join('') + '</div>');
    s2.querySelectorAll('.cand').forEach(function(el){
      el.onclick = function(){
        enlazarEdiciones(d, otras[+el.dataset.i]);
        s2.remove();
        if(padre) padre.remove();
        toast('Ediciones enlazadas');
        openDetail(d.id);
      };
    });
  };
  var bdes = s.querySelector('[data-a=desenlazar]');
  if(bdes) bdes.onclick = function(){
    separarEdiciones(d);
    cerrar();
    if(padre) padre.remove();
    toast('Ediciones separadas');
    openDetail(d.id);
  };
  var bf = s.querySelector('[data-a=foto]');
  if(bf) bf.onclick = function(){ cerrar(); elegirFotoSoporte(d, padre); };
  s.querySelector('[data-a=dup]').onclick = function(){
    var copia = normDisc(JSON.parse(JSON.stringify(d)));
    copia.id = uid(); copia.fechaAlta = nowISO();
    DB.discos.push(copia);
    persist(); cerrar(); if(padre) padre.remove();
    toast('Ficha duplicada');
    openForm(copia);
  };
}
function accion(icon, title, desc, a, cls, label){
  return '<div class="act"><div class="hd">' + icon + title + '</div><p>' + desc + '</p>'
    + '<button type="button" class="btn ' + (cls || '') + '" data-a="' + a + '">' + label + '</button></div>';
}

function editarEtiquetas(d, padre){
  var sug = todasEtiquetas().filter(function(t){ return d.etiquetas.indexOf(t) < 0; }).slice(0, 12);
  var s = sheet('Etiquetas',
    '<div class="group"><div class="grow"><label>Etiquetas</label><input id="tg" type="text" value="' + esc(d.etiquetas.join(', ')) + '" placeholder="firmado, primera edición…"></div></div>'
    + (sug.length ? '<div style="font-size:12.5px;color:var(--txt2);margin-bottom:8px">Usadas en tu colección</div><div class="rowb">'
      + sug.map(function(t){ return '<button type="button" class="tag usr" data-add="' + esc(t) + '">' + esc(t) + '</button>'; }).join('') + '</div>' : ''),
    '<span></span><button type="button" class="btn pri" id="okt">Guardar</button>');
  s.querySelectorAll('[data-add]').forEach(function(b){
    b.onclick = function(){
      var i = s.querySelector('#tg');
      i.value = (i.value.trim() ? i.value.trim().replace(/,\s*$/, '') + ', ' : '') + b.dataset.add;
    };
  });
  s.querySelector('#okt').onclick = function(){
    d.etiquetas = s.querySelector('#tg').value.split(',').map(function(x){ return x.trim(); }).filter(Boolean);
    persist(); s.remove(); if(padre) padre.remove();
    toast('Etiquetas guardadas');
  };
}
function prestar(d, padre){
  var s = sheet('Préstamo',
    '<div class="group">' + fieldRow('Prestado a', '<input id="pa" type="text" value="' + esc(d.prestadoA) + '" placeholder="Nombre">')
    + fieldRow('Desde', '<input id="pd" type="date" value="' + esc(d.prestadoDesde || new Date().toISOString().slice(0, 10)) + '">') + '</div>',
    '<button type="button" class="btn destr" id="quitar">Sin préstamo</button><button type="button" class="btn pri" id="okp">Guardar</button>');
  s.querySelector('#okp').onclick = function(){
    d.prestadoA = s.querySelector('#pa').value.trim();
    d.prestadoDesde = d.prestadoA ? s.querySelector('#pd').value : '';
    persist(); s.remove(); if(padre) padre.remove();
    toast(d.prestadoA ? 'Anotado el préstamo a ' + d.prestadoA : 'Préstamo eliminado');
  };
  s.querySelector('#quitar').onclick = function(){
    d.prestadoA = ''; d.prestadoDesde = '';
    persist(); s.remove(); if(padre) padre.remove();
    toast('Préstamo eliminado');
  };
}
function pedirUrl(d, padre){
  var s = sheet('Fijar edición por URL',
    '<p style="font-size:13.5px;color:var(--txt2);line-height:1.5;margin:0 0 14px">Busca tu prensado exacto en MusicBrainz y pega aquí la dirección. '
    + 'Sirve la de la edición (<b>/release/…</b>), la del álbum (<b>/release-group/…</b>) o un enlace de Discogs.</p>'
    + '<div class="group"><div class="grow"><label>URL</label><input id="u" type="text" placeholder="https://musicbrainz.org/release/…"></div></div>'
    + '<a class="lnk" target="_blank" rel="noopener" href="https://musicbrainz.org/search?type=release&query='
    + encodeURIComponent(d.artista + ' ' + d.titulo) + '">' + I.search + 'Buscar «' + esc(d.titulo) + '» en MusicBrainz</a>'
    + '<div id="unote"></div>',
    '<span></span><button type="button" class="btn pri" id="oku">Aplicar</button>');
  s.querySelector('#oku').onclick = function(){
    var v = s.querySelector('#u').value.trim();
    if(!idDesdeUrl(v)){ s.querySelector('#unote').innerHTML = '<div class="note err">No reconozco esa dirección.</div>'; return; }
    var b = s.querySelector('#oku'); b.disabled = true; b.textContent = 'Aplicando…';
    porUrl(d, v, d.formato).then(function(){
      s.remove(); if(padre) padre.remove();
      toast('Ficha actualizada desde la URL');
      openDetail(d.id);
    }).catch(function(){
      s.querySelector('#unote').innerHTML = '<div class="note err">No se pudo leer esa edición.</div>';
      b.disabled = false; b.textContent = 'Aplicar';
    });
  };
}

/* ---------- elegir edición ---------- */
function elegirEdicion(d, padre){
  var s = sheet('Ediciones de «' + (d.titulo || '') + '»',
    '<div class="note busy" id="cnote">Buscando ediciones en Apple Music y MusicBrainz…</div><div id="clist"></div>',
    '<button type="button" class="btn sm" id="porUrlBtn">' + I.link + 'Pegar URL</button><button type="button" class="btn" data-close4>Cerrar</button>', true);
  s.querySelector('[data-close4]').onclick = function(){ s.remove(); };
  s.querySelector('#porUrlBtn').onclick = function(){ s.remove(); pedirUrl(d, padre); };
  candidatos(d.titulo, d.artista, d.formato).then(function(list){
    if(!list.length){
      s.querySelector('#cnote').className = 'note err';
      s.querySelector('#cnote').textContent = 'No se encontraron ediciones. Prueba a pegar la URL de MusicBrainz.';
      return;
    }
    s.querySelector('#cnote').style.display = 'none';
    s.querySelector('#clist').innerHTML = '<div class="cands">' + list.map(function(c, i){
      return '<div class="cand" data-i="' + i + '"><img class="cimg" src="' + esc(c.portada) + '" alt="" loading="lazy" data-img-error="dim">'
        + '<div class="cinf"><div class="t">' + esc(c.titulo) + '</div><div class="s">' + esc([c['año'], c.detalle].filter(Boolean).join(' · ')) + '</div></div></div>';
    }).join('') + '</div>';
    s.querySelectorAll('.cand').forEach(function(el){
      el.onclick = function(){
        var c = list[+el.dataset.i];
        el.style.opacity = .5;
        aplicarCandidato(d, c).then(function(){
          s.remove(); if(padre) padre.remove();
          toast('Edición aplicada');
          openDetail(d.id);
        }).catch(function(){ toast('No se pudo aplicar', true); el.style.opacity = 1; });
      };
    });
  }).catch(function(){
    s.querySelector('#cnote').className = 'note err';
    s.querySelector('#cnote').textContent = 'No se pudo consultar. Revisa la conexión.';
  });
}

/* ============================================================
   DIAGNÓSTICO DE EDICIÓN — lógica única
   Compara los identificadores de tu ficha, MusicBrainz y Discogs
   ENTRE SÍ (no solo cada uno contra tu ficha) y da un nivel
   determinista y explicable según la evidencia real -nunca un
   porcentaje inventado-. La usan tanto el Detective (con MusicBrainz
   y Discogs recién consultados) como el Radar (en modo estático, sin
   red, solo con lo que ya hay guardado en tecnica): misma lógica,
   dos formas de alimentarla.
   Devuelve {nivel, problemas, coincidencias}, donde nivel es uno de:
   'solida' | 'probable' | 'parcial' | 'revisar' | 'contradictoria'.
   ============================================================ */
/* El "formato" (CD/Vinilo) es una señal fuerte, pero SOLO al nivel de
   soporte: comparar formatoDetalle como texto libre ("LP, Comp" contra
   "Vinyl · LP, Compilation, Stereo") genera falsos positivos constantes,
   porque cada fuente describe el mismo disco con palabras distintas.
   Por eso el soporte se compara aparte, con formatoBaseDe(). */
var CAMPOS_FUERTES_EDICION = {numeroCatalogo: 'Catálogo', pais: 'País', 'año': 'Año'};
/* Severidad de una discrepancia por campo, no por comparación: da igual que
   una fuente concreta la repita dos o tres veces, el peso lo pone el campo.
   - crítica/fuerte: por sí solas convierten la identificación en contradictoria.
   - moderada: por sí sola también, porque país y soporte son señales fuertes
     de que es otra edición física.
   - informativa (año, sello): se enseña siempre como aviso, pero no basta por
     sí sola para tirar abajo una identificación que ya tenía buena evidencia
     -sellos como "A&M Records" y "A&M Records, Inc." no son ediciones
     distintas, y el año puede venir mal transcrito en cualquiera de las tres
     fuentes sin que el disco sea otro-. */
var SEVERIDAD_CAMPO = {'Código de barras': 'critica', Catálogo: 'fuerte', País: 'moderada', Soporte: 'moderada', 'Año': 'informativa', Sello: 'informativa'};
function formatoBaseDe(texto){
  var t = String(texto || '').toLowerCase();
  if(/\bcd\b/.test(t)) return 'CD';
  if(/vinyl|vinilo|\blp\b/.test(t)) return 'Vinilo';
  return '';
}
function diagnosticarEdicion(d, mb, dg){
  var problemas = [], coincidencias = [], detalles = [];
  /* Evidencia por CAMPO ÚNICO, no por comparación: si ficha=MB, ficha=Discogs
     y MB=Discogs coinciden los tres en el año, eso es UNA sola evidencia
     independiente (año), no tres. evidenciaCampos[campo] = true solo si ese
     campo tuvo al menos una coincidencia y ninguna contradicción. */
  var evidenciaCampos = {}, contradiceCampos = {};
  var fuentes = [];
  if(mb) fuentes.push(['MusicBrainz', mb]);
  if(dg) fuentes.push(['Discogs', dg]);
  /* sin fuentes en vivo (uso estático desde el Radar, sin red): se
     aprovecha lo último que ya se consultó de Discogs y quedó guardado
     en tecnica, la única fuente barata de tener sin volver a preguntar */
  if(!dg && d.tecnica && d.tecnica.pais){
    fuentes.push(['Discogs (guardado)', {
      'año': (String(d.tecnica.publicado || '').match(/^\d{4}/) || [])[0] || '',
      pais: codigoDePaisDiscogs(d.tecnica.pais) || '',
      formatoDetalle: d.tecnica.prensado || ''
    }]);
  }
  var comparar = function(nombreA, valA, nombreB, valB, etiqueta){
    var a = String(valA || '').trim().toLowerCase(), b = String(valB || '').trim().toLowerCase();
    if(!a || !b) return;
    if(a === b){
      coincidencias.push(etiqueta + ' (' + nombreA + ' = ' + nombreB + ')');
      if(!contradiceCampos[etiqueta]) evidenciaCampos[etiqueta] = true;
      return;
    }
    problemas.push(etiqueta + ': ' + nombreA + ' dice «' + valA + '», ' + nombreB + ' dice «' + valB + '»');
    detalles.push({campo: etiqueta, fuenteA: nombreA, valorA: valA, fuenteB: nombreB, valorB: valB});
    contradiceCampos[etiqueta] = true;
    evidenciaCampos[etiqueta] = false;
  };
  var barcodeCoincide = false;
  fuentes.forEach(function(par){
    var nombre = par[0], ext = par[1];
    Object.keys(CAMPOS_FUERTES_EDICION).forEach(function(c){
      var v1 = c === 'pais' ? (d.pais ? nombrePais(d.pais) : '') : d[c];
      var v2 = c === 'pais' ? (ext.pais ? nombrePais(ext.pais) : '') : ext[c];
      comparar('tu ficha', v1, nombre, v2, CAMPOS_FUERTES_EDICION[c]);
    });
    if(ext.sello) comparar('tu ficha', d.sello, nombre, ext.sello, 'Sello');
    comparar('tu ficha', formatoBaseDe(d.formato), nombre, formatoBaseDe(ext.formatoDetalle), 'Soporte');
    if(d.codigoBarras && ext.codigoBarras && String(d.codigoBarras) === String(ext.codigoBarras)) barcodeCoincide = true;
    comparar('tu ficha', d.codigoBarras, nombre, ext.codigoBarras, 'Código de barras');
  });
  /* MusicBrainz y Discogs también se comparan ENTRE SÍ: si Discogs dice
     Alemania y MusicBrainz otra cosa, tiene que saberse aunque los dos
     coincidan con lo que pusiste tú a mano */
  if(mb && dg){
    Object.keys(CAMPOS_FUERTES_EDICION).forEach(function(c){
      var v1 = c === 'pais' ? (mb.pais ? nombrePais(mb.pais) : '') : mb[c];
      var v2 = c === 'pais' ? (dg.pais ? nombrePais(dg.pais) : '') : dg[c];
      comparar('MusicBrainz', v1, 'Discogs', v2, CAMPOS_FUERTES_EDICION[c]);
    });
    comparar('MusicBrainz', formatoBaseDe(mb.formatoDetalle), 'Discogs', formatoBaseDe(dg.formatoDetalle), 'Soporte');
    if(mb.codigoBarras && dg.codigoBarras && String(mb.codigoBarras) === String(dg.codigoBarras)) barcodeCoincide = true;
    comparar('MusicBrainz', mb.codigoBarras, 'Discogs', dg.codigoBarras, 'Código de barras');
  }

  var tieneMbid = !!d.mbid;
  var tieneDiscogsRelease = !!(d.discogs && /release\/\d+/.test(d.discogs));
  var tieneBarcode = !!d.codigoBarras;
  /* nº de campos ÚNICOS con evidencia a favor (no nº de comparaciones) */
  var camposEvidencia = Object.keys(evidenciaCampos).filter(function(c){ return evidenciaCampos[c]; }).length;
  /* la contradicción solo tira abajo la identificación si hay al menos una
     discrepancia de severidad crítica/fuerte/moderada; año o sello solos
     (informativa) se enseñan pero no bastan */
  var ORDEN_SEVERIDAD = {critica: 4, fuerte: 3, moderada: 2, informativa: 1};
  var peorSeveridad = Object.keys(contradiceCampos).reduce(function(peorOrden, campo){
    var s = SEVERIDAD_CAMPO[campo] || 'informativa';
    return Math.max(peorOrden, ORDEN_SEVERIDAD[s]);
  }, 0);
  peorSeveridad = Object.keys(ORDEN_SEVERIDAD).filter(function(k){ return ORDEN_SEVERIDAD[k] === peorSeveridad; })[0] || '';
  var contradice = peorSeveridad === 'critica' || peorSeveridad === 'fuerte' || peorSeveridad === 'moderada';

  var nivel;
  if(d.confianza === 'baja' && !mb && !dg){
    /* el propio autocompletado ya avisó de que fue una coincidencia
       dudosa, y aquí no hay ninguna fuente en vivo que lo desmienta */
    nivel = 'revisar';
  }else if(contradice){
    nivel = 'contradictoria';
  }else if(barcodeCoincide && (tieneMbid || tieneDiscogsRelease)){
    /* código de barras exacto + una edición concreta enlazada: la señal
       más fuerte posible, y ninguna fuente la contradice */
    nivel = 'solida';
  }else if(tieneMbid && tieneDiscogsRelease && camposEvidencia >= 2){
    /* dos ediciones concretas de dos catálogos independientes, y
       coinciden en al menos dos CAMPOS distintos sin contradecirse */
    nivel = 'solida';
  }else if((tieneMbid || tieneDiscogsRelease) && camposEvidencia >= 2){
    nivel = 'probable';
  }else if(tieneMbid || tieneDiscogsRelease || tieneBarcode){
    nivel = 'parcial';
  }else{
    nivel = 'revisar';
  }
  return {
    nivel: nivel,
    problemas: problemas,
    coincidencias: coincidencias,
    detalles: detalles,
    camposEvidencia: camposEvidencia,
    peorSeveridad: peorSeveridad,
    fuentesConsultadas: fuentes.map(function(x){ return x[0]; }),
    evidenciaCampos: evidenciaCampos,
    contradiceCampos: contradiceCampos
  };
}
var INFO_NIVEL_EDICION = {
  solida: ['Identificación sólida', 'var(--green)',
    'El código de barras o dos catálogos independientes (MusicBrainz y Discogs) coinciden entre sí, y nada los contradice.'],
  probable: ['Identificación probable', 'var(--green)',
    'Hay una edición concreta enlazada y varios campos coinciden con ella, aunque no hay una segunda fuente independiente que lo confirme del todo.'],
  parcial: ['Identificación parcial', 'var(--orange)',
    'Hay algo enlazado (MusicBrainz, Discogs o el código de barras), pero pocos campos que comparar. Podría ser esta edición, sin suficiente evidencia cruzada.'],
  revisar: ['Sin confirmar — revisar', 'var(--txt3)',
    'No hay ningún identificador externo enlazado (ni MusicBrainz, ni Discogs, ni código de barras): los datos son los que se escribieron o rellenaron a mano.'],
  contradictoria: ['Datos contradictorios', 'var(--red)',
    'Alguna fuente no coincide con otra o con tu ficha. Puede que no sea exactamente esta edición, o que una de las fuentes esté equivocada.']
};

/* ============================================================
   DETECTIVE DE EDICIONES
   Consulta MusicBrainz y Discogs en vivo y llama a
   diagnosticarEdicion() para dar el veredicto, con la tabla
   comparativa campo a campo que lo justifica.
   ============================================================ */
function detectiveEdiciones(d){
  var body = '<div class="note busy" id="dnote">Consultando'
    + (d.mbid ? ' MusicBrainz' : '') + (d.mbid && hayDiscogs() && d.discogs ? ' y' : '')
    + (hayDiscogs() && d.discogs ? ' Discogs' : '') + '…</div><div id="dres"></div>';
  var s = sheet('Detective de ediciones', body, '<button type="button" class="btn" data-close5>Cerrar</button>', true);
  s.querySelector('[data-close5]').onclick = function(){ s.remove(); };

  var pMb = d.mbid ? mbDetalle(d.mbid).catch(function(){ return null; }) : Promise.resolve(null);
  var pDg = (hayDiscogs() && d.discogs) ? (function(){
    var m = String(d.discogs).match(/release\/(\d+)/);
    return m ? dgGet('releases/' + m[1]).then(dgNormaliza).catch(function(){ return null; }) : Promise.resolve(null);
  })() : Promise.resolve(null);

  Promise.all([pMb, pDg]).then(function(r){
    var mb = r[0], dg = r[1];
    var diag = diagnosticarEdicion(d, mb, dg);
    var info = INFO_NIVEL_EDICION[diag.nivel];

    var filaComp = function(k, campo){
      var v1 = d[campo] || '';
      if(campo === 'pais' && v1) v1 = nombrePais(v1);
      var vmb = mb ? (campo === 'pais' ? (mb.pais ? nombrePais(mb.pais) : '') : mb[campo]) || '' : '';
      var vdg = dg ? (campo === 'pais' ? (dg.pais ? nombrePais(dg.pais) : '') : dg[campo]) || '' : '';
      if(!v1 && !vmb && !vdg) return '';
      var distinto = (mb && vmb && v1 && String(vmb).toLowerCase() !== String(v1).toLowerCase())
        || (dg && vdg && v1 && String(vdg).toLowerCase() !== String(v1).toLowerCase())
        || (mb && dg && vmb && vdg && String(vmb).toLowerCase() !== String(vdg).toLowerCase());
      return '<div class="tcompfila c4' + (distinto ? ' dif' : '') + '"><span class="tck">' + k + '</span>'
        + '<span class="tcv">' + esc(v1 || '—') + '</span>'
        + '<span class="tcv">' + (mb ? esc(vmb || '—') : '—') + '</span>'
        + '<span class="tcv">' + (dg ? esc(vdg || '—') : '—') + '</span></div>';
    };
    var tabla = (mb || dg) ? '<div class="tcomp"><div class="tcompfila c4 tchd"><span class="tck"></span>'
      + '<span class="tcv">Tu ficha</span><span class="tcv">MusicBrainz</span><span class="tcv">Discogs</span></div>'
      + filaComp('Año', 'año') + filaComp('Sello', 'sello') + filaComp('Catálogo', 'numeroCatalogo')
      + filaComp('País', 'pais') + filaComp('Código de barras', 'codigoBarras')
      + filaComp('Formato', 'formatoDetalle') + '</div>' : '';

    var faltan = [];
    if(!d.mbid) faltan.push('enlazar con MusicBrainz (botón «Buscar otra edición»)');
    if(hayDiscogs() && !d.discogs) faltan.push('enlazar con Discogs');
    if(!d.codigoBarras) faltan.push('añadir el código de barras');

    s.querySelector('#dnote').remove();
    var fuentesTxt = [];
    fuentesTxt.push('Tu ficha');
    if(mb) fuentesTxt.push('MusicBrainz');
    if(dg) fuentesTxt.push('Discogs');
    var severidadTxt = diag.peorSeveridad
      ? ' · discrepancia ' + ({critica:'crítica', fuerte:'fuerte', moderada:'moderada', informativa:'informativa'}[diag.peorSeveridad] || diag.peorSeveridad)
      : '';
    var evidenciaTxt = diag.camposEvidencia
      ? diag.camposEvidencia + (diag.camposEvidencia === 1 ? ' campo coincide' : ' campos coinciden')
      : 'sin coincidencias comparables';
    s.querySelector('#dres').innerHTML =
      '<div class="confbadge" style="--cb-c:' + info[1] + '"><span>' + I.info + '</span>'
      + '<span><span class="tt">' + info[0] + '</span>' + info[2] + '</span></div>'
      + '<div class="creds" style="margin-top:12px">'
      + '<div class="cred"><span class="k">Fuentes usadas</span><span class="v">' + esc(fuentesTxt.join(' · ')) + '</span></div>'
      + '<div class="cred"><span class="k">Evidencia</span><span class="v">' + esc(evidenciaTxt + severidadTxt) + '</span></div>'
      + '</div>'
      /* diag.problemas lleva dentro valores de la propia ficha y de MusicBrainz/
         Discogs -no texto nuestro-: hay que escapar cada mensaje antes de
         meterlo en innerHTML, o un valor con "<" o comillas podría inyectar
         HTML. El <br> de separación se añade fuera de lo escapado, a propósito. */
      + (diag.problemas.length ? '<div class="warnb" style="margin-top:12px">' + I.warn
          + '<span><b>Qué no cuadra</b><br>' + diag.problemas.map(esc).join('<br>') + '</span></div>' : '')
      + tabla
      + (faltan.length ? '<p style="font-size:13px;color:var(--txt3);margin:14px 3px 0">Para subir la confianza: '
          + faltan.map(esc).join(', ') + '.</p>' : '')
      + '<div class="rowb" style="margin-top:16px">'
      + (readOnly ? '' : '<button type="button" class="btn" id="dCambiar">' + I.layers + 'Buscar otra edición</button>') + '</div>';
    var bc = s.querySelector('#dCambiar');
    if(bc) bc.onclick = function(){ s.remove(); elegirEdicion(d); };
  }).catch(function(){
    s.querySelector('#dnote').className = 'note err';
    s.querySelector('#dnote').textContent = 'No se pudo consultar. Revisa la conexión.';
  });
}

/* ---------- huecos ---------- */
function verHuecos(artista){
  var s = sheet('Discografía de ' + artista,
    '<div class="note busy" id="hnote">Consultando la discografía completa en MusicBrainz…</div><div id="hlist"></div>');
  huecosArtista(artista).then(function(rgs){
    if(!rgs.length){
      s.querySelector('#hnote').className = 'note err';
      s.querySelector('#hnote').textContent = 'No se encontró la discografía de este artista.';
      return;
    }
    var faltan = rgs.filter(function(r){ return !r.tengo; });
    s.querySelector('#hnote').style.display = 'none';
    s.querySelector('#hlist').innerHTML =
      '<p style="font-size:14.5px;color:var(--txt2);margin:0 0 14px">Tienes <b style="color:var(--txt)">' + (rgs.length - faltan.length)
      + ' de ' + rgs.length + '</b> álbumes de estudio.</p><div class="tl">'
      + rgs.map(function(r, i){
        return '<div class="trk"><span class="num">' + (r['año'] || '—') + '</span>'
          + '<span class="nm" style="' + (r.tengo ? '' : 'color:var(--txt2)') + '">' + esc(r.titulo) + '</span>'
          + (r.tengo ? '<span class="tag grn">Lo tienes</span>'
            : (readOnly ? '' : '<button type="button" class="btn xs" data-add="' + i + '">' + I.heart + 'Deseos</button>')) + '</div>';
      }).join('') + '</div>';
    s.querySelectorAll('[data-add]').forEach(function(b){
      b.onclick = function(){
        var r = rgs[+b.dataset.add];
        DB.discos.push(normDisc({
          id: uid(), lista:'deseos', artista: artista, titulo: r.titulo, 'año': r['año'],
          formato: 'Vinilo', rgid: r.id, fechaAlta: nowISO()
        }));
        persist();
        b.outerHTML = '<span class="tag pur">En deseos</span>';
        toast('«' + r.titulo + '» añadido a deseos');
      };
    });
  }).catch(function(){
    s.querySelector('#hnote').className = 'note err';
    s.querySelector('#hnote').textContent = 'No se pudo consultar MusicBrainz.';
  });
}

/* ---------- formulario ---------- */
function openForm(item, listaDestino, preset){
  var ed = !!item;
  var d = item || normDisc(Object.assign({lista: listaDestino || 'coleccion'}, preset || {}));
  var formato = d.formato || 'Vinilo';
  var tracks = normTracks(d.tracklist);
  var portada = d.portada || '';

  var body =
    '<div id="dupw"></div>'
    + '<div class="covrow"><div class="covbox" id="cbox">' + (portada ? '<img src="' + esc(portada) + '" data-img-error="remove">' : (formato === 'Vinilo' ? I.disc : I.cd)) + '</div>'
    + '<div style="flex:1"><div class="aicard">' + I.spark + '<div class="txt">Escribe <b>título y artista</b> y pulsa <b>Completar</b>: carátula, tracklist con duraciones, año, sello, catálogo, país, formato y género.</div></div>'
    + '<div class="rowb" style="margin-top:8px"><button type="button" class="btn sm" id="upImg">' + I.img + 'Subir imagen</button>'
    + '<button type="button" class="btn sm" id="edicBtn">' + I.layers + 'Ediciones</button>'
    + (portada ? '<button type="button" class="btn sm destr" id="rmImg">Quitar</button>' : '') + '</div><div id="ainote"></div></div></div>'
    + '<div class="dosseg">'
      + '<div><label class="minilbl">Soporte</label><div class="segtype">'
        + '<button type="button" id="tv" class="' + (formato === 'Vinilo' ? 'on' : '') + '">' + I.vinBadge + 'Vinilo</button>'
        + '<button type="button" id="tc" class="' + (formato === 'CD' ? 'on' : '') + '">' + I.cdBadge + 'CD</button></div></div>'
      + '<div><label class="minilbl">Lista</label><div class="segtype">'
        + '<button type="button" id="lc" class="' + (d.lista !== 'deseos' ? 'on' : '') + '">' + I.layers + 'Colección</button>'
        + '<button type="button" id="ld" class="' + (d.lista === 'deseos' ? 'on' : '') + '">' + I.heart + 'Deseos</button></div></div>'
    + '</div>'
    + '<div class="group">' + fieldRow('Título', '<input id="fT" type="text" value="' + esc(d.titulo) + '" placeholder="Nombre del álbum">')
    + fieldRow('Artista', '<input id="fA" type="text" value="' + esc(d.artista) + '" placeholder="Nombre del artista">') + '</div>'
    + '<button type="button" class="btn pri wide" id="aiBtn" style="margin-bottom:14px">' + I.spark + 'Completar</button>'
    + '<div class="group">' + fieldRow('URL MusicBrainz', '<input id="fU2" type="text" value="' + esc(d.mbid ? 'https://musicbrainz.org/release/' + d.mbid : d.discogs) + '" placeholder="Pega aquí si no lo encuentra">') + '</div>'
    + '<div class="gtit">Identificación</div><div class="group">'
      + fieldRow('Género', '<select id="fG">' + genOpts(d.genero) + '</select>' + CHEV)
      + fieldRow('Año', '<input id="fY" type="text" value="' + esc(d['año']) + '" placeholder="1994">')
    + '</div>'
    + '<div class="gtit">Edición</div><div class="group">'
      + fieldRow('Formato', '<input id="fF" type="text" value="' + esc(d.formatoDetalle) + '" placeholder="LP, 2xLP, CD Digipak…">')
      + fieldRow('Sello', '<input id="fL" type="text" value="' + esc(d.sello) + '">')
      + fieldRow('Catálogo', '<input id="fC" type="text" value="' + esc(d.numeroCatalogo) + '">')
      + fieldRow('País', '<input id="fP" type="text" value="' + esc(d.pais) + '" placeholder="ES, US, GB…">')
    + '</div>'
    + '<div class="gtit">Compra y ubicación</div><div class="group">'
      + fieldRow('Estado del disco', '<select id="fS"><option value="">Sin indicar</option>'
        + ESTADOS.map(function(e){ return '<option value="' + esc(e) + '"' + (e === d.estado ? ' selected' : '') + '>' + esc(e) + '</option>'; }).join('')
        + (d.estado && ESTADOS.indexOf(d.estado) < 0 ? '<option value="' + esc(d.estado) + '" selected>' + esc(d.estado) + '</option>' : '')
        + '</select>' + CHEV)
      + fieldRow('Estado de la funda', '<select id="fSf"><option value="">Sin indicar</option>'
        + ESTADOS.map(function(e){ return '<option value="' + esc(e) + '"' + (e === d.estadoFunda ? ' selected' : '') + '>' + esc(e) + '</option>'; }).join('')
        + (d.estadoFunda && ESTADOS.indexOf(d.estadoFunda) < 0 ? '<option value="' + esc(d.estadoFunda) + '" selected>' + esc(d.estadoFunda) + '</option>' : '')
        + '</select>' + CHEV)
      + fieldRow('Comprado', '<input id="fD" type="date" value="' + esc(d.fechaCompra) + '">')
      + fieldRow('Precio (€)', '<input id="fPr" type="number" step="0.01" min="0" value="' + (d.precioCompra || '') + '" placeholder="0,00">')
      + fieldRow('Valor (€)', '<input id="fVm" type="number" step="0.01" min="0" value="' + (d.valorMercado || '') + '" placeholder="Estimado">')
      + fieldRow('Dónde está', '<input id="fUb" type="text" value="' + esc(d.ubicacion) + '" placeholder="Estantería 2, balda alta…">')
      + fieldRow('Ejemplares', '<input id="fEj" type="number" min="1" max="99" value="' + (d.ejemplares || 1) + '">')
    + '</div>'
    + '<div class="gtit">Personal</div><div class="group">'
      + fieldRow('Etiquetas', '<input id="fEt" type="text" value="' + esc(d.etiquetas.join(', ')) + '" placeholder="firmado, primera edición…">')
    + '</div>'
    + '<div class="gtit">Carátula</div>'
    + '<div class="group">' + fieldRow('Dirección', '<input id="fU" type="text" value="' + esc(portada.indexOf('data:') === 0 ? '' : portada) + '" placeholder="' + (portada.indexOf('data:') === 0 ? 'Imagen incrustada' : 'https://…') + '">') + '</div>'
    + '<div class="tl-hd"><h4>Tracklist<span class="n" id="tlN"></span></h4></div>'
    + '<div id="tlEdit" style="margin-bottom:15px"></div>'
    + '<div class="group"><div class="grow col"><label>Notas</label><textarea id="fN" placeholder="Edición, anécdota, dónde lo compraste…">' + esc(d.notas) + '</textarea></div></div>';

  var foot = (ed ? '<button type="button" class="btn destr" id="del">' + I.trash + 'Eliminar</button>' : '<span></span>')
    + '<div class="rowb"><button type="button" class="btn" data-close2>Cancelar</button><button type="button" class="btn pri" id="save">Guardar</button></div>';

  var s = sheet(ed ? 'Editar disco' : 'Nuevo disco', body, foot);
  var $ = function(q){ return s.querySelector(q); };
  $('[data-close2]').onclick = function(){ s.remove(); };

  function paintCover(){
    $('#cbox').innerHTML = portada ? '<img src="' + esc(portada) + '" data-img-error="remove">' : (formato === 'Vinilo' ? I.disc : I.cd);
  }
  function paintTL(){
    $('#tlN').textContent = tracks.length ? ' · ' + tracks.length : '';
    $('#tlEdit').innerHTML = '<div class="tl">' + (tracks.length ? tracks.map(function(t, i){
      return '<div class="trk"><span class="num">' + (i + 1) + '</span>'
        + '<input class="tn" data-i="' + i + '" value="' + esc(t.titulo) + '" placeholder="Título de la canción">'
        + '<input class="d td" data-i="' + i + '" value="' + esc(t.duracion) + '" placeholder="—">'
        + '<button type="button" class="del" data-del="' + i + '">' + I.minus + '</button></div>';
    }).join('') : '<div class="tl-empty">Sin canciones todavía</div>')
      + '<button type="button" class="tl-add" id="addTrk">' + I.plus + 'Añadir canción</button></div>';
    $('#addTrk').onclick = function(){ tracks.push({titulo:'', duracion:'', preview:''}); paintTL(); var a = $('#tlEdit').querySelectorAll('.tn'); if(a.length) a[a.length-1].focus(); };
    $('#tlEdit').querySelectorAll('.tn').forEach(function(i){ i.oninput = function(e){ tracks[+e.target.dataset.i].titulo = e.target.value; }; });
    $('#tlEdit').querySelectorAll('.td').forEach(function(i){ i.oninput = function(e){ tracks[+e.target.dataset.i].duracion = e.target.value; }; });
    $('#tlEdit').querySelectorAll('[data-del]').forEach(function(b){ b.onclick = function(){ tracks.splice(+b.dataset.del, 1); paintTL(); }; });
  }
  paintTL();

  var listaSel = d.lista === 'deseos' ? 'deseos' : 'coleccion';
  function setType(t){ formato = t; $('#tv').className = t === 'Vinilo' ? 'on' : ''; $('#tc').className = t === 'CD' ? 'on' : ''; paintCover(); checkDup(); }
  $('#tv').onclick = function(){ setType('Vinilo'); };
  $('#tc').onclick = function(){ setType('CD'); };
  function setLista(l){
    listaSel = l;
    $('#lc').className = l === 'coleccion' ? 'on' : '';
    $('#ld').className = l === 'deseos' ? 'on' : '';
  }
  $('#lc').onclick = function(){ setLista('coleccion'); };
  $('#ld').onclick = function(){ setLista('deseos'); };
  $('#fU').oninput = function(e){ portada = e.target.value.trim(); paintCover(); };
  $('#upImg').onclick = function(){
    var inp = document.getElementById('fileImg');
    inp.value = '';
    inp.onchange = function(ev){
      var f = ev.target.files[0];
      if(!f) return;
      fileToDataUri(f, 600).then(function(uri){
        portada = uri; $('#fU').value = ''; $('#fU').placeholder = 'Imagen incrustada';
        paintCover(); toast('Imagen incrustada (' + bytes(uri.length * 0.75) + ')');
      });
    };
    inp.click();
  };
  if($('#rmImg')) $('#rmImg').onclick = function(){ portada = ''; $('#fU').value = ''; paintCover(); };
  $('#edicBtn').onclick = function(){
    var t = $('#fT').value.trim(), a = $('#fA').value.trim();
    if(!t){ toast('Escribe al menos el título', true); return; }
    var tmp = ed ? d : normDisc({id:d.id, titulo:t, artista:a, formato:formato});
    if(!ed){
      tmp.titulo = t; tmp.artista = a; tmp.formato = formato;
      elegirEdicionTemp(tmp, function(){
        portada = tmp.portada; tracks = normTracks(tmp.tracklist);
        $('#fY').value = tmp['año']; $('#fL').value = tmp.sello; $('#fC').value = tmp.numeroCatalogo;
        $('#fP').value = tmp.pais; $('#fF').value = tmp.formatoDetalle; $('#fG').value = tmp.genero;
        $('#fU').value = tmp.portada; d.mbid = tmp.mbid; d.rgid = tmp.rgid;
        paintCover(); paintTL();
      });
    }else{
      elegirEdicion(d, s);
    }
  };

  function checkDup(){
    var t = $('#fT').value.trim().toLowerCase(), a = $('#fA').value.trim().toLowerCase();
    if(!t && !a){ $('#dupw').innerHTML = ''; return; }
    var m = DB.discos.filter(function(x){
      return x.id !== (item && item.id) && (x.titulo || '').trim().toLowerCase() === t
        && (x.artista || '').trim().toLowerCase() === a && x.formato === formato;
    })[0];
    $('#dupw').innerHTML = m ? '<div class="warnb">' + I.warn + '<span>Ya tienes <b>' + esc(m.titulo) + '</b> de ' + esc(m.artista) + ' en ' + formato + '.</span></div>' : '';
  }
  $('#fT').oninput = checkDup; $('#fA').oninput = checkDup;

  $('#aiBtn').onclick = function(){
    var t = $('#fT').value.trim(), a = $('#fA').value.trim(), u = $('#fU2').value.trim();
    if(!t && !a && !u){ $('#ainote').innerHTML = '<div class="note err">Escribe al menos el título o el artista.</div>'; return; }
    var b = $('#aiBtn'); b.disabled = true; b.innerHTML = I.spark + 'Buscando…';
    $('#ainote').innerHTML = '<div class="note busy">Consultando Apple Music y MusicBrainz…</div>';
    var vuelca = function(r){
      if(!r) throw new Error('vacío');
      if(r.portada){ portada = r.portada; $('#fU').value = r.portada; paintCover(); }
      if(r.tracklist && r.tracklist.length){ tracks = normTracks(r.tracklist); paintTL(); }
      if(r['año']) $('#fY').value = r['año'];
      if(r.sello) $('#fL').value = r.sello;
      if(r.numeroCatalogo) $('#fC').value = r.numeroCatalogo;
      if(r.pais) $('#fP').value = r.pais;
      if(r.formatoDetalle) $('#fF').value = r.formatoDetalle;
      if(r.genero) $('#fG').value = r.genero;
      if(r.mbid){ d.mbid = r.mbid; $('#fU2').value = 'https://musicbrainz.org/release/' + r.mbid; }
      if(r.rgid) d.rgid = r.rgid;
      if(r.notas && !$('#fN').value.trim()) $('#fN').value = r.notas;
      $('#ainote').innerHTML = '<div class="note ok">Ficha completada</div>';
    };
    var fin = function(){ b.disabled = false; b.innerHTML = I.spark + 'Completar'; };
    if(u && idDesdeUrl(u)){
      var tmp = normDisc({id:d.id, titulo:t, artista:a, formato:formato});
      porUrl(tmp, u, formato).then(function(){ vuelca(tmp); }).catch(function(){
        $('#ainote').innerHTML = '<div class="note err">No se pudo leer esa URL.</div>';
      }).then(fin);
      return;
    }
    fetchInfo(t, a, formato, {sello:true, catalogo:true, pais:true, formato:true, 'año':true})
      .then(vuelca)
      .catch(function(){
        $('#ainote').innerHTML = '<div class="note err">Sin coincidencia exacta. Te enseño lo más parecido…</div>';
        var tmp2 = normDisc({id:d.id, titulo:t, artista:a, formato:formato});
        elegirEdicionTemp(tmp2, function(){
          portada = tmp2.portada; tracks = normTracks(tmp2.tracklist);
          $('#fY').value = tmp2['año']; $('#fL').value = tmp2.sello; $('#fC').value = tmp2.numeroCatalogo;
          $('#fP').value = tmp2.pais; $('#fF').value = tmp2.formatoDetalle;
          if(tmp2.genero) $('#fG').value = tmp2.genero;
          $('#fU').value = tmp2.portada; d.mbid = tmp2.mbid; d.rgid = tmp2.rgid;
          paintCover(); paintTL();
          $('#ainote').innerHTML = '<div class="note ok">Ficha completada</div>';
        });
      })
      .then(fin);
  };

  if(ed) $('#del').onclick = function(){
    if(confirm('¿Eliminar "' + (d.titulo || 'este disco') + '" de la colección?')){
      guardarDeshacer([d], 'eliminar disco');
      DB.discos = DB.discos.filter(function(x){ return x.id !== d.id; });
      persist(); s.remove(); toast('Disco eliminado');
    }
  };

  $('#save').onclick = function(){
    var u2 = $('#fU2').value.trim();
    var ref = idDesdeUrl(u2);
    /* Se parte de una copia completa de la ficha tal como estaba (d ya tiene
       la forma canónica entera, la ponga openForm al abrir editando o creando)
       y solo se sobrescriben los campos que vienen del formulario. Así ningún
       dato que no se edita aquí —valoración, escuchas, foto del disco, ficha
       técnica, enlaces— puede perderse al guardar. */
    var n = normDisc(Object.assign({}, d, {
      id: d.id || uid(), formato: formato, lista: listaSel,
      titulo: $('#fT').value.trim(), artista: $('#fA').value.trim(),
      genero: $('#fG').value, 'año': $('#fY').value.trim(), formatoDetalle: $('#fF').value.trim(),
      sello: $('#fL').value.trim(), numeroCatalogo: $('#fC').value.trim(), pais: $('#fP').value.trim().toUpperCase(),
      estado: $('#fS').value.trim(), estadoFunda: $('#fSf').value.trim(), fechaCompra: $('#fD').value,
      precioCompra: parseFloat($('#fPr').value) || 0, valorMercado: parseFloat($('#fVm').value) || 0,
      portada: portada, tracklist: tracks.filter(function(t){ return t.titulo.trim(); }),
      notas: $('#fN').value.trim(),
      etiquetas: $('#fEt').value.split(',').map(function(x){ return x.trim(); }).filter(Boolean),
      ubicacion: $('#fUb').value.trim(),
      ejemplares: Math.max(1, parseInt($('#fEj').value) || 1),
      mbid: (ref && ref.tipo === 'release') ? ref.id : d.mbid,
      rgid: (ref && ref.tipo === 'rg') ? ref.id : d.rgid,
      discogs: (ref && ref.tipo === 'discogs') ? ref.url : d.discogs,
      fechaAlta: d.fechaAlta || nowISO(), editado: Object.assign({}, d.editado)
    }));
    if(!n.titulo && !n.artista){ toast('Falta el título o el artista', true); return; }
    /* «faltan» es la foto de lo que le faltaba la última vez que pasó por
       "Revisar todo"; si el usuario acaba de rellenar aquí a mano uno de esos
       campos (o de borrarlo), se recalcula para que no siga anunciando un
       hueco que ya no existe -o callando uno nuevo-. Un disco que nunca se
       ha revisado sigue sin «faltan»: eso significa otra cosa (no evaluado). */
    refrescarFaltan(n);
    /* los campos que rellenan las fuentes externas quedan protegidos si el usuario
       los ha escrito o cambiado a mano, para que «Completar» no los vuelva a pisar */
    CAMPOS_AUTO.forEach(function(f){
      var antes = d[f], ahora = n[f];
      var cambiado = Array.isArray(ahora) ? JSON.stringify(ahora) !== JSON.stringify(antes) : ahora !== antes;
      if(cambiado && ahora){ n.editado[f] = true; }
    });
    if(n.lista === 'deseos'){
      var yaTengo = equivalenteEn(n, 'coleccion');
      if(yaTengo.length && !confirm('Ya tienes «' + yaTengo[0].titulo + '» de ' + yaTengo[0].artista
          + ' en tu colección (' + yaTengo[0].formato + ').\n\n¿Aun así lo añades a deseos?')) return;
    }
    if(ed) DB.discos = DB.discos.map(function(x){ return x.id === n.id ? n : x; });
    else DB.discos.push(n);
    persist();
    s.remove();
    /* si el disco ya trae una edición de Discogs enlazada y lo tienes activado,
       se sube también a tu colección de allí; si falla, no interrumpe nada */
    if(!ed && CFG.subirADiscogs && hayDiscogs() && n.discogs){
      subirADiscogsColeccion(n).then(function(){
        toast('Añadido también a tu colección de Discogs');
      }).catch(function(){
        toast('No se pudo subir a Discogs · puedes añadirlo tú allí', true);
      });
    }
    if(!ed && incompleto(n)){
      toast('Guardado · buscando datos…');
      enrich(n.id, false).then(function(ok){
        toast(ok ? 'Ficha completada automáticamente' : 'No se encontró · abre la ficha y prueba «Ediciones»', !ok);
      });
    }else{
      toast(ed ? 'Cambios guardados' : 'Disco añadido');
    }
  };
}
function elegirEdicionTemp(tmp, cb){
  var s = sheet('Ediciones de «' + tmp.titulo + '»',
    '<div class="note busy" id="cnote">Buscando ediciones…</div><div id="clist"></div>', null, true);
  candidatos(tmp.titulo, tmp.artista, tmp.formato).then(function(list){
    if(!list.length){ s.querySelector('#cnote').className = 'note err'; s.querySelector('#cnote').textContent = 'Sin resultados.'; return; }
    s.querySelector('#cnote').style.display = 'none';
    s.querySelector('#clist').innerHTML = '<div class="cands">' + list.map(function(c, i){
      return '<div class="cand" data-i="' + i + '"><img class="cimg" src="' + esc(c.portada) + '" alt="" loading="lazy" data-img-error="dim">'
        + '<div class="cinf"><div class="t">' + esc(c.titulo) + '</div><div class="s">' + esc([c['año'], c.detalle].filter(Boolean).join(' · ')) + '</div></div></div>';
    }).join('') + '</div>';
    s.querySelectorAll('.cand').forEach(function(el){
      el.onclick = function(){
        el.style.opacity = .5;
        aplicarCandidato(tmp, list[+el.dataset.i]).then(function(){ s.remove(); cb(); }).catch(function(){ el.style.opacity = 1; });
      };
    });
  }).catch(function(){ s.querySelector('#cnote').className = 'note err'; s.querySelector('#cnote').textContent = 'No se pudo consultar.'; });
}


/* Galería de imágenes de Discogs: sirve para la carátula y para la cara B */
function elegirFotoSoporte(d, padre){
  var s = sheet('Imágenes de esta edición',
    '<div class="warnb info">' + I.info + '<span>Discogs no dice cuál es cuál, así que elige tú. '
    + 'La <b>carátula</b> es la portada que se ve en la colección; la <b>cara B</b> es la foto del vinilo '
    + 'o el CD que aparece al girar la portada.</span></div>'
    + '<div class="note busy" id="fnote">Buscando imágenes en Discogs…</div><div id="flist"></div>',
    (d.fotoDisco ? '<button type="button" class="btn destr" id="fQuitar">Quitar la cara B</button>' : '<span></span>')
    + '<button type="button" class="btn" data-fx>Cerrar</button>', true);
  s.querySelector('[data-fx]').onclick = function(){ s.remove(); };
  if(s.querySelector('#fQuitar')) s.querySelector('#fQuitar').onclick = function(){
    d.fotoDisco = ''; d.fotoDiscoMbid = ''; d.sinFoto = 1;
    persist();
    s.remove();
    if(padre) padre.remove();
    toast('Se vuelve al disco dibujado');
    openDetail(d.id);
  };
  if(!hayDiscogs()){
    s.querySelector('#fnote').className = 'note err';
    s.querySelector('#fnote').textContent = 'Necesitas configurar tu token de Discogs en Ajustes.';
    return;
  }
  imagenesDiscogs(d).then(function(ims){
    s.querySelector('#fnote').style.display = 'none';
    s.querySelector('#flist').innerHTML = '<div class="cands imgs">' + ims.map(function(im, i){
      return '<div class="cand"><img class="cimg" src="' + esc(im.mini || im.uri)
        + '" alt="" loading="lazy" data-img-error="dim">'
        + '<div class="cinf"><div class="s">' + (i === 0 ? 'Portada en Discogs' : 'Imagen ' + (i + 1)) + '</div>'
        + '<div class="dosbtn"><button type="button" class="btn xs" data-car="' + i + '">Carátula</button>'
        + '<button type="button" class="btn xs" data-dis="' + i + '">Cara B</button></div></div></div>';
    }).join('') + '</div>';
    s.querySelectorAll('[data-car]').forEach(function(b){
      b.onclick = function(){
        d.portada = ims[+b.dataset.car].uri;
        d.color = '';
        persist();
        s.remove();
        if(padre) padre.remove();
        toast('Carátula cambiada');
        openDetail(d.id);
      };
    });
    s.querySelectorAll('[data-dis]').forEach(function(b){
      b.onclick = function(){
        var elegida = ims[+b.dataset.dis].uri;
        /* si es la primera imagen, casi seguro que es la portada y no el disco */
        if(+b.dataset.dis === 0 && !confirm('Esa suele ser la portada, no el disco.\n\n'
            + '¿Seguro que quieres usarla como cara B? Si lo que querías era cambiar la carátula, '
            + 'pulsa Cancelar y usa el botón «Carátula».')) return;
        d.fotoDisco = elegida;
        /* viene de Discogs, no de un MusicBrainz Release concreto: no hay
           mbid con el que comparar, así que no se marca como desactualizada */
        d.fotoDiscoMbid = '';
        d.sinFoto = 0;
        persist();
        s.remove();
        if(padre) padre.remove();
        toast('Imagen del disco guardada');
        openDetail(d.id);
      };
    });
  }).catch(function(){
    s.querySelector('#fnote').className = 'note err';
    s.querySelector('#fnote').textContent = 'Esta edición no tiene imágenes en Discogs.';
  });
}

