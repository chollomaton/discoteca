# Discoteca

Catálogo de vinilos y CDs que funciona igual en el Mac y en el iPhone, con los datos
guardados en tu propio repositorio de GitHub. Sin servidor propio: la aplicación es
una PWA estática modular, y tu colección se sincroniza como un `datos.json` en GitHub.

**Versión de esta entrega:** 2026.09.25-phase10.4 — se comprueba en Ajustes, al final de todo.

## Archivos de la aplicación

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Shell HTML: estructura y puntos de montaje de la interfaz |
| `styles.css` | Todos los estilos visuales y adaptaciones Mac/iPhone |
| `js/core.js` | Estado global, utilidades, almacenamiento, persistencia y sincronización base |
| `js/library.js` | Importación/exportación, colección, fichas y formularios |
| `js/features.js` | Funciones de enriquecimiento y herramientas sobre discos |
| `js/insights.js` | Máquina del tiempo, listas inteligentes y recomendaciones |
| `js/stats.js` | Gráficos y estadísticas |
| `js/settings.js` | Ajustes, mantenimiento y salud de la colección |
| `js/bootstrap.js` | Eventos, service worker y arranque de la aplicación |
| `manifest.webmanifest` | Permite instalarla con su icono |
| `sw.js` | Hace que abra al instante y funcione sin cobertura |
| `icon-192-v2.png`, `icon-512-v2.png`, `icon-512-maskable.png`, `apple-touch-icon-v2.png` | Iconos PWA |
| `zxing-0.21.3.js` | Lector local de códigos de barras |

La aplicación sigue siendo **vanilla JavaScript y estática**: no hay React, Vue, Next, bundler ni servidor propio. La Fase 5 solo separa responsabilidades para que tocar una zona de la app no obligue a editar un archivo gigante. `datos.json` sigue siendo independiente y no forma parte del código de la aplicación.

**`datos.json`** es aparte: contiene tu colección (206 discos en colección y 14 en deseos)
y es el único archivo que se sincroniza solo, en cada cambio. No se incluye en los ZIP de
actualización de la aplicación por esa misma razón.

Este propio **`LEEME.md`** es solo documentación para ti: no lo usa la aplicación, no hace
falta subirlo a GitHub, pero tampoco pasa nada si lo subes también.

Los iconos antiguos ya no forman parte del repositorio. Los únicos iconos de la app son los cuatro indicados arriba.

### Descubrimiento inteligente (Fase 6)

La colección mantiene las portadas como contenido principal. Las recomendaciones avanzadas ya no aparecen automáticamente ocupando espacio: se abren desde el acceso compacto **Explorar**. Allí hay cinco modos calculados solo con los datos locales: **Para hoy**, **Joyas olvidadas**, **Sin escuchar**, **Parecido a lo último** y **Viaje por décadas**. «Qué escucho ahora» también mejora las sesiones por tiempo: intenta aprovechar mejor los minutos disponibles y prioriza artistas distintos antes de repetir uno.

### Arquitectura modular (Fase 5)

`index.html` ya no contiene cientos de kilobytes de CSS y JavaScript. Queda reducido a la estructura HTML y carga archivos separados por responsabilidad. Los scripts siguen siendo clásicos y comparten el mismo ámbito global, de modo que la modularización no cambia el modelo de ejecución ni introduce una migración de framework. El orden de carga está fijado y protegido por CI.

### Validación automática

El repositorio incluye `.github/workflows/validate.yml` y las baterías `validate.mjs`, `sync-tests.mjs`, `quality-tests.mjs`, `design-tests.mjs`, `pwa-update-tests.mjs`, `module-tests.mjs`, `phase6-tests.mjs` y `phase7-tests.mjs`. GitHub ejecuta estas comprobaciones en cada pull request y en cada cambio que llega a `main`: sintaxis de todos los módulos JavaScript, orden de carga, separación del CSS, manifest y service worker, assets PWA, coherencia de versión, integridad básica de `datos.json`, reglas de caché y regresiones críticas ya sufridas por la app. La batería de sincronización simula además dos dispositivos: ediciones concurrentes en campos distintos, etiquetas, protecciones manuales, escuchas, borrados y compatibilidad con versiones antiguas. La batería de calidad prueba los niveles del Detective y la detección de estados de revisión desactualizados del Radar. Si alguna falla, el cambio no debe publicarse hasta corregirla.

