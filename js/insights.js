/* ============================================================
   29. MÁQUINA DEL TIEMPO
   ============================================================ */
function maquinaDelTiempo(){
  if(!configurado()){
    sheet('Máquina del tiempo',
      '<div class="warnb">' + I.warn + '<span>Necesita la sincronización con GitHub: el historial de tu '
      + 'repositorio es lo que permite viajar atrás.</span></div>');
    return;
  }
  var s = sheet('Máquina del tiempo',
    '<div class="warnb info">' + I.clock + '<span>Cada vez que se sincroniza, GitHub guarda una copia. '
    + 'Aquí puedes ver cómo era tu colección en cualquier momento del pasado.</span></div>'
    + '<div class="note busy" id="mtNota">Leyendo el historial…</div><div id="mtBody"></div>', null, true);
  /* GitHub solo da 100 commits por página: si hay más de 100 sincronizaciones
     históricas de datos.json, se piden páginas siguientes -con un tope
     defensivo- para no dejar fuera el historial más antiguo. */
  var urlBase = GH + encodeURIComponent(CFG.owner) + '/' + encodeURIComponent(CFG.repo)
    + '/commits?path=' + encodeURIComponent(CFG.path) + '&sha=' + encodeURIComponent(CFG.branch) + '&per_page=100';
  var TOPE_PAGINAS_COMMITS = 5; /* hasta 500 commits de historial */
  var pedirCommits = function(pagina, acumulado){
    return fetch(urlBase + '&page=' + pagina, {headers: ghHeaders()}).then(function(r){ return r.json(); }).then(function(lote){
      if(!Array.isArray(lote)) throw new Error('sin historial');
      acumulado = acumulado.concat(lote);
      if(lote.length === 100 && pagina < TOPE_PAGINAS_COMMITS) return pedirCommits(pagina + 1, acumulado);
      return acumulado;
    });
  };
  pedirCommits(1, []).then(function(commits){
    if(!Array.isArray(commits) || !commits.length) throw new Error('sin historial');
    s.querySelector('#mtNota').style.display = 'none';
    var puntos = commits.map(function(c){
      return {sha:c.sha, fecha:(c.commit && c.commit.committer && c.commit.committer.date) || '', msg:(c.commit && c.commit.message) || ''};
    }).filter(function(x){ return x.fecha; });
    var mtSliderTimer = null;
    var pintar = function(i){
      var p = puntos[i];
      s.querySelector('#mtBody').innerHTML =
        '<div class="mtnav"><div class="mtf">' + fdate(p.fecha) + '</div>'
        + '<input type="range" id="mtR" min="0" max="' + (puntos.length - 1) + '" value="' + i + '">'
        + '<div class="mts">' + (i === 0 ? 'ahora' : 'hace ' + Math.round((Date.now() - new Date(p.fecha).getTime()) / 86400000) + ' días') + '</div></div>'
        + '<div class="note busy" id="mtCarga">Cargando esa versión…</div><div id="mtCont"></div>';
      var sl = s.querySelector('#mtR');
      /* Mover el slider dispara dos peticiones a GitHub por cada versión: sin
         esperar a que el usuario suelte, arrastrarlo rápido lanzaría una a la
         vez por cada tick. Se espera a que se quede quieto un instante. */
      clearTimeout(mtSliderTimer);
      sl.oninput = function(){
        clearTimeout(mtSliderTimer);
        var i = +sl.value;
        mtSliderTimer = setTimeout(function(){ pintar(i); }, 350);
      };
      fetch(GH + encodeURIComponent(CFG.owner) + '/' + encodeURIComponent(CFG.repo)
        + '/contents/' + CFG.path.split('/').map(encodeURIComponent).join('/') + '?ref=' + p.sha,
        {headers: ghHeaders()})
        .then(function(r){ return r.json(); })
        .then(function(j){
          var doc = JSON.parse(b64dec(j.content));
          var viejos = doc.discos || [];
          var ahora = {};
          DB.discos.forEach(function(d){ ahora[d.id] = 1; });
          var idsViejos = {};
          viejos.forEach(function(d){ idsViejos[d.id] = 1; });
          var nuevos = DB.discos.filter(function(d){ return !idsViejos[d.id]; });
          var nv = viejos.filter(function(d){ return d.formato === 'Vinilo'; }).length;
          s.querySelector('#mtCarga').style.display = 'none';
          s.querySelector('#mtCont').innerHTML =
            '<div class="resumen" style="display:flex;margin-bottom:16px">'
            + '<div><div class="v">' + viejos.length + '</div><div class="k">discos</div></div>'
            + '<div class="rcol"><span class="v rvin">' + nv + '</div><div class="k">vinilos</div></div>'
            + '<div><div class="v rcd">' + (viejos.length - nv) + '</div><div class="k">CDs</div></div>'
            + '<div><div class="v">' + (nuevos.length ? '+' + nuevos.length : '—') + '</div><div class="k">desde entonces</div></div>'
            + '</div>'
            + (nuevos.length
              ? '<div class="tl-hd"><h4>Lo que ha entrado después</h4></div>'
                + '<div class="grid paisgrid">' + nuevos.slice(0, 18).map(function(d){ return tileHtml(d, null); }).join('') + '</div>'
              : '<div class="tl-empty">Tu colección no ha cambiado desde entonces</div>');
          enlazarTiles(s, null);
        })
        .catch(function(){
          var c = s.querySelector('#mtCarga');
          if(c){ c.className = 'note err'; c.textContent = 'No se pudo cargar esa versión.'; }
        });
    };
    pintar(Math.min(puntos.length - 1, 5));
  }).catch(function(){
    var n = s.querySelector('#mtNota');
    n.className = 'note err';
    n.textContent = 'No se pudo leer el historial del repositorio.';
  });
}

