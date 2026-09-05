/* Discoteca — service worker
   La aplicación se guarda en caché para que abra al instante y sin conexión.
   Los datos NUNCA se cachean: siempre se piden a GitHub. */
var CACHE = 'discoteca-v1';
var SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.map(function(k){ return k === CACHE ? null : caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  var url = new URL(e.request.url);
  if(e.request.method !== 'GET') return;
  // nunca interceptar la API, las portadas remotas ni el archivo de datos
  if(url.origin !== location.origin || /datos\.json/.test(url.pathname)) return;
  e.respondWith(
    fetch(e.request).then(function(r){
      var copia = r.clone();
      caches.open(CACHE).then(function(c){ c.put(e.request, copia); });
      return r;
    }).catch(function(){
      return caches.match(e.request).then(function(m){ return m || caches.match('./index.html'); });
    })
  );
});