### Actualización PWA fiable

El botón «Actualizar» activa el service worker nuevo y recarga usando exclusivamente la caché de esa versión. Así se evita que, durante unos instantes tras `skipWaiting()`, una caché antigua pueda volver a servir el `index.html` anterior y obligar a recargar varias veces.

### Apple Music 2.0

La colección mantiene la estética Apple Music, pero vuelve a dar protagonismo inmediato a las portadas. En la parte superior solo hay tres accesos compactos: «Qué escucho ahora», «Recién añadidos» y «Vuelve a ponerlos». Los dos últimos abren su contenido únicamente al pulsarlos. «Recomendado para hoy» queda integrado dentro de «Qué escucho ahora», junto a la selección por tiempo. Radar vuelve a Ajustes, dentro de «Salud de la colección». La ficha de un álbum mantiene en escritorio la composición amplia con portada a la izquierda y metadatos/acciones a la derecha; en iPhone conserva la navegación de pantalla completa y el diseño vertical.

---

## Paso 1 · Separar aplicación y datos

Mantén la aplicación estática en el repositorio público `discoteca`, publicado con GitHub Pages.
La colección puede estar en **otro repositorio privado**, por ejemplo `discoteca-datos`, sin Pages.
La app usa la API autenticada de GitHub para leer y escribir allí, también para archivos grandes.
Mac e iPhone usan exactamente la misma dirección de la app y el mismo destino de datos.

**La Fase 7 no convierte automáticamente la colección actual en privada.** El `datos.json` existente
se conserva intacto para no perder datos ni interrumpir dispositivos antiguos. Mientras siga en el
repositorio público, cualquiera puede leerlo. Dejar de cargarlo en la interfaz no lo oculta en GitHub.
Las copias que ya estén en el historial público seguirán siendo públicas aunque se quite el archivo actual.

### Migración sin pérdida de datos

1. Sincroniza Mac e iPhone hasta que ambos indiquen «Al día». Descarga una copia desde cada dispositivo
   y comprueba que son JSON legibles. Conserva ambas fuera del repositorio público.
2. Crea un repositorio **privado** `discoteca-datos`, inicializado con un README para tener rama `main`.
   No copies el código de la app ni actives Pages en ese repositorio.
3. Crea el token descrito abajo, limitado solo al repositorio privado.
4. En el Mac, Ajustes → Token y repositorio: elige el repositorio privado, `main` y `datos.json`.
   «Probar» debe indicar repositorio privado. Guarda; la app crea una copia previa y fusiona la colección
   local con el destino, o crea allí el JSON si no existe. Espera «Al día» y verifica el archivo privado.
5. En el iPhone configura el mismo destino. Conserva su copia local: sus cambios se fusionan.
   Comprueba recuentos, deseos, escuchas, notas y una edición de prueba en ambos sentidos.
6. Solo tras verificar los dos dispositivos, revoca el token anterior con acceso al código público.
   La retirada del `datos.json` público y el tratamiento del historial requieren una tarea posterior
   cuidadosamente preparada; esta entrega no borra ni reescribe el historial.

En un dispositivo nuevo la app comienza vacía hasta conectar o restaurar una copia. Nunca descarga
por defecto el JSON público. En los dispositivos ya usados conserva la colección local, incluso vacía.
No borres los datos del navegador para actualizar la app.

## Paso 2 · Crear el token de GitHub