/* ============================================================
   30. LISTAS INTELIGENTES
   ============================================================ */
var K_LISTAS = 'discoteca.listas';
function listasGuardadas(){
  try{ return JSON.parse(localStorage.getItem(K_LISTAS) || '[]'); }catch(e){ return []; }
}
function guardarListas(l){
  try{ localStorage.setItem(K_LISTAS, JSON.stringify(l)); }catch(e){}
}
function filtrosActuales(){
  return {
    q: (document.getElementById('q') || {}).value || '',
    tipo: fType, genero: fGen, artista: fArt, etiqueta: fTag,
    decada: fDec, pais: fPais, sello: fSello, orden: sortBy, grupo: grupo, modo: modo
  };
}
function aplicarFiltros(f){
  var q = document.getElementById('q');
  if(q){ q.value = f.q || ''; document.getElementById('searchw').classList.toggle('lleno', !!f.q); }
  fType = f.tipo || 'all'; fGen = f.genero || ''; fArt = f.artista || ''; fTag = f.etiqueta || '';
  fDec = f.decada || ''; fPais = f.pais || ''; fSello = f.sello || '';
  sortBy = f.orden || 'artist'; grupo = f.grupo || 'none'; modo = f.modo || 'grid';
  document.querySelectorAll('#segType button').forEach(function(b){ b.className = b.dataset.f === fType ? 'on' : ''; });
  document.querySelectorAll('#segMode button').forEach(function(b){ b.className = b.dataset.m === modo ? 'on' : ''; });
  var sg = document.getElementById('selGroup'); if(sg) sg.value = grupo;
  var so = document.getElementById('sortBy'); if(so) so.value = sortBy;
  setView('col');
  paintCol();
}
function hayFiltros(){
  var f = filtrosActuales();
  return !!(f.q || (f.tipo && f.tipo !== 'all') || f.genero || f.artista || f.etiqueta || f.decada || f.pais || f.sello);
}
function guardarListaActual(){
  var f = filtrosActuales();
  var sug = [f.genero, f.tipo !== 'all' ? f.tipo : '', f.decada, f.artista, f.q].filter(Boolean).join(' ');
  var nombre = prompt('Nombre para esta lista:', sug || 'Mi lista');
  if(!nombre) return;
  var l = listasGuardadas();
  l.push({nombre:nombre, f:f, id:uid()});
  guardarListas(l);
  paintCol();
  toast('Lista «' + nombre + '» guardada');
}
function pintarListas(){
  var caja = document.getElementById('listasBar');
  if(!caja) return;
  var l = listasGuardadas();
  if(!l.length && !hayFiltros()){ caja.innerHTML = ''; return; }
  caja.innerHTML = l.map(function(x){
    return '<button type="button" class="lista-chip" data-lid="' + x.id + '">' + esc(x.nombre)
      + '<span class="quitar" data-del="' + x.id + '">' + I.x + '</span></button>';
  }).join('')
    + (hayFiltros() ? '<button type="button" class="lista-chip nueva" id="guardarLista">' + I.plus + 'Guardar esta vista</button>' : '');
  caja.querySelectorAll('[data-lid]').forEach(function(b){
    b.onclick = function(e){
      if(e.target.closest('[data-del]')) return;
      var x = listasGuardadas().filter(function(y){ return y.id === b.dataset.lid; })[0];
      if(x) aplicarFiltros(x.f);
    };
  });
  caja.querySelectorAll('[data-del]').forEach(function(b){
    b.onclick = function(e){
      e.stopPropagation();
      guardarListas(listasGuardadas().filter(function(y){ return y.id !== b.dataset.del; }));
      paintCol();
    };
  });
  var g = caja.querySelector('#guardarLista');
  if(g) g.onclick = guardarListaActual;
}

