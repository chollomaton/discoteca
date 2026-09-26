/* Transferencia e importaciones. APIs globales conservadas; carga antes de bootstrap. */
/* ============================================================
   7. IMPORTACIÓN Y EXPORTACIÓN
   ============================================================ */
function parseCSV(text){
  text = text.replace(/^\uFEFF/, '');
  var rows = [], row = [], cur = '', q = false, i = 0;
  while(i < text.length){
    var c = text[i];
    if(q){
      if(c === '"'){ if(text[i+1] === '"'){ cur += '"'; i++; } else q = false; }
      else cur += c;
    }else{
      if(c === '"') q = true;
      else if(c === ','){ row.push(cur); cur = ''; }
      else if(c === '\n'){ row.push(cur); rows.push(row); row = []; cur = ''; }
      else if(c === '\r'){ /* nada */ }
      else cur += c;
    }
    i++;
  }
  if(cur.length || row.length){ row.push(cur); rows.push(row); }
  if(!rows.length) return [];
  var head = rows.shift().map(function(h){ return h.trim(); });
  return rows.filter(function(r){ return r.length > 1; }).map(function(r){
    var o = {}; head.forEach(function(h, j){ o[h] = (r[j] || '').trim(); }); return o;
  });
}
function csvCell(v){
  var s = (v == null ? '' : String(v));
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function filaADisco(x){
  var titulo = (x['Title'] || x['Título'] || x['Titulo'] || '').trim();
  var artista = (x['Artist'] || x['Artista'] || '').trim();
  if(!titulo && !artista) return null;
  var fmtRaw = (x['Format'] || x['Formato'] || '').trim();
  var formato = fmtRaw.toLowerCase().indexOf('cd') >= 0 ? 'CD' : 'Vinilo';
  return normDisc({
    id: uid(), artista: artista, titulo: titulo,
    'año': (x['Released'] || x['Año'] || '').trim(),
    formato: formato, formatoDetalle: fmtRaw,
    genero: clasificar(x['Genre'] || x['Style'] || x['Género'] || '', false, artista),
    sello: (x['Label'] || x['Sello'] || '').trim(),
    numeroCatalogo: (x['Catalog#'] || x['Catálogo'] || '').trim(),
    estado: (x['Collection Media Condition'] || x['Estado'] || '').trim(),
    notas: (x['Collection Notes'] || x['Notas'] || '').trim(),
    lista: /wishlist|deseos/i.test(x['CollectionFolder'] || '') ? 'deseos' : 'coleccion',
    fechaAlta: nowISO()
  });
}

/* Clasifica cada fila del CSV: nuevo, idéntico o dudoso.
   Nunca sobrescribe: los idénticos se descartan y los dudosos se preguntan. */
function nucleoTitulo(t){
  return plain(String(t || '')
    .replace(/[\(\[][^\)\]]*[\)\]]/g, ' ')
    .replace(/\b(remaster(ed)?|remasterizado|deluxe|expanded|edition|edicion|edición|anniversary|aniversario|reissue|reedicion|reedición|bonus|special|especial|limited|limitada|version|versión|digipak|digipack|vol|volume|volumen)\b/gi, ' ')
    .replace(/\s*[-–—:]\s*$/, ''));
}
function analizarImportacion(filas){
  var nuevos = [], identicos = [], dudosos = [];
  var porClave = {}, porArtista = {}, porCat = {};
  var registrar = function(d){
    porClave[key(d)] = d;
    var a = plain(d.artista);
    (porArtista[a] = porArtista[a] || []).push(d);
    if(d.numeroCatalogo) porCat[plain(d.numeroCatalogo)] = d;
  };
  DB.discos.forEach(registrar);
  filas.forEach(function(fila){
    var d = filaADisco(fila);
    if(!d) return;
    var exacto = porClave[key(d)];
    if(exacto){ identicos.push({nuevo:d, actual:exacto}); return; }

    var cands = porArtista[plain(d.artista)] || [], mejor = null, mejorS = 0, motivo = '';
    var nuc = nucleoTitulo(d.titulo);
    cands.forEach(function(c){
      var s = similitud(c.titulo, d.titulo), m = 'títulos parecidos';
      var nc = nucleoTitulo(c.titulo);
      if(nuc && nc && nuc === nc){ s = Math.max(s, 0.97); m = 'mismo álbum, edición distinta'; }
      if(d.numeroCatalogo && c.numeroCatalogo && plain(d.numeroCatalogo) === plain(c.numeroCatalogo)){ s = 1; m = 'mismo número de catálogo'; }
      if(s > mejorS){ mejorS = s; mejor = c; motivo = m; }
    });
    if(!mejor && d.numeroCatalogo && porCat[plain(d.numeroCatalogo)]){
      mejor = porCat[plain(d.numeroCatalogo)]; mejorS = 1; motivo = 'mismo número de catálogo';
    }
    if(mejor && mejorS >= 0.72){ dudosos.push({nuevo:d, actual:mejor, score:mejorS, motivo:motivo}); return; }
    nuevos.push(d);
    registrar(d);
  });
  return {nuevos:nuevos, identicos:identicos, dudosos:dudosos};
}
function importCsv(file){
  var r = new FileReader();
  r.onload = function(){
    var filas = parseCSV(String(r.result));
    if(!filas.length){ toast('El CSV está vacío o no se pudo leer', true); return; }
    var an = analizarImportacion(filas);
    pantallaImportacion(an, filas.length);
  };
  r.readAsText(file);
}
function pantallaImportacion(an, total){
  var body =
    '<p style="font-size:14.5px;color:var(--txt2);line-height:1.5;margin:0 0 14px">Se han leído <b style="color:var(--txt)">'
    + total + ' filas</b>. Nada de lo que ya tienes se modificará sin que lo apruebes.</p>'
    + '<div class="kpis" style="margin-bottom:16px">'
      + '<div class="kpi"><div><div class="lbl">' + I.plus + 'Nuevos</div><div class="val">' + an.nuevos.length + '</div></div></div>'
      + '<div class="kpi"><div><div class="lbl">' + I.copy + 'Ya los tienes</div><div class="val">' + an.identicos.length + '</div></div></div>'
      + '<div class="kpi"><div><div class="lbl">' + I.warn + 'Dudosos</div><div class="val">' + an.dudosos.length + '</div></div></div>'
    + '</div>'
    + '<div class="warnb info">' + I.check + '<span>Los <b>' + an.nuevos.length + ' nuevos</b> se añadirán. '
    + 'Los <b>' + an.identicos.length + ' repetidos exactos</b> se descartan y tu ficha se queda intacta.'
    + (an.dudosos.length ? ' Los <b>' + an.dudosos.length + ' dudosos</b> te los enseñaré uno a uno para que decidas.' : '')
    + '</span></div>';
  var pie = '<button type="button" class="btn" data-cerrar>Cancelar</button><button type="button" class="btn pri" id="impGo">'
    + (an.dudosos.length ? 'Continuar' : 'Añadir ' + an.nuevos.length) + '</button>';
  var s = sheet('Importar CSV de Discogs', body, pie);
  s.querySelector('[data-cerrar]').onclick = function(){ s.remove(); };
  s.querySelector('#impGo').onclick = function(){
    an.nuevos.forEach(function(d){ DB.discos.push(d); });
    persist();
    s.remove();
    if(an.dudosos.length) revisarDudosos(an.dudosos, an.nuevos.length);
    else{
      toast(an.nuevos.length + ' discos añadidos' + (an.identicos.length ? ' · ' + an.identicos.length + ' repetidos descartados' : ''));
      if(an.nuevos.length) setTimeout(function(){ bulkRun(an.nuevos.filter(incompleto)); }, 600);
    }
  };
}
function revisarDudosos(dudosos, yaAnadidos){
  var i = 0, res = {mantener:0, sustituir:0, ambos:0}, aplicarTodo = '';
  var nuevosCompletar = [];
  var s = sheet('Revisar posibles repetidos', '<div id="revBody"></div>',
    '<button type="button" class="btn" id="revSalir">Terminar</button><div class="rowb" id="revBtns"></div>');
  var $ = function(q){ return s.querySelector(q); };

  function campo(k, a, b){
    var dif = String(a || '') !== String(b || '');
    return '<div class="f' + (dif ? ' dif' : '') + '"><span class="k">' + k + '</span><span class="v">' + esc(a || '—') + '</span></div>';
  }
  function ficha(d, titulo, clase){
    return '<div class="vsc ' + (clase || '') + '"><div class="h">' + titulo + '</div>'
      + '<div style="text-align:center;margin-bottom:10px"><div style="width:76px;height:76px;margin:0 auto;border-radius:10px;overflow:hidden;background:var(--fill);display:flex;align-items:center;justify-content:center">'
      + (d.portada ? '<img src="' + esc(d.portada) + '" style="width:100%;height:100%;object-fit:cover" data-img-error="remove">' : I.disc) + '</div></div>'
      + '<div style="font-size:14px;font-weight:600;text-align:center;line-height:1.3;margin-bottom:2px">' + esc(d.titulo) + '</div>'
      + '<div style="font-size:12.5px;color:var(--txt2);text-align:center;margin-bottom:10px">' + esc(d.artista) + '</div>'
      + '<div>' + '</div></div>';
  }
  function pintar(){
    if(i >= dudosos.length){ terminar(); return; }
    var par = dudosos[i], a = par.actual, b = par.nuevo;
    var comparar = function(d, otro){
      return campo('Año', d['año'], otro['año']) + campo('Soporte', d.formato, otro.formato)
        + campo('Formato', d.formatoDetalle, otro.formatoDetalle) + campo('Sello', d.sello, otro.sello)
        + campo('Catálogo', d.numeroCatalogo, otro.numeroCatalogo) + campo('Estado', d.estado, otro.estado)
        + campo('Temas', d.tracklist.length || '—', otro.tracklist.length || '—');
    };
    $('#revBody').innerHTML =
      '<div class="impbar"><span>Dudoso ' + (i + 1) + ' de ' + dudosos.length + '</span>'
      + '<span>' + esc(par.motivo || 'parecido') + ' · ' + Math.round(par.score * 100) + '%</span></div>'
      + '<div class="vs">'
        + ficha(a, 'La tuya', 'win').replace('<div></div>', comparar(a, b))
        + ficha(b, 'La del CSV', '').replace('<div></div>', comparar(b, a))
      + '</div>'
      + '<div class="rowb" style="justify-content:center"><label style="font-size:12.5px;color:var(--txt2);display:flex;align-items:center;gap:6px">'
      + '<input type="checkbox" id="revTodo"> Aplicar lo mismo al resto</label></div>';
    $('#revBtns').innerHTML =
      '<button type="button" class="btn sm" data-r="ambos">Guardar las dos</button>'
      + '<button type="button" class="btn sm" data-r="sustituir">Sustituir</button>'
      + '<button type="button" class="btn pri sm" data-r="mantener">Mantener la mía</button>';
    $('#revBtns').querySelectorAll('[data-r]').forEach(function(b2){
      b2.onclick = function(){
        var acc = b2.dataset.r;
        if($('#revTodo') && $('#revTodo').checked) aplicarTodo = acc;
        decidir(acc);
      };
    });
  }
  function decidir(acc){
    var par = dudosos[i], a = par.actual, b = par.nuevo;
    if(acc === 'sustituir'){
      /* mismo patrón que en el formulario: se parte de una copia completa de
         la ficha que ya tenías (a) y solo se sobrescribe con lo que de verdad
         viene del CSV, para no perder nada que el CSV no toca -ficha técnica,
         escuchas, foto del disco, enlaces entre ediciones, etc. */
      var fusionado = normDisc(Object.assign({}, a, {
        titulo: b.titulo, artista: b.artista, 'año': b['año'], formato: b.formato,
        formatoDetalle: b.formatoDetalle, genero: b.genero, sello: b.sello,
        numeroCatalogo: b.numeroCatalogo, estado: b.estado || a.estado,
        notas: b.notas || a.notas, lista: b.lista,
        portada: a.portada || b.portada,
        tracklist: a.tracklist.length ? a.tracklist : b.tracklist
      }));
      DB.discos = DB.discos.map(function(x){ return x.id === a.id ? fusionado : x; });
      nuevosCompletar.push(fusionado);
      res.sustituir++;
    }else if(acc === 'ambos'){
      DB.discos.push(b);
      nuevosCompletar.push(b);
      res.ambos++;
    }else res.mantener++;
    i++;
    if(aplicarTodo && i < dudosos.length){ decidir(aplicarTodo); return; }
    pintar();
  }
  function terminar(){
    persist();
    s.remove();
    var partes = [];
    if(yaAnadidos) partes.push(yaAnadidos + ' añadidos');
    if(res.ambos) partes.push(res.ambos + ' guardados aparte');
    if(res.sustituir) partes.push(res.sustituir + ' sustituidos');
    if(res.mantener) partes.push(res.mantener + ' conservados');
    toast(partes.join(' · ') || 'Sin cambios');
    var pend = nuevosCompletar.filter(incompleto);
    if(pend.length) setTimeout(function(){ bulkRun(pend); }, 600);
  }
  $('#revSalir').onclick = terminar;
  pintar();
}