1. Abre [los tokens de acceso detallado](https://github.com/settings/personal-access-tokens/new).
2. Dale un nombre reconocible y una caducidad limitada.
3. En **Only select repositories**, selecciona exclusivamente el repositorio privado de datos.
4. En **Contents**, concede **Read and write**. No necesita acceso al repositorio del código.
5. Genera el token y consérvalo en tu gestor de contraseñas. Introdúcelo directamente en cada dispositivo;
   nunca lo pegues en chats, incidencias, capturas, archivos del repositorio ni copias de colección.

Sin «Recordar claves en este dispositivo», las claves solo duran hasta cerrar o recargar la app.
Con esa opción se guardan sin cifrar en IndexedDB; localStorage guarda únicamente ajustes sin claves.
Por compatibilidad, las instalaciones anteriores mantienen su credencial recordada y eliminan su copia
duplicada de localStorage. Puedes desactivar la opción y guardar para pasar a uso por sesión.
Un script malicioso que lograse ejecutarse en el mismo origen podría leer credenciales recordadas o
activas. La CSP prohíbe scripts inline, pero esto no sustituye proteger la cuenta y revisar los cambios
publicados. Un token limitado a datos no permite reescribir la aplicación.

«Desconectar» olvida todas las claves configuradas en ese dispositivo; conserva la colección y el destino.
Si el navegador no permite borrar la credencial, se avisa. Revócala en GitHub si pierdes el dispositivo.
El token viaja en la cabecera Authorization de las peticiones a GitHub, nunca en la URL.

---

## Paso 3 · Conectar el Mac

1. Abre `https://TU-USUARIO.github.io/discoteca/` en Chrome.
2. Ve a la pestaña **Ajustes › Conectar** (o pulsa el indicador de sincronización de arriba).
3. Rellena: usuario, repositorio privado (`discoteca-datos`), rama (`main`), archivo (`datos.json`) y pega el token.
4. Pulsa **Probar** para comprobar la conexión y luego **Guardar y sincronizar**.

A partir de ese momento, cada cambio se sube solo a los pocos segundos.

---

## Paso 4 · Instalar en el iPhone

1. Abre la misma dirección en Safari en el iPhone.
2. Pulsa el botón de compartir y elige **Añadir a pantalla de inicio**.
3. Ábrela desde el icono: se ve a pantalla completa, sin barra del navegador.
4. Entra en **Ajustes › Conectar** y pega el mismo token que usaste en el Mac.

Ya está. El botón azul del centro de la barra inferior abre el **modo tienda**: pantalla
pensada para usar de pie, con el escáner a un toque y tu lista de deseos a mano, para
saber al momento si ya tienes un disco antes de comprarlo.

**El icono de la pantalla de inicio no se actualiza solo.** iOS lo captura una vez, al
añadirlo, y no vuelve a mirarlo aunque cambie el archivo en el servidor. Si algún día
cambias el icono, borra el acceso directo y vuelve a añadirlo desde Safari para verlo nuevo.

---

## Qué hace la aplicación

- **Colección**: rejilla, lista o estantería con lomos coloreados según la portada;
  agrupar y filtrar por artista, género, década, sello, país, formato o ubicación;
  búsqueda que entiende texto libre, años, sellos y formatos.
- **Ficha del disco**: la portada gira y muestra el vinilo o el CD real (o uno dibujado
  si no hay foto); tracklist separado por caras o discos; corazón por canción favorita;
  créditos pulsables que llevan a otros discos del mismo productor; enlace entre
  ediciones del mismo álbum en distinto formato; biografía de Wikipedia (con Last.fm
  como respaldo si no hay artículo); estado del disco y de la funda por separado.
- **Completar fichas**: combina Apple Music, MusicBrainz, Cover Art Archive y,
  opcionalmente, Discogs. **Revisar y actualizar todo**, en Ajustes, repasa la
  colección entera rellenando solo lo que falte, sin pisar nunca lo que hayas escrito
  a mano.
- **Estadísticas**: mapa mundial de tu colección por país de edición, artistas, escuchas
  o valor con deslizador de décadas; calendario de escuchas a cuatro niveles; horas de
  aguja; quiz sobre tu propia colección; recomendaciones basadas solo en lo que ya tienes.
- **Deseos** y **modo tienda**, con escáner de código de barras y, si falla, la opción
  de identificar el disco por una foto de la portada; te dice al momento si ya lo
  tienes, si es otra edición o si no lo tienes.
- **Inteligencia de la colección**, accesible desde la paleta de comandos (⌘K) o desde
  cada ficha:
  - **Detective de ediciones** (en la ficha de cada disco): cruza MusicBrainz, Discogs
    y el código de barras contra los datos de tu ficha y dice, con su nivel de
    confianza (alta / parcial / sin confirmar / datos que no coinciden), si es
    exactamente esa edición. Nunca inventa una coincidencia: si algo no cuadra o falta
    un identificador, lo dice claramente.
  - **Radar de la colección**: todo lo que merece revisión reunido en un sitio —
    fichas incompletas, posibles duplicados, discos sin foto, reparaciones pendientes.
  - **Qué escucho ahora**: puedes pedir un disco recomendado o indicar cuánto tiempo tienes. Las sesiones intentan acercarse al tiempo disponible y dar variedad de artistas, con filtros de no escuchados, favoritos, vinilo o CD.
  - **Explorar la colección**: cinco formas de redescubrir lo que ya tienes — para hoy, joyas olvidadas, sin escuchar, parecido a lo último y viaje por décadas — sin consultar servicios externos.
  - **El ADN de tu colección**: perfil calculado solo con tus propios datos —
    décadas, géneros, países, sellos, concentración por artista.
  - **Tendencia de escucha**: cómo ha cambiado el ritmo de escucha mes a mes, artistas
    más escuchados en el último año y discos con más tiempo sin sonar.
  - **Huecos de un artista** (desde su ficha): álbumes de estudio que te faltan según
    MusicBrainz, con botón directo a deseos.
  - **Evolución del valor**: snapshots del valor estimado de la colección en el tiempo.
- **Más allá del catálogo** (Ajustes): conciertos cerca de ti de tus artistas con más
  discos, aviso de discos nuevos de artistas que ya tienes, un resumen del año en
  formato de historias para compartir, y reconocer una canción grabando unos segundos
  con el micrófono.
- **Import/export**: CSV compatible con Discogs, catálogo e inventario imprimibles,
  copias de seguridad, y traer tu colección de Discogs directamente.

---

## Cómo funciona la sincronización

- Al abrir la aplicación se descarga la colección del repositorio.
- Cada cambio se guarda al instante en el dispositivo y se sube a los pocos segundos.
- Si has editado en los dos sitios, **se fusionan los campos modificados**: las ediciones en campos distintos se combinan;
  en un mismo campo gana su modificación más reciente. Se conserva compatibilidad con clientes antiguos.
- Si dos dispositivos suben a la vez, el segundo detecta el choque, vuelve a bajar, fusiona y sube.
- Los borrados también se propagan.
- Sin cobertura la aplicación sigue funcionando: los cambios quedan en espera y suben al reconectar.
- El indicador de la barra superior muestra el estado. Pulsándolo fuerza la sincronización (⌘S en el Mac).
- **Máquina del tiempo** (Ajustes): lee el historial de commits de tu repositorio y te
  deja ver cómo era tu colección en cualquier fecha pasada.

El token se guarda **solo en cada dispositivo**, nunca se sube al repositorio.

---

## Las claves opcionales

Además del token de GitHub, obligatorio, hay cinco claves opcionales, todas se
configuran en **Ajustes › Conectar** y siguen la opción de recordar claves del token. Se envían a su proveedor para prestar el servicio;
no se incluyen en la copia de colección. Sin ninguna de ellas la aplicación funciona con normalidad; cada una
desbloquea una función concreta.

| Clave | De dónde se saca | Qué desbloquea |
|---|---|---|
| **Discogs** | discogs.com → Settings → Developers → Generate token | Ficha técnica, precios, mejor escáner y relleno de fichas |
| **Anthropic** | console.anthropic.com | Identificar un disco por foto de la portada cuando falla el código de barras (tiene coste por foto) |
| **Last.fm** | last.fm/api/account/create, gratis | Biografía de respaldo cuando un artista no tiene Wikipedia en español |
| **Ticketmaster** | developer.ticketmaster.com, gratis | Avisar de conciertos cerca de ti de tus artistas |
| **AudD** | audd.io | Reconocer una canción con el micrófono (su plan gratuito es muy limitado) |

---

## Importar un CSV de Discogs

En **Ajustes › Importar CSV de Discogs**. Nunca se machaca nada:

- Lo que **ya tienes exactamente igual** se descarta y tu ficha queda intacta.
- Lo que es **claramente nuevo** se añade.
- Lo **dudoso** (misma obra en otra edición, mismo número de catálogo, títulos casi iguales) se te
  muestra uno a uno, comparando tu ficha con la del CSV, con tres opciones:
  **mantener la mía**, **sustituir** o **guardar las dos**.
  Al sustituir se conservan la portada, el tracklist, las etiquetas y las escuchas que ya tenías.
  Hay una casilla para aplicar la misma decisión al resto.

**Traer de Discogs** hace lo mismo pero leyendo tu colección de allí directamente, sin
exportar ningún archivo: compara con lo que ya tienes y con tu lista de deseos, y si un
disco que buscabas ya lo tienes en Discogs, mueve la ficha de deseos a la colección en
vez de duplicarla.

---

## Detalles útiles

- **Escaneo**: en el iPhone se usa un lector propio porque Safari no trae el del sistema.
  Recorta solo la zona del recuadro antes de leer y exige dos lecturas seguidas iguales
  antes de aceptar un código, para no confundirse con una segunda pegatina de precio.
  Si la luz no acompaña, se puede hacer una foto del código o teclearlo.
- **Completar fichas**: los datos vienen de Apple Music, MusicBrainz, Cover Art Archive
  y, si tienes token, Discogs. MusicBrainz limita a una consulta por segundo, así que
  completar muchos discos de golpe va despacio.
- **Cuando falle la búsqueda**: en la ficha, botón **Ediciones** para elegir el prensado
  con su portada, o **··· › Fijar edición por URL** para pegar el enlace exacto de
  MusicBrainz. Si la ficha se rellenó con una coincidencia dudosa, un aviso ofrece
  **elegir otra edición** o **dar los datos por buenos**.
- **Campos editados a mano**: si corriges un dato en el formulario, queda protegido.
  Ni «Completar» ni la revisión general lo vuelven a pisar después.
- **Copias de seguridad**: aunque todo esté en GitHub (con su historial de versiones), en
  **Ajustes › Copia de seguridad** puedes descargar un JSON. En el iPhone se abre la hoja de compartir.
- **Registro de fallos**: si algo va mal, en Ajustes hay un apartado plegado con los
  últimos errores de la aplicación y un botón para copiarlos, útil para pedir ayuda.
- **Atajos en el Mac**: `⌘K` buscar, `⌘S` sincronizar, `/` filtrar, `n` nuevo disco, `r` disco al azar,
  `t` modo tienda, `1`–`4` cambiar de pestaña.

## Si algo va mal

- **"Token no válido"**: el token caducó o no tiene el permiso *Contents: Read and write*. Crea otro.
- **La app no se actualiza tras subir una versión nueva**: al abrirla, en cuanto detecta
  los archivos nuevos aparece abajo del todo un aviso — "Hay una versión nueva de la
  app" con un botón **Actualizar**. Pulsándolo espera (mostrando el motivo si hace
  falta esperar: una ventana abierta, un guardado pendiente, cambios sin subir…) hasta
  20-25 segundos como máximo; si en ese tiempo lo único que faltaba era subir cambios
  pendientes, la propia app intenta terminarlo por su cuenta. Solo entonces se aplica
  de verdad y la app se recarga sola. Si algo lo impide, el botón vuelve a mostrar
  **Reintentar** con el motivo debajo — nunca se queda encallado en "Actualizando…".
  Si no ha aparecido el aviso, ciérrala del todo y vuelve a abrirla para que compruebe
  si hay una versión nueva. Comprueba la versión al pie de Ajustes para confirmar que se actualizó.
