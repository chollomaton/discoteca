/* Discoteca — service worker
   Guarda la aplicación en caché para que abra al instante y sin conexión.
   Los datos NUNCA se cachean: siempre se piden a GitHub. */
var CACHE = 'discoteca-v60';
/* zxing-0.21.3.js (336 KB) NO va aquí a propósito: solo lo carga quien usa el
   escáner de códigos de barras, y forzar su descarga en la instalación penaliza
   a todo el mundo. Se cachea solo (como cualquier otro archivo) la primera vez
   que de verdad se pide, vía el gestor de "fetch" de abajo. */
/* './' NO se incluye a propósito: es la misma página que './index.html' (GitHub
   Pages sirve ese archivo para la raíz), así que precachear las dos duplicaría
   el HTML entero (~650 KB) en la instalación. El respaldo sin conexión de más
   abajo ya sirve './index.html' para cualquier navegación, incluida la raíz. */
var SHELL = ['./index.html', './styles.css', './js/core.js', './js/library.js', './js/transfer.js', './js/features.js', './js/metadata.js', './js/insights.js', './js/stats.js', './js/settings.js', './js/bootstrap.js', './manifest.webmanifest', './icon-192-v2.png', './icon-512-v2.png', './icon-512-maskable.png', './apple-touch-icon-v2.png'];
/* Rutas absolutas del SHELL, para reconocerlas en el "fetch" de abajo sin
   depender de cómo esté escrita la URL de la petición (con o sin "./"). */
var SHELL_PATHS = SHELL.map(function(s){ return new URL(s, self.registration.scope).pathname; });

self.addEventListener('install', function(e){
  /* Sin skipWaiting() aquí: el service worker nuevo se queda "esperando" hasta
     que la propia app (tras avisar al usuario) le pida saltar con el mensaje
     'saltar' de abajo. Así nunca se activa una versión nueva sin que la persona
     lo sepa y lo confirme. */
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.map(function(k){ return k === CACHE || k.indexOf('discoteca-v') !== 0 ? null : caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('message', function(e){
  if(e.data === 'saltar') self.skipWaiting();
});
/* Caché primero, para que abra al instante de verdad; en paralelo se pide la
   red y se deja guardada para la próxima vez. Si no hay nada en caché aún
   (primera visita), se espera a la red como antes.
   EXCEPCIÓN: los archivos del SHELL (el HTML, el manifest, los iconos -todo
   lo versionado por la propia instalación del service worker) NUNCA se
   refrescan así en caliente. Si se hiciera, un service worker todavía
   ACTIVO (el viejo, mientras el nuevo espera a que el usuario pulse
   "Actualizar") iría escribiendo silenciosamente el index.html nuevo dentro
   de su propia caché -mezclando HTML nuevo con lógica de sw.js vieja, que es
   justo lo que el aviso de actualización quiere evitar-. La única forma de
   que estos archivos cambien es una versión nueva del propio service worker,
   con su propio CACHE y su propio ciclo install→waiting→(usuario pulsa
   Actualizar)→activate. */
self.addEventListener('fetch', function(e){
  var url = new URL(e.request.url);
  if(e.request.method !== 'GET') return;
  if(url.origin !== location.origin || /datos\.json/.test(url.pathname)) return;
  if(e.request.headers.has('Authorization')) return;
  if(e.request.mode === 'navigate'){
    e.respondWith(
      caches.open(CACHE).then(function(c){
        return c.match('./index.html');
      }).then(function(cacheado){
        if(cacheado) return cacheado;
        return fetch(e.request).catch(function(){ return Promise.reject('offline'); });
      })
    );
    return;
  }
  if(SHELL_PATHS.indexOf(url.pathname) < 0 && url.pathname !== new URL('./zxing-0.21.3.js', self.registration.scope).pathname) return;
  var esArchivoShell = SHELL_PATHS.indexOf(url.pathname) >= 0;
  e.respondWith(
    caches.open(CACHE).then(function(c){ return c.match(e.request); }).then(function(cacheado){
      if(esArchivoShell && cacheado) return cacheado;
      var actualizar = fetch(e.request).then(function(r){
        if(r && r.ok){
          var copia = r.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copia); });
        }
        return r;
      }).catch(function(){
        if(cacheado) return cacheado;
        return Promise.reject('offline');
      });
      return cacheado || actualizar;
    })
  );
});
