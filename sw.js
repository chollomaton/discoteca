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
var SHELL_HASHES = {"./index.html":"2bae94b4363c1dfad7d9038a915643acc8b58ef50bfca3133c68a201d4934e98","./styles.css":"851f184da37b4608737045924ee7ae108d4c38bdb6a2852ee4d9cedfdee306dc","./js/edition.js":"245de5908fcd90a48f0565ef85ea9f29d965d456f29393291a426d7489809f13","./js/core.js":"56f460f845066330c819e7e82cfe5d2e394835e5b25bae6270a17df29b5b7db9","./js/library.js":"abfba34bca37863a7b981c60d54686bccdfbdf7f4d54de074b8c263662320418","./js/transfer.js":"5b0d42fd90ac8a4737f659deead647a406aaea92ac4afbc0383e0a0d9e27b66f","./js/features.js":"2393a651556350eff67eabd65d599df283f84275508206d3747566a120ba7fd3","./js/metadata.js":"51b7a5bc3a6c3c8b511bdcb1f723f5d451614dd6d0fbcfc0715781c23a10f125","./js/insights.js":"3ca6f225bf3103b8e8eedd5a6932f491f5318693ee50989bfe3a9b0aacc0a85c","./js/stats.js":"3b17e5e91c76403037e1086b8284160094c0bc92a24508735247ae4fb485de87","./js/settings.js":"14aba24168d8485cfbab7ef8ea0baa350d9936d8ae6cded5973d33096d91544c","./js/quality.js":"26049440ca2351d3f6a69fa652729959fb70c7b20b06755c5829390cd038169f","./js/bootstrap.js":"72324000144e7a69293da4a16ad7bef873a8b51bf34426c7c6d0401d0959907f","./manifest.webmanifest":"6822de0b53c61950604936028b2bf68b8b808489beb9f83a1d58cb6ae9e675ef","./icon-192-v2.png":"30e6ca39a01723e31b07279b16218460bec66e56873cfe57d7e11f96751b36c3","./icon-512-v2.png":"d0999059f09cb76533ae26d70afbdbbb3f47b6beb7bbc95cf0e1868b05989dbb","./icon-512-maskable.png":"c9e9bf1037baab7a6715fb5cd3ef9ee29c51914ee7ef0b391c73a5e10c7216f6","./apple-touch-icon-v2.png":"ceaaf14c4e4fb852ceaf8db8720b67096242a960fc6b5f61a2be10a4d57482cb"};
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