- **Cambios que no aparecen en el otro dispositivo**: pulsa el indicador de sincronización para forzarla.
- **El icono de la pantalla de inicio sigue siendo el viejo**: bórralo y vuelve a añadirlo
  desde Safari; iOS no lo refresca solo.


## Recuperación y mantenimiento (Fase 7)

- **Descargar copia** exporta colección completa, metadatos, imágenes locales y borrados; no incluye
  ajustes, tokens ni claves. En iPhone comprueba que la hoja de compartir termina guardando el archivo.
  Cancelar la hoja no marca una copia como exportada. Conserva varias fechas fuera del navegador.
- **Restaurar copia** valida formato, versión, IDs y registros de borrado antes de cambiar nada.
  Pide confirmar la fusión y permite recuperar también fichas borradas desde aquella copia. Antes
  guarda el estado actual. Si no se puede crear esa copia previa, cancela la restauración.
  La fusión puede actualizar campos existentes; no equivale a reemplazar toda la colección por una fecha.
- **Copia anterior a la última operación** descarga el estado anterior a restaurar, cambiar conexión
  o vaciar. Es un único punto local, reemplazado en la siguiente operación; no sustituye copias externas.
  Descárgalo antes de otra operación. Para deshacer un borrado, impórtalo y acepta recuperar las fichas.