/* ============================================================
   31. HOY ME APETECE
   ============================================================ */
function sugerenciasDelDia(candidatos, seed){
  var ds = (candidatos || coleccion()).slice();
  if(!ds.length) return [];
  var hoy = hoyISO();
  var semilla = 0;
  for(var i = 0; i < hoy.length; i++) semilla = (semilla * 31 + hoy.charCodeAt(i)) % 99991;
  if(seed !== undefined) semilla = seed;
  var out = [], usados = {};
  var mete = function(d, motivo){
    if(!d || usados[d.id] || out.length >= 4) return;
    usados[d.id] = 1;
    out.push({d:d, motivo:motivo});
  };
  var meses = function(iso){
    return Math.max(1, Math.round((Date.now() - new Date(iso + 'T12:00:00').getTime()) / 2592000000));
  };
  var nunca = ds.filter(function(d){ return totalEscuchas(d) === 0; });
  if(nunca.length){
    var n0 = rngShuffle(nunca, semilla)[0];
    mete(n0, n0['año']
      ? 'de ' + n0['año'] + ', nunca lo has puesto'
      : 'nunca lo has puesto');
  }
  var joyas = ds.filter(function(d){
    return d.valoracion >= 4 && d.ultimaEscucha
      && (Date.now() - new Date(d.ultimaEscucha + 'T12:00:00').getTime()) > 120 * 86400000;
  });
  if(joyas.length){
    var j = rngShuffle(joyas, semilla + 7)[0];
    mete(j, j.valoracion + ' estrellas, no lo pones desde hace ' + meses(j.ultimaEscucha)
      + (meses(j.ultimaEscucha) === 1 ? ' mes' : ' meses'));
  }
  var ultimo = ds.filter(function(d){ return d.ultimaEscucha; })
    .sort(function(a, b){ return String(b.ultimaEscucha).localeCompare(String(a.ultimaEscucha)); })[0];
  if(ultimo){
    var parecidos = ds.filter(function(d){
      return d.id !== ultimo.id && totalEscuchas(d) === 0
        && (d.sello && d.sello === ultimo.sello || d.genero === ultimo.genero);
    });
    if(parecidos.length){
      var pp = rngShuffle(parecidos, semilla + 13)[0];
      mete(pp, pp.sello && pp.sello === ultimo.sello
        ? 'de ' + pp.sello + ', como ' + ultimo.titulo
        : (pp.genero || 'parecido') + ', como lo último que pusiste');
    }
  }
  var viejos = ds.filter(function(d){ return parseInt(d['año']) && parseInt(d['año']) < 1990; });
  if(viejos.length){
    var v0 = rngShuffle(viejos, semilla + 29)[0];
    mete(v0, 'de ' + v0['año'] + ', ' + (new Date().getFullYear() - parseInt(v0['año'])) + ' años ya'
      + (v0.ultimaEscucha ? ' · último ' + fdate(v0.ultimaEscucha).split(',')[0] : ''));
  }
  /* Si la tirada aleatoria coincide con un disco ya elegido, mete() no hace
     nada y el bucle no avanzaría nunca con la misma semilla: se limita el
     número de intentos para que termine siempre, pase lo que pase. */
  var intentos = 0;
  while(out.length < 4 && ds.length && intentos < 60){
    mete(rngShuffle(ds, semilla + out.length * 17 + intentos)[0], 'al azar, por probar');
    intentos++;
  }
  return out;
}