function exportarCsv(){
  var cab = ['Catalog#','Artist','Title','Label','Format','Rating','Released','release_id','CollectionFolder',
    'Date Added','Collection Media Condition','Collection Sleeve Condition','Collection Notes','Género','País','Precio','Etiquetas'];
  var lines = [cab.join(',')];
  DB.discos.forEach(function(d){
    /* release_id es el identificador numérico de Discogs (lo que trae este CSV
       cuando se reimporta ahí o en otra app compatible), no el mbid: son dos
       sistemas de identificadores distintos y no son intercambiables. */
    var refDg = idDesdeUrl(d.discogs);
    var releaseId = (refDg && refDg.tipo === 'discogs') ? refDg.id : '';
    lines.push([
      d.numeroCatalogo, d.artista, d.titulo, d.sello, d.formatoDetalle || d.formato, d.valoracion || '', d['año'], releaseId,
      d.lista === 'deseos' ? 'Wishlist' : 'Uncategorized', (d.fechaAlta || '').slice(0, 10),
      d.estado, d.estadoFunda, d.notas, d.genero, d.pais, d.precioCompra || '', d.etiquetas.join(' | ')
    ].map(csvCell).join(','));
  });
  download('discoteca-' + new Date().toISOString().slice(0, 10) + '.csv', '\uFEFF' + lines.join('\n'), 'text/csv;charset=utf-8');
  toast('CSV exportado · ' + DB.discos.length + ' discos');
}
/* Solo documentos de colección; nunca configuración ni credenciales. */
function validarCopia(o){
  var doc = Array.isArray(o) ? {discos:o, borrados:[]} : o;
  if(!doc || typeof doc !== 'object' || !Array.isArray(doc.discos) ||
     (doc.version != null && (!Number.isInteger(doc.version) || doc.version < 1 || doc.version > 4)) ||
     (doc.borrados != null && !Array.isArray(doc.borrados))) throw new Error('Formato de copia no compatible');
  var ids = new Set();
  var idValido = function(id){ return typeof id === 'string' && id && !['__proto__','constructor','prototype'].includes(id); };
  doc.discos.forEach(function(d){
    if(!d || !idValido(d.id) || ids.has(d.id) || typeof d.titulo !== 'string' || typeof d.artista !== 'string')
      throw new Error('La copia contiene fichas inválidas o repetidas');
    ids.add(d.id);
    if(Array.isArray(d.tracklist) && d.tracklist.some(function(t){ return !t || (typeof t !== 'string' && typeof t !== 'object'); }))
      throw new Error('Pistas inválidas');
    ['tracklist','etiquetas','escuchasFechas'].forEach(function(k){
      if(d[k] != null && !Array.isArray(d[k])) throw new Error('Campo de colección inválido');
    });
  });
  (doc.borrados || []).forEach(function(d){
    if(!d || !idValido(d.id) || !Number.isFinite(Date.parse(d.fecha))) throw new Error('Registro de borrados inválido');
  });
  return {version:4, actualizado:doc.actualizado || '', discos:doc.discos, borrados:doc.borrados || []};
}
function descargarCopia(doc, prefijo){
  var texto = JSON.stringify(validarCopia(doc), null, 1);
  var nombre = (prefijo || 'discoteca') + '-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
  var completada = function(){
    try{ localStorage.setItem('discoteca.ultimaCopia', nowISO()); }catch(e){}
    toast('Copia exportada · comprueba que la has guardado');
  };
  var archivo = new File([texto], nombre, {type:'application/json'});
  if(navigator.canShare && navigator.canShare({files:[archivo]})){
    return navigator.share({files:[archivo], title:'Copia de la discoteca'}).then(completada).catch(function(e){
      if(e && e.name === 'AbortError') return;
      download(nombre, texto, 'application/json'); completada();
    });
  }
  download(nombre, texto, 'application/json'); completada();
  return Promise.resolve();
}
function exportBackup(){
  return descargarCopia({version:4, actualizado:DB.actualizado, discos:DB.discos, borrados:DB.borrados || []});
}
function exportarRecuperacion(){
  return leerPuntoRecuperacion().then(function(copia){
    if(!copia){ toast('Todavía no hay una copia de recuperación'); return; }
    return descargarCopia(copia, 'discoteca-recuperacion');
  }).catch(function(){ toast('No se pudo leer la copia de recuperación', true); });
}
function fusionarCopiaRecuperacion(doc, recuperarBorrados){
  var existentes = new Set(DB.discos.map(function(d){ return d.id; }));
  var recuperar = new Set();
  var fichas = doc.discos.map(function(d){
    var ficha = normDisc(d);
    if(recuperarBorrados && !existentes.has(ficha.id)){
      recuperar.add(ficha.id);
      ficha.mod = nowISO(); ficha.modsBase = ficha.mod; ficha.modsCampos = {};
    }
    return ficha;
  });
  return fusionar(DB.discos, (DB.borrados || []).filter(function(b){ return !recuperar.has(b.id); }),
    fichas, doc.borrados.filter(function(b){ return !recuperar.has(b.id); }));
}
function importBackup(file){
  if(configuracionEnCurso || pullPromiseActual || pushPromiseActual){ toast('Espera a que termine la sincronización', true); return; }
  var r = new FileReader();
  r.onerror = function(){ toast('No se pudo leer el archivo', true); };
  r.onload = function(){
    var doc;
    try{ doc = validarCopia(JSON.parse(String(r.result))); }
    catch(e){ toast('El archivo no es una copia válida: ' + e.message, true); return; }
    if(!confirm('Copia validada · esquema v' + doc.version + '. Fusionar ' + doc.discos.length + ' fichas y ' + doc.borrados.length + ' borrados. Los borrados de la copia pueden eliminar fichas. Se guardará una copia previa de recuperación. ¿Continuar?')) return;
    if(configuracionEnCurso || pullPromiseActual || pushPromiseActual){ toast('Espera a que termine la sincronización', true); return; }
    var recuperarBorrados = confirm('¿Recuperar también las fichas de la copia que ya no están en tu colección? Aceptar las recupera; Cancelar respeta los borrados actuales.');
    configuracionEnCurso = true;
    clearTimeout(saveTimer); saveTimer = null;
    var estadoPrevio = JSON.parse(JSON.stringify(DB));
    crearPuntoRecuperacion('Antes de restaurar una copia').then(function(){
      var res = fusionarCopiaRecuperacion(doc, recuperarBorrados);
      DB.discos = res.discos.map(normDisc); DB.borrados = res.borrados;
      DB.actualizado = nowISO(); revisionDatos++;
      indexarFirmas();
      return guardarLocal();
    }).then(function(){
      configuracionEnCurso = false;
      if(configurado()){ marcar('pend'); programarPush(); }
      renderAll(); toast('Copia fusionada · ' + DB.discos.length + ' discos');
    }).catch(function(){
      configuracionEnCurso = false;
      DB = estadoPrevio; revisionDatos++; indexarFirmas(); renderAll();
      toast('No se pudo guardar la recuperación. Conserva el archivo y exporta la colección; no cierres la app.', true);
    });
  };
  r.readAsText(file);
}

