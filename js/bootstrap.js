/* CSP sin scripts inline: acciones de imagen limitadas a esta lista. */
document.addEventListener('error', function(e){
  var img = e.target;
  if(!img || img.tagName !== 'IMG') return;
  if(img.dataset.imgRetry){ window.reintentarImg(img, img.dataset.imgRetry); return; }
  var accion = img.dataset.imgError;
  if(accion === 'remove') img.remove();
  else if(accion === 'dim') img.style.opacity = '.15';
  else if(accion === 'hide') img.style.visibility = 'hidden';
  else if(accion === 'fail' && img.parentNode) img.parentNode.classList.add('falla');
}, true);
/* ============================================================
   14. EVENTOS
   ============================================================ */
function montarEventos(){
  var byId = function(id){ return document.getElementById(id); };
  aplicarTema();
  if(window.matchMedia){
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if(mq.addEventListener) mq.addEventListener('change', function(){ if(temaActual() === 'auto') aplicarTema('auto'); });
  }
  montarAyudas(document);
  byId('btnAdd').onclick = function(){ openForm(null); };
  byId('btnAddMob').onclick = function(){ openForm(null); };
  byId('qClear').onclick = function(){
    byId('q').value = '';
    byId('searchw').classList.remove('lleno');
    paintCol();
  };
  byId('btnPal').onclick = abrirPaleta;
  byId('btnDice').onclick = discoAlAzar;
  byId('btnSel').onclick = function(){ modoSeleccion(!selMulti); };
  byId('btnScan').onclick = function(){ escanear(); };
  byId('fabTienda').onclick = modoTienda;
  byId('logo').onclick = function(){ setView('col'); };
  byId('syncBadge').onclick = function(){ configurado() ? sincronizarAhora() : pantallaSync(); };
  byId('q').oninput = function(){
    byId('searchw').classList.toggle('lleno', !!byId('q').value);
    paintCol();
  };
  byId('sortBy').onchange = function(e){
    sortBy = e.target.value;
    if(sortBy === 'random') randomSeed = Date.now() % 99991;
    paintCol();
  };
  byId('selGroup').onchange = function(e){ grupo = e.target.value; paintCol(); };
  byId('fGenre').onchange = function(e){ fGen = e.target.value; paintCol(); };
  byId('segType').onclick = function(e){
    var b = e.target.closest('button'); if(!b) return;
    document.querySelectorAll('#segType button').forEach(function(x){ x.className = ''; });
    b.className = 'on'; fType = b.dataset.f; paintCol();
  };
  byId('segMode').onclick = function(e){
    var b = e.target.closest('button'); if(!b) return;
    document.querySelectorAll('#segMode button').forEach(function(x){ x.className = ''; });
    b.className = 'on'; modo = b.dataset.m; paintCol();
  };
  var tabClick = function(e){
    var b = e.target.closest('button[data-v]');
    if(b) setView(b.dataset.v);
  };
  byId('tabs').onclick = tabClick;
  byId('tabbar').onclick = tabClick;
  byId('fileCsv').onchange = function(e){ var f = e.target.files[0]; if(f) importCsv(f); e.target.value = ''; };
  byId('fileBak').onchange = function(e){ var f = e.target.files[0]; if(f) importBackup(f); e.target.value = ''; };

  var nav = byId('nav'), ultimoY = 0;
  window.addEventListener('scroll', function(){
    var y = window.scrollY || 0;
    if((y > 40) !== (ultimoY > 40)) nav.classList.toggle('shrink', y > 40);
    ultimoY = y;
  }, {passive:true});

  (function(){
    var ptr = byId('ptr'), y0 = null, dy = 0, tirando = false;
    document.addEventListener('touchstart', function(e){
      if(window.scrollY > 0 || document.querySelector('.scrim,.pal')) return;
      y0 = e.touches[0].clientY; dy = 0; tirando = true;
    }, {passive:true});
    document.addEventListener('touchmove', function(e){
      if(!tirando || y0 === null) return;
      dy = e.touches[0].clientY - y0;
      if(dy <= 0){ ptr.style.opacity = 0; return; }
      var p = Math.min(1, dy / 90);
      ptr.style.opacity = p;
      ptr.style.transform = 'translateX(-50%) scale(' + (.5 + p * .5) + ') rotate(' + (dy * 2.2) + 'deg)';
    }, {passive:true});
    document.addEventListener('touchend', function(){
      if(!tirando) return;
      tirando = false;
      if(dy > 85){
        ptr.classList.add('girando');
        ptr.style.opacity = 1;
        ptr.style.transform = 'translateX(-50%) scale(1)';
        var fin = function(){
          ptr.classList.remove('girando');
          ptr.style.opacity = 0;
          ptr.style.transform = 'translateX(-50%) scale(.5)';
        };
        if(configurado()) pull().then(fin, fin);
        else setTimeout(function(){ renderAll(); fin(); }, 450);
      }else{
        ptr.style.opacity = 0;
        ptr.style.transform = 'translateX(-50%) scale(.5)';
      }
      y0 = null; dy = 0;
    });
  })();

  document.addEventListener('visibilitychange', function(){
    if(!document.hidden && configurado() && Date.now() - ultimoPull > 20000) pull(true);
  });
  window.addEventListener('online', function(){ if(configurado()) sincronizarAhora(); });
  window.addEventListener('offline', function(){ marcar('off'); });
  window.addEventListener('beforeunload', function(e){
    if(syncState === 'pend' && configurado()){ e.preventDefault(); e.returnValue = ''; }
  });
  setInterval(function(){
    if(configurado() && !document.hidden && Date.now() - ultimoPull > 300000) pull(true);
  }, 60000);

  document.addEventListener('keydown', function(e){
    var enCampo = /input|textarea|select/i.test((e.target.tagName || ''));
    if((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')){ e.preventDefault(); sincronizarAhora(); return; }
    if((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')){ e.preventDefault(); abrirPaleta(); return; }
    if(enCampo || document.querySelector('.scrim') || document.querySelector('.pal')) return;
    if(e.key === '/'){ e.preventDefault(); document.getElementById('q').focus(); }
    else if(e.key === 'n'){ e.preventDefault(); openForm(null); }
    else if(e.key === 'r'){ e.preventDefault(); discoAlAzar(); }
    else if(e.key === '1'){ setView('col'); }
    else if(e.key === '2'){ setView('wish'); }
    else if(e.key === '3'){ setView('stats'); }
    else if(e.key === '4'){ setView('db'); }
    else if(e.key === 't'){ e.preventDefault(); modoTienda(); }
  });
  document.body.addEventListener('dragover', function(e){ e.preventDefault(); });
  document.body.addEventListener('drop', function(e){
    e.preventDefault();
    var f = e.dataTransfer.files[0];
    if(!f) return;
    if(/\.csv$/i.test(f.name)) importCsv(f);
    else if(/\.json$/i.test(f.name)) importBackup(f);
  });
  if('serviceWorker' in navigator && location.protocol.indexOf('http') === 0){
    var avisoMostrado = false;
    /* Motivo (en texto humano) por el que AHORA MISMO no es seguro recargar,
       o '' si ya se puede. Único punto de verdad: puedeRecargarYa() depende
       de que esto devuelva ''. */
    var motivoBloqueoActualizacion = function(){
      if(document.querySelector('.scrim')) return 'Hay una ventana abierta';
      if(document.querySelector('.tienda')) return 'Cierra el modo tienda';
      if(document.querySelector('.lightbox')) return 'Cierra la imagen abierta';
      if(document.querySelector('.pal')) return 'Cierra la búsqueda';
      if(pushPromiseActual || pullPromiseActual) return 'Sincronizando datos';
      if(saveTimer) return 'Hay un guardado pendiente';
      if(syncState === 'pend') return 'Hay cambios pendientes de subir';
      return '';
    };
    var puedeRecargarYa = function(){ return motivoBloqueoActualizacion() === ''; };

    var avisarVersionNueva = function(reg, sw){
      if(avisoMostrado) return;
      avisoMostrado = true;
      var b = document.createElement('div');
      b.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;'
        + 'background:#1c1c1e;color:#fff;border-radius:12px;padding:12px 14px;'
        + 'display:flex;flex-direction:column;gap:8px;box-shadow:0 4px 18px rgba(0,0,0,.35);'
        + 'font:14px/1.3 -apple-system,system-ui,sans-serif';
      b.innerHTML = '<div style="display:flex;align-items:center;gap:12px">'
        + '<span style="flex:1" data-txt>Hay una versión nueva de la app</span>'
        + '<button type="button" data-btn style="background:#0a84ff;color:#fff;border:0;border-radius:8px;'
        + 'padding:8px 14px;font:600 14px -apple-system,system-ui,sans-serif">Actualizar</button>'
        + '</div><div data-motivo style="display:none;color:#c7c7cc;font-size:12.5px"></div>';
      document.body.appendChild(b);
      var txt = b.querySelector('[data-txt]');
      var btn = b.querySelector('[data-btn]');
      var motivoEl = b.querySelector('[data-motivo]');

      var recargado = false, procesando = false;
      var esperaTimer = null, fallbackTimer = null;
      var esperaInicio = 0;
      var ESPERA_MAX_MS = 25000, ESPERA_PASO_MS = 1000, FALLBACK_MS = 9000;

      var mostrarMotivo = function(m){
        if(m){ motivoEl.style.display = 'block'; motivoEl.textContent = m; }
        else { motivoEl.style.display = 'none'; motivoEl.textContent = ''; }
      };

      /* Único finalizador, idempotente: lo puede disparar tanto el evento
         'controllerchange' del navegador como el 'statechange' del propio
         worker nuevo llegando a 'activated' -cualquiera de los dos que
         llegue primero recarga; el otro, si llega después, no hace nada. */
      var finalizarActualizacion = function(){
        if(recargado) return;
        recargado = true;
        if(fallbackTimer){ clearTimeout(fallbackTimer); fallbackTimer = null; }
        /* Con el worker nuevo ya como controlador, navegamos explícitamente
           a index.html con una marca anti-cache de la navegación. El SW
           seguirá sirviendo SU index.html precacheado, pero evitamos que
           Safari/PWA reutilice además una entrada de su caché de navegación. */
        setTimeout(function(){
          var base = new URL('./index.html', location.href);
          base.searchParams.set('app-update', Date.now());
          location.replace(base.href);
        }, 120);
      };
      navigator.serviceWorker.addEventListener('controllerchange', finalizarActualizacion);
      sw.addEventListener('statechange', function(){
        if(sw.state === 'activated') finalizarActualizacion();
      });

      var volverAReintentar = function(motivo){
        procesando = false;
        if(esperaTimer){ clearTimeout(esperaTimer); esperaTimer = null; }
        if(fallbackTimer){ clearTimeout(fallbackTimer); fallbackTimer = null; }
        btn.disabled = false;
        btn.textContent = 'Reintentar';
        txt.textContent = 'Hay una versión nueva de la app';
        mostrarMotivo(motivo || '');
      };

      /* Tras enviar 'saltar' la actualización queda COMPROMETIDA: si el
         worker llega a 'activated' se recarga siempre, aunque syncState
         cambie después. El único fallback posible aquí es que ni
         controllerchange ni statechange lleguen a tiempo. */
      var enviarSaltarYComprometer = function(){
        txt.textContent = 'Actualizando…';
        mostrarMotivo('');
        sw.postMessage('saltar');
        fallbackTimer = setTimeout(function(){
          if(recargado) return;
          /* Identidad real del worker NUEVO, nunca su scriptURL: el viejo y el
             nuevo comparten la misma URL (ambos son '/sw.js'), así que
             comparar controller.scriptURL === sw.scriptURL daría un falso
             positivo con el controller VIEJO todavía puesto. Solo cuentan el
             estado del propio objeto sw, o que sea exactamente esta instancia
             (===) la que reg.active referencia. */
          if(sw.state === 'activated' || (reg.active && reg.active === sw)){
            finalizarActualizacion();
            return;
          }
          volverAReintentar('No se pudo completar la actualización');
        }, FALLBACK_MS);
      };

      var intentarDesbloquear = function(motivo){
        /* Si lo único que bloquea es tener cambios locales sin subir y hay
           configuración válida de GitHub, se intenta terminar el guardado
           de verdad (reutilizando la cola global existente) en vez de
           esperar pasivamente a que el usuario lo haga por su cuenta. */
        if(motivo === 'Hay cambios pendientes de subir' && configurado()){
          return push().then(function(ok){
            if(!ok) throw new Error('push-fallo');
          });
        }
        return Promise.resolve();
      };

      var paso = function(){
        if(!procesando) return;
        var motivo = motivoBloqueoActualizacion();
        if(motivo === ''){
          enviarSaltarYComprometer();
          return;
        }
        if(Date.now() - esperaInicio >= ESPERA_MAX_MS){
          volverAReintentar(motivo === 'Hay cambios pendientes de subir'
            ? 'No se puede actualizar porque hay cambios sin sincronizar'
            : motivo);
          return;
        }
        txt.textContent = 'Esperando…';
        mostrarMotivo(motivo);
        if(motivo === 'Hay cambios pendientes de subir' && configurado()){
          intentarDesbloquear(motivo).then(function(){
            if(!procesando) return;
            esperaTimer = setTimeout(paso, ESPERA_PASO_MS);
          }).catch(function(){
            volverAReintentar('No se puede actualizar porque hay cambios sin sincronizar');
          });
          return;
        }
        esperaTimer = setTimeout(paso, ESPERA_PASO_MS);
      };

      btn.addEventListener('click', function(){
        if(procesando || btn.disabled) return; /* evita doble clic / doble proceso */
        procesando = true;
        btn.disabled = true;
        esperaInicio = Date.now();
        txt.textContent = 'Preparando…';
        mostrarMotivo('');
        paso();
      });
    };

    navigator.serviceWorker.register('sw.js').then(function(reg){
      if(reg.waiting && navigator.serviceWorker.controller) avisarVersionNueva(reg, reg.waiting);
      reg.addEventListener('updatefound', function(){
        var nuevo = reg.installing;
        if(!nuevo) return;
        nuevo.addEventListener('statechange', function(){
          if(nuevo.state === 'installed' && navigator.serviceWorker.controller) avisarVersionNueva(reg, nuevo);
        });
      });
      setInterval(function(){ reg.update().catch(function(){}); }, 900000);
    }).catch(function(){});
  }
}

boot();