function diasDesdeEscucha(d){
  if(!d || !d.ultimaEscucha) return Infinity;
  var t = new Date(d.ultimaEscucha + 'T12:00:00').getTime();
  return isFinite(t) ? Math.max(0, Math.floor((Date.now() - t) / 86400000)) : Infinity;
}
function itemExplorarHtml(x){
  var d = x.d;
  return '<div class="explore-row"><button type="button" class="explore-album" data-explore-disco="' + esc(d.id) + '">'
    + '<span class="ea-art">' + coverHtml(d) + '</span>'
    + '<span class="ea-copy"><span class="ea-title">' + esc(d.titulo || 'Sin título') + '</span>'
    + '<span class="ea-artist">' + esc(d.artista || 'Artista desconocido') + '</span>'
    + '<span class="ea-reason">' + esc(x.motivo || '') + '</span></span>'
    + '<span class="ea-arrow">›</span></button>'
    + (readOnly ? '' : '<button type="button" class="explore-listen' + (escuchadoHoy(d) ? ' on' : '')
      + '" data-explore-listen="' + esc(d.id) + '" aria-pressed="' + escuchadoHoy(d)
      + '" aria-label="' + esc((escuchadoHoy(d) ? 'Quitar escucha de hoy: ' : 'Marcar escuchado hoy: ') + d.titulo)
      + '">' + (escuchadoHoy(d) ? I.check : I.playF) + '</button>') + '</div>';
}
function seleccionExplorar(modo, semilla, formato){
  var ds = coleccion().filter(function(d){ return !formato || d.formato === formato; });
  var out = [];
  var seed = semilla || (parseInt(hoyISO().replace(/-/g,''), 10) || 1);

  if(modo === 'hoy'){
    var primeras = sugerenciasDelDia(ds, seed);
    var ids = new Set(primeras.map(function(x){ return x.d.id; }));
    return primeras.concat(rngShuffle(ds, seed).filter(function(d){ return !ids.has(d.id); })
      .map(function(d){ return {d:d, motivo:'De tu colección · por descubrir'}; }));
  }

  if(modo === 'joyas'){
    out = ds.filter(function(d){ return +d.valoracion >= 4; })
      .sort(function(a,b){
        var da = diasDesdeEscucha(a), db = diasDesdeEscucha(b);
        if(da !== db) return db - da;
        return totalEscuchas(a) - totalEscuchas(b);
      }).map(function(d){
        var dias = diasDesdeEscucha(d);
        var motivo = !isFinite(dias)
          ? (+d.valoracion) + ' estrellas · aún no lo has marcado como escuchado'
          : (+d.valoracion) + ' estrellas · hace ' + dias + (dias === 1 ? ' día' : ' días');
        return {d:d, motivo:motivo};
      });
  }else if(modo === 'nunca'){
    out = ds.filter(function(d){ return totalEscuchas(d) === 0; })
      .sort(function(a,b){ return String(a.fechaAlta || '').localeCompare(String(b.fechaAlta || '')); })
      .map(function(d){
        return {d:d, motivo:d['año'] ? 'De ' + d['año'] + ' · todavía sin escucha' : 'Todavía sin escucha'};
      });
  }else if(modo === 'parecidos'){
    var ultimo = coleccion().filter(function(d){ return d.ultimaEscucha; })
      .sort(function(a,b){ return String(b.ultimaEscucha).localeCompare(String(a.ultimaEscucha)); })[0];
    if(!ultimo) return [];
    out = ds.filter(function(d){ return d.id !== ultimo.id; }).map(function(d){
      var puntos = 0, razones = [];
      if(ultimo.genero && d.genero === ultimo.genero){ puntos += 3; razones.push(d.genero); }
      if(ultimo.sello && d.sello === ultimo.sello){ puntos += 2; razones.push('mismo sello'); }
      if(ultimo.formato && d.formato === ultimo.formato) puntos += .25;
      puntos -= Math.min(2, totalEscuchas(d) * .08);
      return {d:d, puntos:puntos, razones:razones};
    }).filter(function(x){ return x.puntos > 0; })
      .sort(function(a,b){ return b.puntos - a.puntos || totalEscuchas(a.d) - totalEscuchas(b.d); })
      .map(function(x){
        return {d:x.d, motivo:(x.razones.length ? x.razones.join(' · ') : 'afinidad')
          + ' · relacionado con ' + ultimo.titulo};
      });
  }else if(modo === 'decadas'){
    var grupos = {};
    ds.forEach(function(d){
      var y = parseInt(d['año']);
      if(!y) return;
      var dec = Math.floor(y / 10) * 10;
      (grupos[dec] = grupos[dec] || []).push(d);
    });
    var decadas = Object.keys(grupos).sort(function(a,b){ return +b - +a; });
    decadas.forEach(function(dec, idx){ grupos[dec] = rngShuffle(grupos[dec], seed + idx * 37); });
    /* Una vuelta por décadas antes de repetir década: todas las fichas son accesibles. */
    for(var vuelta = 0; vuelta < ds.length; vuelta++){
      decadas.forEach(function(dec){
        var d = grupos[dec][vuelta];
        if(d) out.push({d:d, motivo:'Una parada en los ' + dec + ' · ' + d['año']});
      });
    }
  }
  return out;
}
/* Recorre candidatos sin repetir hasta agotar la tanda. No escribe en la colección. */
function tandaExplorar(candidatos, vistos, limite){
  var unicos = [], ids = new Set();
  candidatos.forEach(function(x){
    if(x.d && !ids.has(x.d.id)){ ids.add(x.d.id); unicos.push(x); }
  });
  var pendientes = unicos.filter(function(x){ return vistos.indexOf(x.d.id) < 0; });
  var reinicio = !pendientes.length && unicos.length > 0;
  if(reinicio) pendientes = unicos;
  var items = pendientes.slice(0, limite || 6);
  return {items:items, total:unicos.length, reinicio:reinicio,
    vistos:(reinicio ? [] : vistos).concat(items.map(function(x){ return x.d.id; })),
    restantes:Math.max(0, pendientes.length - items.length)};
}
function explorarColeccion(){
  var modos = [
    ['hoy','Para hoy'], ['joyas','Joyas olvidadas'], ['nunca','Sin escuchar'],
    ['parecidos','Parecido a lo último'], ['decadas','Viaje por décadas']
  ];
  var body = '<p class="explore-intro">Redescubre tus discos, a tu ritmo. Las propuestas se calculan en tu dispositivo.</p>'
    + '<div class="explore-modes" role="group" aria-label="Forma de explorar">' + modos.map(function(m){
      return '<button type="button" aria-pressed="' + (m[0] === 'hoy') + '" class="' + (m[0] === 'hoy' ? 'on' : '')
        + '" data-explore-mode="' + m[0] + '">' + m[1] + '</button>';
    }).join('') + '</div><div class="explore-formats" role="group" aria-label="Formato">'
    + [['','Todos'],['Vinilo','Vinilo'],['CD','CD']].map(function(f){
      return '<button type="button" class="btn sm' + (!f[0] ? ' on' : '') + '" data-explore-format="' + f[0]
        + '" aria-pressed="' + !f[0] + '">' + f[1] + '</button>';
    }).join('') + '</div><p id="exploreStatus" class="explore-status" role="status" aria-live="polite"></p>'
    + '<div id="exploreResults"></div><button type="button" class="btn sm" id="exploreOtra">' + I.refresh + 'Ver más</button>';
  var sh = sheet('Explorar la colección', body, null, true);
  var actual = 'hoy', formato = '', vistos = [], seed = parseInt(hoyISO().replace(/-/g,''),10) || 1;
  var mensajes = {
    hoy:'No hay discos de este formato en tu colección.',
    joyas:'Aquí aparecen los discos con cuatro o cinco estrellas que llevan más tiempo sin sonar.',
    nunca:'No quedan discos sin escuchar con este formato.',
    parecidos:'Necesitas una escucha previa y discos afines por género, sello o formato.',
    decadas:'Añade el año a las fichas para recorrer tu colección por décadas.'
  };
  var pintar = function(animar){
    var r = tandaExplorar(seleccionExplorar(actual, seed, formato), vistos, 6);
    vistos = r.vistos;
    var caja = sh.querySelector('#exploreResults');
    sh.querySelector('#exploreStatus').textContent = r.total
      ? (r.reinicio ? 'Volvemos al principio · ' : '') + r.items.length + ' de ' + r.total + ' propuestas · '
        + (r.restantes ? r.restantes + ' por descubrir' : 'Has visto todas las propuestas') : '';
    caja.innerHTML = r.items.length ? '<div class="explore-list">' + r.items.map(itemExplorarHtml).join('') + '</div>'
      : '<div class="tl-empty">' + mensajes[actual] + (formato ? ' Prueba también con Todos.' : '') + '</div>';
    var siguiente = sh.querySelector('#exploreOtra');
    siguiente.hidden = r.total <= 6;
    siguiente.textContent = r.restantes ? 'Ver más' : 'Volver al principio';
    caja.querySelectorAll('[data-explore-disco]').forEach(function(el){
      el.onclick = function(){ sh.querySelector('[data-close]').click(); openDetail(el.dataset.exploreDisco); };
    });
    caja.querySelectorAll('[data-explore-listen]').forEach(function(el){
      el.onclick = function(){
        if(readOnly) return;
        var d = coleccion().filter(function(d){ return d.id === el.dataset.exploreListen; })[0];
        if(!d) return;
        var puesto = marcarEscucha(d.id);
        el.classList.toggle('on', puesto);
        el.setAttribute('aria-pressed', String(puesto));
        el.setAttribute('aria-label', (puesto ? 'Quitar escucha de hoy: ' : 'Marcar escuchado hoy: ') + d.titulo);
        el.innerHTML = puesto ? I.check : I.playF;
        microFeedback(el);
        /* Se mantiene la fila para poder deshacer; la siguiente tanda recalcula candidatos. */
        paintCol();
      };
    });
    if(animar) microFeedback(caja, 'reveal');
  };
  sh.querySelectorAll('[data-explore-mode]').forEach(function(b){
    b.onclick = function(){
      actual = b.dataset.exploreMode; vistos = [];
      sh.querySelectorAll('[data-explore-mode]').forEach(function(x){
        x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b));
      });
      pintar(true);
    };
  });
  sh.querySelectorAll('[data-explore-format]').forEach(function(b){
    b.onclick = function(){
      formato = b.dataset.exploreFormat; vistos = [];
      sh.querySelectorAll('[data-explore-format]').forEach(function(x){
        x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b));
      });
      pintar(true);
    };
  });
  sh.querySelector('#exploreOtra').onclick = function(){ pintar(true); };
  pintar(false);
}

