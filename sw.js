/* Discoteca — service worker
   Guarda la aplicación en caché para que abra al instante y sin conexión.
   Los datos NUNCA se cachean: siempre se piden a GitHub. */
var CACHE = 'discoteca-v62';
/* zxing-0.21.3.js (336 KB) NO va aquí a propósito: solo lo carga quien usa el
   escáner de códigos de barras, y forzar su descarga en la instalación penaliza
   a todo el mundo. Se cachea solo (como cualquier otro archivo) la primera vez
   que de verdad se pide, vía el gestor de "fetch" de abajo. */
/* './' NO se incluye a propósito: es la misma página que './index.html' (GitHub
   Pages sirve ese archivo para la raíz), así que precachear las dos duplicaría
   el HTML entero (~650 KB) en la instalación. El respaldo sin conexión de más
   abajo ya sirve './index.html' para cualquier navegación, incluida la raíz. */
var SHELL = ['./index.html', './styles.css', './js/edition.js', './js/core.js', './js/library.js', './js/transfer.js', './js/features.js', './js/metadata.js', './js/insights.js', './js/stats.js', './js/settings.js', './js/quality.js', './js/bootstrap.js', './manifest.webmanifest', './icon-192-v2.png', './icon-512-v2.png', './icon-512-maskable.png', './apple-touch-icon-v2.png'];
/* Rutas absolutas del SHELL, para reconocerlas en el "fetch" de abajo sin
   depender de cómo esté escrita la URL de la petición (con o sin "./"). */
var SHELL_HASHES = {"./index.html":"2bae94b4363c1dfad7d9038a915643acc8b58ef50bfca3133c68a201d4934e98","./styles.css":"143c64d981f9cb9d779daddb513af8cfdfa6234cf3e69ebdefc60803cab3342f","./js/edition.js":"96358a65e084ef899c6304def61d02ed319603372ec08e1bd1faa1191ac4dab9","./js/core.js":"f6f152887a2789568b08a6ac2ca9d12009142687c8c80c1c466d1556ad51a86b","./js/library.js":"456101ca8d5f51f4f6bdbce7a4c72ec7deefa113cf629e0e18c84cc279363f5a","./js/transfer.js":"5b0d42fd90ac8a4737f659deead647a406aaea92ac4afbc0383e0a0d9e27b66f","./js/features.js":"e8c614e05fe6ed2972ed6db96ac0cc6836dccfd73df9e66739fb41bd78708388","./js/metadata.js":"73cfdedf4978998417ae560540355767afca50e8a8b5a261cb2222c1243efe96","./js/insights.js":"199b4bf8971181f4da29aee4b7dc02361891dc93171fdbd93ebc5fbe345f0b3f","./js/stats.js":"3b17e5e91c76403037e1086b8284160094c0bc92a24508735247ae4fb485de87","./js/settings.js":"14aba24168d8485cfbab7ef8ea0baa350d9936d8ae6cded5973d33096d91544c","./js/quality.js":"26049440ca2351d3f6a69fa652729959fb70c7b20b06755c5829390cd038169f","./js/bootstrap.js":"71cec9551f73dabe9652d7e6ef6a4473f663eb54d2075d03740736173888ba65","./manifest.webmanifest":"6822de0b53c61950604936028b2bf68b8b808489beb9f83a1d58cb6ae9e675ef","./icon-192-v2.png":"30e6ca39a01723e31b07279b16218460bec66e56873cfe57d7e11f96751b36c3","./icon-512-v2.png":"d0999059f09cb76533ae26d70afbdbbb3f47b6beb7bbc95cf0e1868b05989dbb","./icon-512-maskable.png":"c9e9bf1037baab7a6715fb5cd3ef9ee29c51914ee7ef0b391c73a5e10c7216f6","./apple-touch-icon-v2.png":"ceaaf14c4e4fb852ceaf8db8720b67096242a960fc6b5f61a2be10a4d57482cb"};
var SHELL_PATHS = SHELL.map(function(s){ return new URL(s, self.registration.scope).pathname; });

self.addEventListener('install', function(e){
  /* Sin skipWaiting() aquí: el service worker nuevo se queda "esperando" hasta
     que la propia app (tras avisar al usuario) le pida saltar con el mensaje
     'saltar' de abajo. Así nunca se activa una versión nueva sin que la persona
     lo sepa y lo confirme. */
  e.waitUntil(Promise.all(SHELL.map(function(asset){
    return fetch(new Request(asset, {cache:'no-store'})).then(function(response){
      if(!response.ok || response.type === 'opaque') throw new Error('Shell incompleto');
      return response.clone().arrayBuffer().then(function(bytes){
        return crypto.subtle.digest('SHA-256', bytes).then(function(hash){
          var digest = Array.from(new Uint8Array(hash)).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
          if(digest !== SHELL_HASHES[asset]) throw new Error('Versión de asset incoherente');
          return {asset:asset, response:response};
        });
      });
    });
  })).then(function(assets){
    return caches.open(CACHE).then(function(c){ return Promise.all(assets.map(function(a){ return c.put(a.asset, a.response); })); });
  }));
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
      if(esArchivoShell) return cacheado || Promise.reject(new Error('Shell incompleto'));
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
