/* Discoteca — service worker
   Guarda la aplicación en caché para que abra al instante y sin conexión.
   Los datos NUNCA se cachean: siempre se piden a GitHub. */
var CACHE = 'discoteca-v30';
var SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192-v2.png', './icon-512-v2.png', './apple-touch-icon-v2.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); }));
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
        var copia = r.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, copia); });
        return r;
      }).catch(function(){
        return cacheado || caches.match('./index.html');
      });
      return cacheado || actualizar;
    })
  );
});