function pintarSugerencias(){
  var caja = document.getElementById('sugerencias');
  if(!caja) return;
  if(readOnly || document.getElementById('q').value || hayFiltros()){ caja.innerHTML = ''; return; }
  var sug = sugerenciasDelDia();
  if(sug.length < 3){ caja.innerHTML = ''; return; }
  caja.innerHTML = '<div class="sughd"><h4>' + I.bombilla + 'Hoy me apetece…</h4>'
    + '<button type="button" class="btn xs" id="sugOtro" data-tip="Otras tres">' + I.refresh + '</button></div>'
    + '<div class="sugs">' + sug.map(function(x){
        var hoy = escuchadoHoy(x.d);
        return '<div class="sug" data-id="' + x.d.id + '">'
          + '<div class="suga">' + coverHtml(x.d) + '</div>'
          + '<div class="sugi"><div class="sugt">' + esc(x.d.titulo) + '</div>'
          + '<div class="suga2">' + esc(x.d.artista) + '</div>'
          + '<div class="sugm">' + esc(x.motivo) + '</div></div>'
          + '<button type="button" class="sugplay' + (hoy ? ' on' : '') + '" data-oir="' + x.d.id
          + '" aria-pressed="' + hoy + '" data-tip="' + (hoy ? 'Quitar escucha de hoy' : 'Lo estoy escuchando') + '">'
          + (hoy ? I.check : I.playF) + '</button></div>';
      }).join('') + '</div>';
  caja.querySelectorAll('.sug').forEach(function(el){
    el.onclick = function(e){
      if(e.target.closest('[data-oir]')) return;
      openDetail(el.dataset.id, el.querySelector('.suga'));
    };
  });
  caja.querySelectorAll('[data-oir]').forEach(function(b){
    b.onclick = function(e){
      e.stopPropagation();
      var puesto = marcarEscucha(b.dataset.oir);
      b.className = 'sugplay' + (puesto ? ' on' : '');
      b.innerHTML = puesto ? I.check : I.playF;
      b.dataset.tip = puesto ? 'Quitar escucha de hoy' : 'Lo estoy escuchando';
      b.setAttribute('aria-pressed', String(puesto));
      microFeedback(b);
      refrescarContadores();
    };
  });
  caja.querySelector('#sugOtro').onclick = function(){
    var s2 = rngShuffle(coleccion().filter(function(d){ return d.portada; }), Date.now() % 9973).slice(0, 4);
    caja.querySelector('.sugs').innerHTML = s2.map(function(d){
      return '<div class="sug" data-id="' + d.id + '"><div class="suga">' + coverHtml(d) + '</div>'
        + '<div class="sugi"><div class="sugt">' + esc(d.titulo) + '</div>'
        + '<div class="suga2">' + esc(d.artista) + '</div>'
        + '<div class="sugm">otra opción</div></div></div>';
    }).join('');
    caja.querySelectorAll('.sug').forEach(function(el){
      el.onclick = function(){ openDetail(el.dataset.id, el.querySelector('.suga')); };
    });
  };
  montarAyudas(caja);
}