/* ---------- fusionar duplicados ---------- */
/* Fusión recursiva de "tecnica"/"extra": objeto + objeto se combina clave a
   clave bajando a cualquier profundidad (así se preservan sub-objetos
   complementarios dentro de otro sub-objeto, no solo en el primer nivel:
   p.ej. companias.A de una ficha y companias.B de otra sobreviven las dos,
   no solo el objeto companias completo de la que gane). array + array se
   une sin duplicados. Si uno de los dos falta, gana el que hay. Si ambos son
   valores sueltos y distintos (dos escalares, o un objeto contra un
   escalar), NO se inventa una combinación: se conserva el de "a" -la ficha
   ya elegida hasta ahora- tal cual estaba, sin tocarlo. */
function fusionaProfunda(a, b){
  if(a === undefined || a === null || a === '') return b;
  if(b === undefined || b === null || b === '') return a;
  if(Array.isArray(a) && Array.isArray(b)){
    var union = a.slice();
    b.forEach(function(x){
      var yaEsta = union.some(function(y){ return JSON.stringify(y) === JSON.stringify(x); });
      if(!yaEsta) union.push(x);
    });
    return union;
  }
  var esObjA = a && typeof a === 'object' && !Array.isArray(a);
  var esObjB = b && typeof b === 'object' && !Array.isArray(b);
  if(esObjA && esObjB){
    var r = {}, k;
    for(k in a) r[k] = a[k];
    for(k in b) r[k] = (k in r) ? fusionaProfunda(r[k], b[k]) : b[k];
    return r;
  }
  return a; /* tipos incompatibles o dos escalares distintos: no se arriesga nada */
}
/* Combina varios tracklists del mismo álbum en uno solo: parte del más largo
   (probablemente el más completo) y, para cada uno de los demás, empareja
   cada tema por título normalizado y, si las dos listas tienen igual número
   de temas y el título no coincide, por posición -nunca inventa una
   coincidencia entre títulos claramente distintos de listas de distinta
   longitud. De cada tema emparejado rellena solo lo que al tema base le
   faltaba (duración, fav, pos, disco, preview), sin pisar lo que ya tenía. */