- Se puede importar una copia sin token para consultarla localmente; al conectar se fusiona con GitHub.
- **Proteger almacenamiento local** solicita persistencia al navegador. Safari/iOS puede no concederla;
  borrar datos del sitio sigue borrando también copias locales. La app avisa si el almacenamiento se llena.
- Ante token caducado o error de red, exporta primero los cambios locales. Renueva la credencial con el
  mismo destino y sincroniza. No vacíes la colección para solucionar un problema de conexión.
- Ante pérdida del dispositivo, revoca sus credenciales, conecta otro dispositivo al repositorio privado
  y restaura la última copia si faltan cambios. El historial de GitHub es una segunda vía de recuperación.
- Antes de actualizar: confirma «Al día» y conserva una copia reciente. Después: verifica en Ajustes
  `2026.09.25-phase10.4`. La caché de esta versión es `discoteca-v59`; nunca incluye JSON de colección.

Las pruebas de Fase 7 cubren almacenamiento de claves, censura de diagnósticos, rutas inválidas,
validación de copias, falta de espacio, recuperación de borrados, API privada para archivos grandes,
respuestas corruptas, bloqueo de sincronización al cambiar ajustes y aislamiento de caché.


### Descubrimiento práctico (Fase 8)

Explorar permite elegir Todos, Vinilo o CD y recorrer propuestas de seis en seis. «Ver más»
recorre los candidatos sin repetir hasta terminar; «Volver al principio» inicia otra vuelta.
Los cinco modos conservan su criterio y muestran una explicación si no hay candidatos.
«Para hoy» también funciona con colecciones pequeñas y discos sin portada.
El botón junto a cada disco registra la escucha de hoy y permite quitarla sin abrir la ficha.
No reproduce audio. El historial usa la sincronización habitual; los filtros y la tanda son temporales.
Las escuchas, favoritas y cambios de propuestas tienen feedback breve, desactivado con movimiento reducido.
No se modifica datos.json en esta entrega ni se migra la estructura de la colección.


### Sesiones retomables (Fase 9)

«Qué escucho ahora» conserva el modo, los minutos, el filtro y los discos elegidos.
Abre una ficha y usa «Volver a mi sesión», Atrás o Cerrar para regresar a la misma selección.
Las escuchas de hoy muestran el progreso y se pueden marcar o deshacer desde la sesión.
Cambiar de modo conserva la selección de cada modo; cambiar tiempo/filtro genera una nueva.
«Terminar sesión» borra la selección temporal, pero conserva todas las escuchas.

La selección se guarda solo en esta pestaña (sessionStorage): sobrevive a recargas, no se sincroniza
entre dispositivos y puede desaparecer al cerrar la pestaña/PWA. Contiene IDs y preferencias,
no fichas ni claves, y se invalida si cambia el destino de datos. Si el navegador no permite
almacenarla, la pantalla avisa y mantiene una copia en memoria. Los discos borrados o pasados a
deseos se excluyen al retomar; las fichas se leen siempre de la colección actual.