/* ============================================================
   32. TU FIRMA SONORA
   ============================================================ */
function firmaSonora(){
  var ds = coleccion();
  if(ds.length < 10) return '';
  var top = function(fn){
    var m = {};
    ds.forEach(function(d){ var k = fn(d); if(k) m[k] = (m[k] || 0) + 1; });
    var l = Object.keys(m).sort(function(a, b){ return m[b] - m[a]; });
    return l.length ? {k:l[0], v:m[l[0]], pct:Math.round(m[l[0]] / ds.length * 100)} : null;
  };
  var gen = top(function(d){ return d.genero; });
  var dec = top(function(d){ var y = parseInt(d['año']); return y ? Math.floor(y / 10) * 10 + 's' : ''; });
  var nv = ds.filter(function(d){ return d.formato === 'Vinilo'; }).length;
  var sop = nv > ds.length / 2 ? 'vinilo' : 'CD';
  var pais = top(function(d){ return d.pais; });
  if(!gen || !dec) return '';
  var añoDec = parseInt(dec.k);
  var nombreDec = añoDec >= 2000 ? dec.k.replace('s', '') : ('los ' + String(añoDec).slice(2) + (añoDec === 2000 ? '' : ''));
  if(añoDec < 2000) nombreDec = 'los ' + String(añoDec).slice(2);
  else nombreDec = 'los ' + añoDec;
  return '<div class="firma"><div class="fk">Tu firma sonora</div>'
    + '<div class="fv">' + esc(gen.k) + ' de <b>' + nombreDec + '</b>, en ' + sop + '</div>'
    + '<div class="fs">' + gen.pct + '% de tu colección es ' + esc(gen.k).toLowerCase()
    + ' · ' + dec.pct + '% son discos de ' + nombreDec
    + (pais && PAISES[pais.k] ? ' · la mayoría prensados en ' + nombrePais(pais.k) : '') + '</div>'
    + '<button type="button" class="btn xs" id="verAdn" style="margin-top:10px">Ver el perfil completo</button></div>';
}