function fusionaTracklists(listas){
  var original = listas.reduce(function(m, l){ return (l || []).length > m.length ? l : m; }, []);
  /* Copia profunda antes de tocar nada: "original" es el tracklist de verdad
     de una ficha que sigue viva en DB.discos -fusionarDuplicados() llama a
     esta función para construir la VISTA PREVIA, antes de que el usuario
     confirme nada-. Sin esta copia, con solo abrir "Fusionar" y pulsar
     Cancelar, la ficha original ya habría quedado alterada en memoria. */
  var base = JSON.parse(JSON.stringify(original));
  var basePlano = base.map(function(t){ return plain(t.titulo); });
  listas.forEach(function(l){
    if(l === original || !l || !l.length) return;
    var mismaLongitud = l.length === base.length;
    l.forEach(function(t, i){
      var idx = basePlano.indexOf(plain(t.titulo));
      if(idx < 0 && mismaLongitud) idx = i;
      if(idx < 0) return;
      var bt = base[idx];
      if(!bt.duracion && t.duracion) bt.duracion = t.duracion;
      if(!bt.preview && t.preview) bt.preview = t.preview;
      if(bt.pos === undefined && t.pos !== undefined) bt.pos = t.pos;
      if(bt.disco === undefined && t.disco !== undefined) bt.disco = t.disco;
      if(!bt.fav && t.fav) bt.fav = 1;
    });
  });
  return base;
}
/* Campos personales donde dos copias con un valor distinto NO deben
   resolverse en silencio: se avisa de la diferencia antes de fusionar. */
