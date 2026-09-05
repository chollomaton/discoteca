# Discoteca

Catálogo de vinilos y CDs que funciona igual en el Mac y en el iPhone, con los datos
guardados en tu propio repositorio de GitHub.

## Qué hay en esta carpeta

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La aplicación completa |
| `datos.json` | Tu colección: 168 discos. Es el archivo que se sincroniza |
| `manifest.webmanifest` | Permite instalarla con su icono |
| `sw.js` | Hace que abra al instante y funcione sin cobertura |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Iconos |

---

## Paso 1 · Publicar la aplicación (una sola vez, 5 minutos)

1. Entra en [github.com/new](https://github.com/new) y crea un repositorio llamado **`discoteca`**.
   Márcalo como **Public** (los repositorios privados no permiten publicar páginas en el plan gratuito).
2. En el repositorio recién creado pulsa **Add file › Upload files** y arrastra **los siete archivos**
   de esta carpeta. Abajo pulsa **Commit changes**.
3. Ve a **Settings › Pages**. En *Source* elige **Deploy from a branch**, rama **main**, carpeta **/ (root)**
   y pulsa **Save**.
4. Espera un minuto. Tu aplicación estará en:

   `https://TU-USUARIO.github.io/discoteca/`

---

## Paso 2 · Crear el token (una sola vez)

El token es lo que permite a la aplicación guardar los cambios en tu repositorio.

1. Entra en [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
2. **Token name**: `discoteca`
3. **Expiration**: elige **No expiration** para no tener que renovarlo nunca.
4. **Repository access**: *Only select repositories* → selecciona **discoteca**.
5. **Permissions › Repository permissions**: busca **Contents** y ponlo en **Read and write**.
6. Pulsa **Generate token** y **copia el código** que aparece. Solo se muestra una vez.
   Guárdalo en tu gestor de contraseñas: lo necesitarás también en el iPhone.

---

## Paso 3 · Conectar el Mac

1. Abre `https://TU-USUARIO.github.io/discoteca/` en Chrome.
2. Ve a la pestaña **Archivo › Configurar ahora**.
3. Rellena: usuario, repositorio (`discoteca`), rama (`main`), archivo (`datos.json`) y pega el token.
4. Pulsa **Probar** para comprobar la conexión y luego **Guardar y sincronizar**.

A partir de ese momento, cada cambio se sube solo a los pocos segundos.

---

## Paso 4 · Instalar en el iPhone

1. Abre la misma dirección en Chrome en el iPhone.
2. Pulsa el botón de compartir y elige **Añadir a pantalla de inicio**.
3. Ábrela desde el icono: se ve a pantalla completa, sin barra del navegador.
4. Entra en **Archivo › Configurar** y pega el mismo token que usaste en el Mac.

Ya está. El botón azul del centro de la barra inferior abre el escáner.

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

El token se guarda **solo en cada dispositivo**, nunca se sube al repositorio.

---

## Importar un CSV de Discogs

En **Archivo › Importar CSV de Discogs**. Nunca se machaca nada:

- Lo que **ya tienes exactamente igual** se descarta y tu ficha queda intacta.
- Lo que es **claramente nuevo** se añade.
- Lo **dudoso** (misma obra en otra edición, mismo número de catálogo, títulos casi iguales) se te
  muestra uno a uno, comparando tu ficha con la del CSV, con tres opciones:
  **mantener la mía**, **sustituir** o **guardar las dos**.
  Al sustituir se conservan la portada, el tracklist, las etiquetas y las escuchas que ya tenías.
  Hay una casilla para aplicar la misma decisión al resto.

---

## Detalles útiles

- **Escaneo**: en el iPhone se usa un lector propio porque Safari no trae el del sistema. Si la luz
  no acompaña, puedes hacer una foto del código o teclearlo.
- **Completar fichas**: los datos vienen de Apple Music, MusicBrainz y Cover Art Archive.
  MusicBrainz limita a una consulta por segundo, así que completar muchos discos de golpe va despacio.
- **Cuando falle la búsqueda**: en la ficha, botón **Ediciones** para elegir el prensado con su portada,
  o **··· › Fijar edición por URL** para pegar el enlace exacto de MusicBrainz.
- **Copias de seguridad**: aunque todo esté en GitHub (con su historial de versiones), en
  **Archivo › Copia de seguridad** puedes descargar un JSON. En el iPhone se abre la hoja de compartir.
- **Atajos en el Mac**: `⌘K` buscar, `⌘S` sincronizar, `/` filtrar, `n` nuevo disco, `r` disco al azar,
  `1`–`4` cambiar de pestaña.

## Si algo va mal

- **"Token no válido"**: el token caducó o no tiene el permiso *Contents: Read and write*. Crea otro.
- **La app no se actualiza tras subir una versión nueva**: cierra y vuelve a abrir; el service worker
  recarga la nueva versión en el segundo arranque.
- **Cambios que no aparecen en el otro dispositivo**: pulsa el indicador de sincronización para forzarla.