/* ============================================================
   33. TARJETAS NUEVAS DE ESTADÍSTICAS
   ============================================================ */
/* La paleta de colores de tus portadas, ordenada por tono */
function tarjetaPaleta(){
  var con = coleccion().filter(function(d){ return d.color; });
  if(con.length < 12) return '';
  var tono = function(rgb){
    var p = String(rgb).split(',').map(Number);
    var r = p[0] / 255, g = p[1] / 255, b = p[2] / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), dl = mx - mn, hh = 0;
    if(dl){
      if(mx === r) hh = ((g - b) / dl) % 6;
      else if(mx === g) hh = (b - r) / dl + 2;
      else hh = (r - g) / dl + 4;
    }
    hh = hh * 60;
    if(hh < 0) hh += 360;
    return {h: dl < 0.08 ? 400 + mx * 50 : hh, s: dl, l: (mx + mn) / 2};
  };
  var orden = con.slice().sort(function(a, b){
    var ta = tono(a.color), tb = tono(b.color);
    return (ta.h - tb.h) || (tb.l - ta.l);
  });
  return '<div class="card full"><h3>La paleta de tu colección</h3>'
    + '<div class="sub">Los ' + orden.length + ' colores dominantes de tus portadas, ordenados por tono</div>'
    + '<div class="paletagrid">' + orden.map(function(d){
        return '<i data-disco="' + d.id + '" style="background:rgb(' + colorSeguro(d.color) + ')" title="'
          + esc(d.titulo + ' · ' + d.artista) + '"></i>';
      }).join('') + '</div></div>';
}
/* Cuánto duraban los discos según la época */
function tarjetaDuraciones(){
  var por = {};
  coleccion().forEach(function(d){
    var y = parseInt(d['año']);
    if(!y || !d.tracklist.length) return;
    var seg = 0, n = 0;
    d.tracklist.forEach(function(t){
      var m = String(t.duracion || '').match(/^(\d+):(\d{2})$/);
      if(m){ seg += (+m[1]) * 60 + (+m[2]); n++; }
    });
    if(n < 4) return;
    var dec = Math.floor(y / 10) * 10;
    (por[dec] = por[dec] || []).push(seg / 60);
  });
  var claves = Object.keys(por).filter(function(k){ return por[k].length >= 3; }).sort();
  if(claves.length < 3) return '';
  var datos = claves.map(function(k){
    var l = por[k];
    return {k: String(k).slice(2) + 's', v: Math.round(l.reduce(function(a, b){ return a + b; }, 0) / l.length)};
  });
  var maxV = Math.max.apply(null, datos.map(function(x){ return x.v; }));
  var minV = Math.min.apply(null, datos.map(function(x){ return x.v; }));
  var quien = datos.filter(function(x){ return x.v === maxV; })[0];
  return '<div class="card full"><h3>Cuánto duraban los discos</h3>'
    + '<div class="sub">Duración media por década · el máximo son los ' + quien.k
    + ' con ' + maxV + ' minutos, ' + (maxV - minV) + ' más que la década más corta</div>'
    + '<div class="chartwrap">' + columns(datos, 'var(--teal)') + '</div></div>';
}
/* Cuántos artistas son de paso y cuántos coleccionas */
function tarjetaArtistas(){
  var m = {};
  coleccion().forEach(function(d){ if(d.artista) m[plain(d.artista)] = (m[plain(d.artista)] || 0) + 1; });
  var vals = Object.keys(m).map(function(k){ return m[k]; });
  if(vals.length < 10) return '';
  var uno = vals.filter(function(v){ return v === 1; }).length;
  var dos = vals.filter(function(v){ return v === 2; }).length;
  var tres = vals.filter(function(v){ return v >= 3 && v <= 4; }).length;
  var muchos = vals.filter(function(v){ return v >= 5; }).length;
  return '<div class="card"><h3>Cómo coleccionas</h3>'
    + '<div class="sub">' + Math.round(uno / vals.length * 100) + '% de tus artistas aparecen una sola vez</div>'
    + hbars([
        {k:'Un disco', v:uno}, {k:'Dos discos', v:dos},
        {k:'Tres o cuatro', v:tres}, {k:'Cinco o más', v:muchos}
      ].filter(function(x){ return x.v; }), function(i){
        return ['var(--txt3)', 'var(--teal)', 'var(--blue)', 'var(--purple)'][i];
      }) + '</div>';
}
/* Lo de casa y lo de fuera */
function tarjetaNacional(){
  var ds = coleccion().filter(function(d){ return d.genero; });
  if(ds.length < 12) return '';
  var nac = ds.filter(function(d){ return /nacional/i.test(d.genero); }).length;
  var inter = ds.filter(function(d){ return /internacional/i.test(d.genero); }).length;
  if(!nac || !inter) return '';
  var porDec = {};
  ds.forEach(function(d){
    var y = parseInt(d['año']);
    if(!y) return;
    var dec = Math.floor(y / 10) * 10;
    porDec[dec] = porDec[dec] || {n:0, i:0};
    if(/nacional/i.test(d.genero)) porDec[dec].n++;
    else if(/internacional/i.test(d.genero)) porDec[dec].i++;
  });
  var claves = Object.keys(porDec).sort().filter(function(k){ return porDec[k].n + porDec[k].i >= 4; });
  var barras = claves.map(function(k){
    var t = porDec[k].n + porDec[k].i;
    return '<div class="nacfila"><span class="nk">' + String(k).slice(2) + 's</span>'
      + '<span class="nb"><i style="width:' + (porDec[k].n / t * 100).toFixed(0) + '%"></i></span>'
      + '<span class="nv">' + Math.round(porDec[k].n / t * 100) + '%</span></div>';
  }).join('');
  return '<div class="card"><h3>De casa y de fuera</h3>'
    + '<div class="sub">' + Math.round(nac / (nac + inter) * 100) + '% de tu colección es música nacional</div>'
    + (barras ? '<div class="nacgrid">' + barras + '</div>' : '')
    + '</div>';
}