var CAMPOS_CONFLICTO_FUSION = {
  ubicacion: 'Ubicación', estado: 'Estado del disco', estadoFunda: 'Estado de la funda',
  precioCompra: 'Precio de compra', valorMercado: 'Valor de mercado', prestadoA: 'Prestado a', notas: 'Notas'
};
function fusionarDuplicados(base){
  var grupo2 = DB.discos.filter(function(x){ return key(x) === key(base); });
  if(grupo2.length < 2){ toast('No hay fichas repetidas de este disco'); return; }
  /* Todos los campos de valor único de normDisc que no llevan un merge
     especial abajo: se queda el primero no vacío que aparezca, recorriendo
     las fichas en orden. Si una ficha no tiene un dato, se coge de la
     siguiente; nada de lo que ya tenías se pierde por estar duplicado. */
  var campos = ['año','genero','sello','numeroCatalogo','pais','formatoDetalle','portada',
    'mbid','rgid','discogs','codigoBarras','color','confianza',
    'valoracion','revisado','faltan','fotoDisco','fotoDiscoMbid','appleUrl',
    'fechaCompra','ultimaEscucha','prestadoDesde'];
  var res = normDisc(JSON.parse(JSON.stringify(grupo2[0])));
  /* Ficha con la modificación más reciente: es la que gana en cada conflicto
     real de un campo personal (más fiable que "la primera que aparezca"). */
  var masReciente = grupo2.reduce(function(m, d){ return (d.mod || '') > (m.mod || '') ? d : m; }, grupo2[0]);
  var conflictos = [];
  Object.keys(CAMPOS_CONFLICTO_FUSION).forEach(function(f){
    var valores = [];
    grupo2.forEach(function(d){
      var v = d[f];
      if(v === undefined || v === null || v === '') return;
      if(valores.filter(function(x){ return String(x.valor) === String(v); }).length) return;
      valores.push({valor: v, mod: d.mod || ''});
    });
    if(valores.length > 1){
      conflictos.push({campo: f, etiqueta: CAMPOS_CONFLICTO_FUSION[f], valores: valores, elegido: masReciente[f]});
    }
    res[f] = masReciente[f] !== undefined && masReciente[f] !== null && masReciente[f] !== '' ? masReciente[f]
      : (valores.length ? valores[0].valor : res[f]);
  });
  grupo2.forEach(function(d){
    campos.forEach(function(f){ if(!res[f] && d[f]) res[f] = d[f]; });
    res.tecnica = fusionaProfunda(res.tecnica, d.tecnica);
    res.extra = fusionaProfunda(res.extra, d.extra);
    if(res.ejemplares < (d.ejemplares || 1)) res.ejemplares = d.ejemplares;
    d.etiquetas.forEach(function(t){ if(res.etiquetas.indexOf(t) < 0) res.etiquetas.push(t); });
    /* editado: se unen las protecciones de campo de todas las fichas, para que
       un campo protegido manualmente en cualquiera de ellas se siga respetando. */
    if(d.editado) Object.keys(d.editado).forEach(function(k){ if(d.editado[k]) res.editado[k] = true; });
    /* escuchasFechas: se unen las fechas de todas las fichas (no solo el
       recuento), porque son escuchas reales del mismo disco físico repartidas
       entre las copias duplicadas. */
    (d.escuchasFechas || []).forEach(function(f){ if(res.escuchasFechas.indexOf(f) < 0) res.escuchasFechas.push(f); });
  });
  res.tracklist = fusionaTracklists(grupo2.map(function(d){ return d.tracklist || []; }));
  res.escuchasFechas.sort();
  res.escuchasFechas = res.escuchasFechas.slice(-600);
  res.escuchas = Math.max(res.escuchas, res.escuchasFechas.length);
  if(res.escuchasFechas.length) res.ultimaEscucha = res.escuchasFechas[res.escuchasFechas.length - 1];
  var htmlConflictos = conflictos.length
    ? '<div class="warnb" style="align-items:flex-start;flex-direction:column;gap:8px">' + I.warn
      + '<b style="display:block">Diferencias entre las fichas — revísalas antes de fusionar</b>'
      + conflictos.map(function(c){
          return '<div style="font-size:13.5px;color:var(--txt2)"><b>' + esc(c.etiqueta) + ':</b> '
            + c.valores.map(function(v){ return '«' + esc(String(v.valor)) + '»'; }).join(' / ')
            + ' — se usará «' + esc(String(c.elegido)) + '» (de la edición más reciente)</div>';
        }).join('')
      + '</div>'
    : '';
  var s = sheet('Fusionar ' + grupo2.length + ' fichas',
    '<p style="font-size:14.5px;color:var(--txt2);line-height:1.5;margin:0 0 14px">Se conservará una sola ficha con lo mejor de cada una: '
    + 'el tracklist más completo, la portada, y todos los campos rellenos. Las demás se eliminarán.</p>'
    + htmlConflictos
    + '<div class="specs">' + spec('Título', res.titulo) + spec('Artista', res.artista) + spec('Año', res['año'] || '—')
    + spec('Sello', res.sello || '—') + spec('Temas', res.tracklist.length) + spec('Portada', res.portada ? 'Sí' : 'No') + '</div>',
    '<span></span><div class="rowb"><button type="button" class="btn" data-close5>Cancelar</button><button type="button" class="btn pri" id="okf">Fusionar</button></div>');
  s.querySelector('[data-close5]').onclick = function(){ s.remove(); };
  s.querySelector('#okf').onclick = function(){
    guardarDeshacer(grupo2, 'fusionar fichas');
    var ids = grupo2.map(function(d){ return d.id; });
    DB.discos = DB.discos.filter(function(d){ return ids.indexOf(d.id) < 0; });
    DB.discos.push(res);
    persist(); s.remove();
    toast(grupo2.length + ' fichas fusionadas en una');
  };
}


