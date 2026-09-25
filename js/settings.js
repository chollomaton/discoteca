/* ============================================================
   13. ARCHIVO Y SINCRONIZACIÓN
   ============================================================ */
function paintDb(){
  var box = document.getElementById('dbBody');
  if(!box) return;
  var estados = {
    local:['Sin conectar', 'var(--orange)'], ok:['Al día', 'var(--green)'],
    pend:['Cambios sin subir', 'var(--orange)'], busy:['Sincronizando', 'var(--blue)'],
    err:['Error', 'var(--red)'], off:['Sin conexión', 'var(--txt3)']
  };
  var est = estados[syncState] || estados.local;
  var pesoDatos = new Blob([JSON.stringify(DB.discos)]).size;
  var instalada = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  var ultCopia = '';
  try{ ultCopia = localStorage.getItem('discoteca.ultimaCopia') || ''; }catch(e){}
  var diasCopia = ultCopia ? Math.floor((Date.now() - new Date(ultCopia).getTime()) / 86400000) : null;
  var tema = temaActual();

  var seccion = function(icono, titulo, sub){
    return '<div class="secc"><div class="si">' + icono + '</div><div><h3>' + titulo + '</h3>'
      + (sub ? '<div class="ss">' + sub + '</div>' : '') + '</div></div>';
  };

  box.innerHTML =
    /* ---- estado ---- */
    '<div class="estado ' + syncState + '">'
      + '<div class="ehd"><div class="epunto"></div><div class="etxt">'
      + '<div class="et">' + est[0] + '</div>'
      + '<div class="es">' + (configurado()
          ? esc(CFG.owner + '/' + CFG.repo) + ' › ' + esc(CFG.path)
          : 'La colección solo está en este dispositivo, en modo consulta') + '</div>'
      + '</div>' + (configurado()
          ? '<button type="button" class="btn sm" data-a="sync">' + I.refresh + 'Sincronizar</button>'
          : '<button type="button" class="btn pri sm" data-a="cfg">Conectar</button>') + '</div>'
      + '<div class="efilas">'
        + '<div><span>Discos</span><b>' + DB.discos.length + '</b></div>'
        + '<div><span>Última sincronía</span><b>' + (lastSync ? fdate(lastSync) : '—') + '</b></div>'
        + '<div><span>Último cambio</span><b>' + fdate(DB.actualizado) + '</b></div>'
        + '<div><span>Tamaño</span><b>' + bytes(pesoDatos) + '</b></div>'
      + '</div>'
      + (syncMsg ? '<div class="emsg">' + esc(syncMsg) + '</div>' : '')
      + (configurado() ? '<div class="epie">'
          + '<a href="https://github.com/' + esc(CFG.owner) + '/' + esc(CFG.repo)
          + '/commits/' + esc(CFG.branch) + '/' + esc(CFG.path) + '" target="_blank" rel="noopener">'
          + I.clock + 'Historial de cambios</a>'
          + '<button type="button" class="lnk ext" data-a="cfg">' + I.key + 'Token y repositorio</button>'
          + '<button type="button" class="lnk ext" data-a="maquina">' + I.refresh + 'Máquina del tiempo</button></div>' : '')
    + '</div>'

    + seccion(I.key, 'Privacidad y mantenimiento')
    + '<div class="card"><div class="fila"><div><div class="ft">' + (CFG.repoPrivado ? 'Repositorio de datos privado' : 'Privacidad de los datos sin verificar') + '</div>'
    + '<div class="fs">Comprueba la visibilidad con Probar en Token y repositorio. Un repositorio público permite leer la colección. Las copias locales también contienen datos personales.</div></div></div>'
    + '<div class="fila"><div><div class="ft">' + (CFG.recordarClaves ? 'Claves recordadas en este dispositivo' : 'Claves solo durante esta sesión') + '</div>'
    + '<div class="fs">Desconectar borra las claves guardadas aquí. Revoca el token en GitHub si pierdes el dispositivo.</div></div></div></div>'
    + '<div class="dbact">' + accion(I.save, 'Proteger almacenamiento local', 'Solicita al navegador que conserve los datos sin conexión. No sustituye una copia descargada.', 'almacen', '', 'Proteger') + '</div>'

    /* ---- apariencia ---- */
    + seccion(I.eye, 'Apariencia')
    + '<div class="card"><div class="fila"><div><div class="ft">Tema</div>'
      + '<div class="fs">Automático sigue lo que tengas puesto en el sistema</div></div>'
      + '<div class="seg" id="segTema">'
        + ['claro:Claro', 'oscuro:Oscuro', 'auto:Automático'].map(function(o){
            var q = o.split(':');
            return '<button type="button" data-t="' + q[0] + '"' + (tema === q[0] ? ' class="on"' : '') + '>' + q[1] + '</button>';
          }).join('')
      + '</div></div></div>'

    /* ---- copias ---- */
    + seccion(I.save, 'Copias de seguridad', diasCopia === null
        ? 'Aún no has descargado ninguna copia en este dispositivo'
        : (diasCopia === 0 ? 'Última copia: hoy'
          : 'Última copia el ' + fdate(ultCopia).split(',')[0] + ' · hace ' + diasCopia + (diasCopia === 1 ? ' día' : ' días')))
    + (diasCopia !== null && diasCopia > 30
        ? '<div class="warnb">' + I.warn + '<span>Hace más de un mes que no descargas una copia. '
          + 'Tus datos están en GitHub con su historial, pero una copia local no está de más.</span></div>' : '')
    + '<div class="dbact">'
      + accion(I.down, 'Descargar copia', 'Un JSON con toda la colección. En el iPhone se abre la hoja de compartir.', 'bak', '', 'Descargar')
      + accion(I.down, 'Copia anterior a la última operación', 'Descarga el estado previo a una restauración, cambio de conexión o vaciado.', 'recuperacion', '', 'Descargar anterior')
      + accion(I.up, 'Restaurar copia', 'Valida y fusiona un JSON. Los borrados también se restauran; guarda una copia previa automáticamente.', 'impbak', '', 'Seleccionar JSON')
    + '</div>'

    /* ---- importar y exportar ---- */
    + seccion(I.layers, 'Importar y exportar')
    + '<div class="dbact">'
      + accion(I.down, 'Importar CSV de Discogs', 'Añade solo lo que falte: los repetidos se descartan y los dudosos te los pregunto.', 'csv', '', 'Seleccionar CSV')
      + accion(I.file, 'Exportar CSV', 'Con las columnas de Discogs más tus campos propios.', 'expcsv', '', 'Exportar')
    + '</div>'

    /* ---- salud de la colección ---- */
    + seccion(I.aguja, 'Salud de la colección', 'Diagnóstico y mantenimiento')
    + '<div class="dbact">'
      + accion(I.aguja, 'Radar de la colección', 'Fichas incompletas, contradicciones, duplicados y otras señales que conviene revisar.', 'radar', 'pri', 'Ver')
      + accion(I.refresh, 'Revisar y actualizar todo', 'Recorre los ' + DB.discos.length
          + ' discos y rellena lo que falte: caras del tracklist, créditos, foto del disco, Apple Music. No pisa nada tuyo.', 'revisar', 'pri', 'Revisar')
      + accion(I.warn, 'Reparar la base de datos', 'Busca variantes del mismo artista, sellos sucios y años imposibles.', 'reparar', '', 'Analizar')
      + accion(I.copy, 'Buscar repetidos', 'Revisa si hay fichas duplicadas del mismo disco y te deja fusionarlas.', 'dups', '', 'Revisar')
    + '</div>'

    /* ---- completar/importar desde servicios ---- */
    + seccion(I.spark, 'Poner los datos al día', 'Completar e importar información')
    + '<div class="dbact">'
      + (hayDiscogs() ? accion(I.down, 'Traer de Discogs', 'Añade los discos que tengas allí y aquí no.', 'dgcol', '', 'Consultar') : '')
      + accion(I.spark, 'Completar fichas', 'Busca carátula, tracklist, sello y género de lo que esté incompleto.', 'bulk', '', 'Completar')
    + '</div>'

    /* ---- lo que hacen las apps de streaming, adaptado a una colección física ---- */
    + seccion(I.aguja, 'Más allá del catálogo')
    + '<div class="dbact">'
      + accion(I.playF, 'Tu año en un vistazo', 'Un resumen de tu año en formato de historias, para compartir. No necesita ninguna clave.', 'anorepaso', '', 'Ver')
      + (hayTicketmaster() ? accion(I.globe, 'Conciertos cerca de ti', 'Mira si tus artistas con más discos tocan cerca en los próximos meses.', 'conciertos', '', 'Buscar') : '')
      + accion(I.calDisco, 'Discos nuevos de tus artistas', 'Busca si algún artista tuyo ha sacado algo después de lo último que tienes suyo.', 'novedades', '', 'Buscar')
      + (hayAudd() ? accion(I.aguja, '¿Qué está sonando?', 'Graba unos segundos con el micrófono para reconocer una canción y ver si ya la tienes.', 'sonando', '', 'Escuchar') : '')
    + '</div>'

    /* ---- instalación ---- */
    + (instalada ? '' : seccion(I.cloud, 'Instalar en el iPhone')
      + '<div class="card"><div style="font-size:13.5px;line-height:1.6;color:var(--txt2)">'
      + 'Abre esta misma dirección en el iPhone, pulsa compartir y elige '
      + '<b style="color:var(--txt)">Añadir a pantalla de inicio</b>. La primera vez, entra en Sincronización '
      + 'y pega el mismo token que usas aquí.</div></div>')

    /* ---- zona delicada ---- */
    + '<details class="plega peligro" style="margin-top:24px"><summary>Zona delicada'
      + '<svg class="ic ch" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></summary>'
      + '<div class="cuerpo" style="padding:16px">'
      + '<div class="fila"><div><div class="ft">Desconectar este dispositivo</div>'
        + '<div class="fs">La colección se queda solo aquí y pasa a modo consulta.</div></div>'
        + '<button type="button" class="btn sm" data-a="cfg">Ajustes</button></div>'
      + '<div class="fila"><div><div class="ft" style="color:var(--red)">Vaciar la colección</div>'
        + '<div class="fs">Elimina los ' + DB.discos.length + ' discos. Si estás sincronizado, se propaga al resto de dispositivos.</div></div>'
        + '<button type="button" class="btn destr sm" id="wipe">' + I.trash + 'Vaciar</button></div>'
      + '</div></details>'
    + (function(){
        var faltan = DB.discos.filter(function(d){ return d.faltan; });
        if(!faltan.length) return '';
        var motivos = {};
        faltan.forEach(function(d){
          String(d.faltan).split(', ').forEach(function(m){ motivos[m] = (motivos[m] || 0) + 1; });
        });
        return '<details class="plega" style="margin-top:20px"><summary>Lo que no se pudo completar'
          + '<svg class="ic ch" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></summary>'
          + '<div class="cuerpo">'
          + Object.keys(motivos).sort(function(a, b){ return motivos[b] - motivos[a]; }).map(function(k){
              return '<div class="cred"><span class="k">Sin ' + esc(k) + '</span><span class="v">'
                + motivos[k] + ' discos</span></div>';
            }).join('')
          + '<div class="cred"><span class="k" style="color:var(--txt3)">Se reintentan solos pasados 45 días</span>'
          + '<span class="v"></span></div></div></details>';
      })()
    + (function(){
        var f = fallosGuardados();
        if(!f.length) return '';
        return '<details class="plega" style="margin-top:16px"><summary>Últimos fallos'
          + '<span style="font-weight:500;color:var(--txt3);margin-left:8px">' + f.length + '</span>'
          + '<svg class="ic ch" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></summary>'
          + '<div class="cuerpo">'
          + '<div class="note">' + I.info + ' Si algo va mal, copia esto y pásamelo: sirve para arreglarlo.</div>'
          + f.slice().reverse().slice(0, 12).map(function(x){
              return '<div class="cred"><span class="k">' + fdate(x.f).split(',')[0] + ' · ' + esc(x.t)
                + (x.n > 1 ? ' ×' + x.n : '') + '</span>'
                + '<span class="v" style="font-size:12px;font-family:ui-monospace,monospace">' + esc(x.m) + '</span></div>';
            }).join('')
          + '<div class="rowb" style="padding:12px 15px"><button type="button" class="btn sm" id="copiarFallos">'
          + I.copy + 'Copiar</button><button type="button" class="btn sm" id="limpiarFallos">Limpiar</button></div>'
          + '</div></details>';
      })()
    + '<div class="pie-version">Discoteca · versión ' + VERSION + (instalada ? ' · instalada' : '') + '</div>';

  var on = function(a, fn){
    box.querySelectorAll('[data-a=' + a + ']').forEach(function(el){ el.onclick = fn; });
  };
  on('cfg', pantallaSync);
  on('sync', function(){ sincronizarAhora(); toast('Sincronizando…'); });
  on('almacen', function(){
    if(!navigator.storage || !navigator.storage.persist){ toast('Este navegador no permite solicitarlo; descarga una copia periódicamente'); return; }
    navigator.storage.persist().then(function(ok){ toast(ok ? 'Almacenamiento persistente activado' : 'El navegador no lo ha concedido; conserva una copia descargada'); }).catch(function(){ toast('No se pudo solicitar almacenamiento persistente', true); });
  });
  on('bak', exportBackup);
  on('recuperacion', exportarRecuperacion);
  on('impbak', function(){ document.getElementById('fileBak').click(); });
  on('csv', function(){ document.getElementById('fileCsv').click(); });
  on('expcsv', exportarCsv);
  on('print', catalogoImprimible);
  on('inv', inventarioUbicaciones);
  on('valor', valorColeccion);
  on('bulk', function(){ setView('col'); bulkRun(); });
  on('revisar', pantallaRevision);
  on('reparar', pantallaReparar);
  on('dgcol', pantallaDiscogs);
  on('radar', radarColeccion);
  on('sesion', sesionEscucha);
  on('maquina', maquinaDelTiempo);
  on('anorepaso', tuAnoEnUnVistazo);
  on('conciertos', conciertosCerca);
  on('novedades', buscarNovedades);
  on('sonando', queEstaSonando);
  on('dups', function(){
    var dups = dupSet();
    var n = Object.keys(dups).length;
    if(!n){ toast('No hay fichas repetidas'); return; }
    fType = 'dup';
    document.querySelectorAll('#segType button').forEach(function(x){ x.className = x.dataset.f === 'dup' ? 'on' : ''; });
    setView('col'); paintCol();
    toast(n + ' fichas repetidas · ábrelas para fusionarlas');
  });
  box.querySelectorAll('#segTema button').forEach(function(b){
    b.onclick = function(){
      aplicarTema(b.dataset.t);
      box.querySelectorAll('#segTema button').forEach(function(x){ x.className = x.dataset.t === b.dataset.t ? 'on' : ''; });
    };
  });
  var w = box.querySelector('#wipe');
  if(w) w.onclick = function(){
    if(readOnly || configuracionEnCurso || pullPromiseActual || pushPromiseActual){ toast('Conecta y espera a que termine la sincronización', true); return; }
    if(confirm('¿Eliminar los ' + DB.discos.length + ' discos?')){
      crearPuntoRecuperacion('Antes de vaciar la colección').then(function(){
        guardarDeshacer(DB.discos.slice(), 'vaciar la colección');
        DB.discos = []; persist(); toast('Colección vaciada');
      }).catch(function(){ toast('No se ha vaciado: no se pudo guardar la copia previa', true); });
    }
  };
  var cf = box.querySelector('#copiarFallos');
  if(cf) cf.onclick = function(){
    var txt = fallosGuardados().map(function(x){
      return x.f + ' [' + x.t + '] ' + x.m + (x.d ? ' @' + x.d : '') + (x.n > 1 ? ' ×' + x.n : '');
    }).join('\n');
    if(navigator.clipboard) navigator.clipboard.writeText(txt).then(function(){ toast('Copiado'); });
    else toast('No se pudo copiar', true);
  };
  var lf = box.querySelector('#limpiarFallos');
  if(lf) lf.onclick = function(){
    try{ localStorage.removeItem('discoteca.fallos'); }catch(e){}
    paintDb();
    toast('Registro limpiado');
  };
  montarAyudas(box);
}