/* Huecos por sello y década, mirando solo tu propia colección: entre el año
   más antiguo y el más nuevo que tienes de cada sello, qué décadas están
   vacías. No compara con lo que tengan otros coleccionistas, solo con tu
   propia línea de tiempo. */
function huecosPorSello(){
  var ds = coleccion().filter(function(d){ return d.sello && parseInt(d['año']); });
  var por = {};
  ds.forEach(function(d){ (por[d.sello] = por[d.sello] || []).push(parseInt(d['año'])); });
  var out = [];
  Object.keys(por).forEach(function(sello){
    var años = por[sello];
    if(años.length < 3) return;
    var min = Math.min.apply(null, años), max = Math.max.apply(null, años);
    var decMin = Math.floor(min / 10) * 10, decMax = Math.floor(max / 10) * 10;
    if(decMax === decMin) return;
    var tienes = {};
    años.forEach(function(a){ tienes[Math.floor(a / 10) * 10] = true; });
    var huecos = [];
    for(var dd = decMin; dd <= decMax; dd += 10) if(!tienes[dd]) huecos.push(dd);
    if(huecos.length) out.push({sello:sello, n:años.length, desde:decMin, hasta:decMax, huecos:huecos});
  });
  return out.sort(function(a, b){ return b.huecos.length - a.huecos.length; });
}
function tarjetaHuecosSello(){
  var lista = huecosPorSello();
  if(!lista.length) return '';
  return '<div class="card"><h3>Huecos por sello</h3>'
    + '<div class="sub">Décadas sin discos entre lo más antiguo y lo más nuevo que tienes de cada sello</div>'
    + '<div class="tl">' + lista.slice(0, 8).map(function(x){
        return '<div class="trk"><span class="nm">' + esc(x.sello)
          + '<span style="color:var(--txt3)"> · ' + x.n + ' discos</span></span>'
          + '<span class="dur">' + x.huecos.map(function(h){ return String(h).slice(2) + 's'; }).join(', ') + '</span></div>';
      }).join('') + '</div></div>';
}


