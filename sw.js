/* Discoteca — service worker
   Guarda la aplicación en caché para que abra al instante y sin conexión.
   Los datos NUNCA se cachean: siempre se piden a GitHub. */
var CACHE = 'discoteca-v39';
/* zxing-0.21.3.js (336 KB) NO va aquí a propósito: solo lo carga quien usa el
   escáner de códigos de barras, y forzar su descarga en la instalación penaliza
   a todo el mundo. Se cachea solo (como cualquier otro archivo) la primera vez
   que de verdad se pide, vía el gestor de "fetch" de abajo. */
/* './' NO se incluye a propósito: es la misma página que './index.html' (GitHub
   Pages sirve ese archivo para la raíz), así que precachear las dos duplicaría
   el HTML entero (~650 KB) en la instalación. El respaldo sin conexión de más
   abajo ya sirve './index.html' para cualquier navegación, incluida la raíz. */
var SHELL = ['./index.html', './manifest.webmanifest', './icon-192-v2.png', './icon-512-v2.png', './icon-512-maskable.png', './apple-touch-icon-v2.png'];

self.addEventListener('install', function(e){
  /* Sin skipWaiting() aquí: el service worker nuevo se queda "esperando" hasta
     que la propia app (tras avisar al usuario) le pida saltar con el mensaje
     'saltar' de abajo. Así nunca se activa una versión nueva sin que la persona
     lo sepa y lo confirme. */
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.map(function(k){ return k === CACHE ? null : caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('message', function(e){
  if(e.data === 'saltar') self.skipWaiting();
});
/* Caché primero, para que abra al instante de verdad; en paralelo se pide la
   red y se deja guardada para la próxima vez. Si no hay nada en caché aún
   (primera visita), se espera a la red como antes. */
self.addEventListener('fetch', function(e){
  var url = new URL(e.request.url);
  if(e.request.method !== 'GET') return;
  if(url.origin !== location.origin || /datos\.json/.test(url.pathname)) return;
  e.respondWith(
    caches.match(e.request).then(function(cacheado){
      var actualizar = fetch(e.request).then(function(r){
        /* Solo se guarda una respuesta buena: cachear un 404/500 (o un error de
           CORS marcado "opaque") dejaría ese fallo servido para siempre, incluso
           cuando la red ya tiene el archivo correcto. */
        if(r && r.ok){
          var copia = r.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copia); });
        }
        return r;
      }).catch(function(){
        /* Sin red y sin copia en caché: solo tiene sentido devolver la app
           (index.html) cuando lo que fallaba era navegar a una página -nunca
           para un recurso suelto (una imagen, un script) que no la tenía. */
        if(cacheado) return cacheado;
        if(e.request.mode === 'navigate') return caches.match('./index.html');
        return Promise.reject('offline');
      });
      return cacheado || actualizar;
    })
  );
});
