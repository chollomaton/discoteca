# Discoteca

Catálogo de vinilos y CDs que funciona igual en el Mac y en el iPhone, con los datos
guardados en tu propio repositorio de GitHub. Sin servidor propio: la aplicación es
un único archivo, y tu colección se sincroniza como un `datos.json` en GitHub.

**Versión de esta entrega:** 2026.09.19-revision2 — se comprueba en Ajustes, al final de todo.

## Qué hay en esta carpeta

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La aplicación completa |
| `datos.json` | Tu colección: 206 discos en colección y 14 en deseos. Es el único archivo que se sincroniza |
| `manifest.webmanifest` | Permite instalarla con su icono |
| `sw.js` | Hace que abra al instante y funcione sin cobertura |
| `icon-192-v2.png`, `icon-512-v2.png`, `apple-touch-icon-v2.png` | Iconos |
| `zxing-0.21.3.js` | El lector de códigos de barras del escáner. Antes se traía de un servicio externo cada vez que se abría; ahora vive en tu propio repositorio, así tu app no depende de nada de fuera para escanear |

Sube siempre estos **siete archivos** juntos cuando actualices — todos menos `datos.json`,
que no se toca nunca al subir una versión nueva de la aplicación.

---

## Paso 1 · Publicar la aplicación (una sola vez, 5 minutos)

1. Entra en [github.com/new](https://github.com/new) y crea un repositorio llamado **`discoteca`**.
   Márcalo como **Public** (los repositorios privados no permiten publicar páginas en el plan gratuito).
2. En el repositorio recién creado pulsa **Add file › Upload files** y arrastra **los ocho archivos**
   de esta carpeta (esta primera vez sí incluye tu `datos.json`). Abajo pulsa **Commit changes**.
3. Ve a **Settings › Pages**. En *Source* elige **Deploy from a branch**, rama **main**, carpeta **/ (root)**
   y pulsa **Save**.
4. Espera un minuto. Tu aplicación estará en:

   `https://TU-USUARIO.github.io/discoteca/`

---

## Paso 2 · Crear el token de GitHub (una sola vez)

El token es lo que permite a la aplicación guardar los cambios en tu repositorio. Es
obligatorio; sin él, la aplicación se abre en **modo consulta**: se puede mirar y buscar,
pero no editar.

1. Entra en [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
2. **Token name**: `discoteca`
3. **Expiration**: elige **1 año**, no *No expiration*. Cuesta un minuto renovarlo cuando toque, y así, si alguna vez
   se filtrara sin que te dieras cuenta, deja de servir por sí solo en vez de quedar abierto para siempre.
4. **Repository access**: *Only select repositories* → selecciona **discoteca**.
5. **Permissions › Repository permissions**: busca **Contents** y ponlo en **Read and write**.
6. Pulsa **Generate token** y **copia el código** que aparece. Solo se muestra una vez.
   Guárdalo en tu gestor de contraseñas: lo necesitarás también en el iPhone.

**Qué puede hacer alguien que consiguiera este token, con honestidad:** solo puede leer y escribir en el
repositorio `discoteca`, nada más de tu cuenta de GitHub; el token está limitado a ese único repositorio.
Con eso podría leer tu colección entera, o reescribir el `index.html` que se sirve a quien abra la web —tú
incluido, la próxima vez—. No puede tocar tus otros repositorios ni la configuración de tu cuenta.

**Cómo viaja y cómo se guarda:** en cada petición a GitHub va en la cabecera `Authorization`, nunca en la
URL ni en ningún mensaje de error o en el registro de fallos de Ajustes. Pero no está cifrado: se guarda
en claro en el dispositivo (IndexedDB, con una copia en localStorage) para que la aplicación pueda usarlo
sin pedírtelo cada vez. Eso quiere decir que **cualquier script que llegara a ejecutarse en esa página**
—no solo alguien con acceso físico al Mac o al iPhone— podría leerlo, igual que en cualquier aplicación
web que guarda una credencial en el navegador para no depender de un servidor propio. Revoca el token
desde GitHub si pierdes o vendes el dispositivo, o si notas algo raro en el repositorio.

---

## Paso 3 · Conectar el Mac

1. Abre `https://TU-USUARIO.github.io/discoteca/` en Chrome.
2. Ve a la pestaña **Ajustes › Conectar** (o pulsa el indicador de sincronización de arriba).
3. Rellena: usuario, repositorio (`discoteca`), rama (`main`), archivo (`datos.json`) y pega el token.
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
  - **Qué escucho ahora**: eliges cuánto tiempo tienes y arma una sesión con discos
    reales que encajan en ese tiempo, con los filtros que quieras (no escuchados,
    favoritos, vinilo, CD…).
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
- Si has editado en los dos sitios, **se fusiona ficha por ficha**: de cada disco se conserva la
  versión modificada más recientemente. No hay que elegir entre una copia y otra.
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
configuran en **Ajustes › Conectar** y se guardan solo en el dispositivo, igual que
el token. Sin ninguna de ellas la aplicación funciona con normalidad; cada una
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
- **La app no se actualiza tras subir una versión nueva**: cierra del todo la aplicación
  y vuelve a abrirla; el service worker recarga la nueva versión en el segundo arranque.
  Comprueba la versión al pie de Ajustes para confirmar que se actualizó.
- **Cambios que no aparecen en el otro dispositivo**: pulsa el indicador de sincronización para forzarla.
- **El icono de la pantalla de inicio sigue siendo el viejo**: bórralo y vuelve a añadirlo
  desde Safari; iOS no lo refresca solo.
