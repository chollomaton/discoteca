# Paso 10.2 — Saneamiento arquitectónico

Base: main 28017f62c3645b412bd2fcb3103d41329bfcedc7 (10.1).

Extracción literal, conservando APIs globales y cuerpos de funciones:

- js/transfer.js: CSV, revisión de importaciones, backups/recuperación y fusión de duplicados (484 líneas, 26.586 bytes).
- js/metadata.js: Wikipedia, datos ampliados de MusicBrainz, Discogs, ficha técnica, consistencia de identificadores y revisión/enriquecimiento (673 líneas, 36.011 bytes).
- js/library.js: 3.264 → 2.781 líneas; 175.589 → 149.093 bytes.
- js/features.js: 3.159 → 2.487 líneas; 170.196 → 134.280 bytes. Inventario, artista, Radar y sesiones permanecen aquí.

CSS: consolida las reglas consecutivas de .tabs y .tabs button y elimina la primera .tabs button.on, completamente sobrescrita. Conserva todos los valores efectivos, incluido border-radius:9px del contenedor. Sin otros cambios de diseño.

Orden: core, library, transfer, features, metadata, insights, stats, settings, bootstrap. Coincide en index.html, APP_JS_FILES y SHELL.

VERSION: 2026.09.25-phase10.2. CACHE: discoteca-v57. core.js cambia exclusivamente VERSION. Sin cambios en sincronización, seguridad, datos.json ni lógica del service worker.

Validación: validate.mjs, diez baterías anteriores y step10-2-tests.mjs. Esta última verifica orden, responsabilidades, carga independiente de scripts, APIs globales, CSV, duplicados sin mutación y metadata con respuesta controlada. Límites preventivos: library ≤160.000 bytes/3.000 líneas; features ≤145.000 bytes/2.700 líneas.

Comparación visual automatizada en Chromium: baseline 10.1 y HEAD, colección local de 220 discos, 1440×1000 y 390×844; colección, ficha, importación, ficha técnica y revisión. Las llamadas externas se bloquean para comparar contenido determinista sin escribir datos remotos. Las capturas quedan como artifact de CI. No equivale a probar iPhone/Safari físicos ni servicios externos en vivo. No incluye 10.3.