/* Recuperación explícita: conserva tombstones y propaga las retiradas al sincronizar. */
function restaurarCheckpoint(){
  if(configuracionEnCurso || pullPromiseActual || pushPromiseActual){ toast('Espera a que termine la sincronización', true); return Promise.resolve(); }
  var previo;
  return leerPuntoRecuperacion().then(function(copia){
    if(!copia){ toast('Todavía no hay checkpoint'); return; }
    var doc = validarCopia(copia);
    if(!confirm('Recuperar el checkpoint con ' + doc.discos.length + ' discos y ' + doc.borrados.length + ' borrados. Se guardará el estado actual. ¿Continuar?')) return;
    if(configuracionEnCurso || pullPromiseActual || pushPromiseActual) throw new Error('Sincronización en curso');
    configuracionEnCurso = true; clearTimeout(saveTimer); saveTimer = null;
    previo = JSON.parse(JSON.stringify(DB));
    return crearPuntoRecuperacion('Antes de recuperar el checkpoint').then(function(){
      var fecha = nowISO(), ids = new Set(doc.discos.map(function(d){ return d.id; }));
      var borrados = new Map((doc.borrados || []).map(function(b){ return [b.id, b]; }));
      previo.discos.forEach(function(d){ if(!ids.has(d.id)) borrados.set(d.id, {id:d.id, fecha:fecha}); });
      DB.discos = doc.discos.map(function(d){ var ficha = normDisc(d); ficha.mod = fecha; ficha.modsBase = fecha; ficha.modsCampos = {}; return ficha; });
      DB.borrados = Array.from(borrados.values()); DB.actualizado = fecha; revisionDatos++; indexarFirmas();
      return guardarLocal();
    }).then(function(){
      configuracionEnCurso = false; if(configurado()){ marcar('pend'); programarPush(); }
      renderAll(); toast('Checkpoint recuperado; el estado anterior también está disponible');
    }).catch(function(e){
      DB = previo; revisionDatos++; indexarFirmas(); configuracionEnCurso = false; renderAll(); throw e;
    });
  }).catch(function(){ toast('No se pudo recuperar el checkpoint', true); });
}
