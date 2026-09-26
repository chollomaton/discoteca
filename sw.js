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
var SHELL = ['./index.html', './styles.css', './js/core.js', './js/library.js', './js/transfer.js', './js/features.js', './js/metadata.js', './js/insights.js', './js/stats.js', './js/settings.js', './js/quality.js', './js/bootstrap.js', './manifest.webmanifest', './icon-192-v2.png', './icon-512-v2.png', './icon-512-maskable.png', './apple-touch-icon-v2.png'];
/* Rutas absolutas del SHELL, para reconocerlas en el "fetch" de abajo sin
   depender de cómo esté escrita la URL de la petición (con o sin "./"). */
var SHELL_HASHES = {"./index.html":"cf5ff6315a4d6ffbe017ed73f1091914af5004db6351f04285ec9434f9b20e7a","./styles.css":"3159e2f6e178eb6273b94df3022380fde445aa13e607473d90b1d1946e286012","./js/core.js":"fadb17a2dd4be2daf335c5a921d48144c39d5e903b02df57089cf96f6519f982","./js/library.js":"8f53593bf19eebbb72ece2ec6092c48b66e93f8d06ed0377a3ca554924533ccb","./js/transfer.js":"96d3860283f8fa7e89a4c66023007732dc4cded33787d894f392e1fa5b2d1e9f","./js/features.js":"e8c614e05fe6ed2972ed6db96ac0cc6836dccfd73df9e66739fb41bd78708388","./js/metadata.js":"6e244df1d876b092c7fb88cb2ccac0f41f7499123ede5f29295562c0010f81fa","./js/insights.js":"199b4bf8971181f4da29aee4b7dc02361891dc93171fdbd93ebc5fbe345f0b3f","./js/stats.js":"3b17e5e91c76403037e1086b8284160094c0bc92a24508735247ae4fb485de87","./js/settings.js":"8e9cc8d1d2da05115ba162bc387d8e5712011902b4c793927725ee1666b626cb","./js/quality.js":"ffa6a9950db95032a23873dc1573ecaefe58b03c298e488a13c8de24bd9f9f11","./js/bootstrap.js":"71cec9551f73dabe9652d7e6ef6a4473f663eb54d2075d03740736173888ba65","./manifest.webmanifest":"6822de0b53c61950604936028b2bf68b8b808489beb9f83a1d58cb6ae9e675ef","./icon-192-v2.png":"30e6ca39a01723e31b07279b16218460bec66e56873cfe57d7e11f96751b36c3","./icon-512-v2.png":"d0999059f09cb76533ae26d70afbdbbb3f47b6beb7bbc95cf0e1868b05989dbb","./icon-512-maskable.png":"c9e9bf1037baab7a6715fb5cd3ef9ee29c51914ee7ef0b391c73a5e10c7216f6","./apple-touch-icon-v2.png":"ceaaf14c4e4fb852ceaf8db8720b67096242a960fc6b5f61a2be10a4d57482cb"};
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
