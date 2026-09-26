# Fase 13 · Producto

Objetivo: mejorar Discoteca sin comprometer la versión estable de `main`, sin tocar `datos.json` y sin publicar versiones parciales.

## Contrato de trabajo

- Todo el desarrollo se realiza en `fase-13-producto`.
- `main` permanece estable hasta superar la puerta final.
- `datos.json` no se modifica durante la fase.
- No se incrementa la versión ni la caché PWA hasta el cierre.
- Cada cambio funcional debe conservar las pruebas existentes y añadir cobertura cuando introduzca un contrato nuevo.
- No se añaden dependencias remotas de ejecución.
- Las mejoras deben ser reversibles y compatibles con los datos v4 actuales.

## 13.1 Rendimiento percibido

- Reducir trabajo innecesario al arrancar y repintados globales.
- Mantener respuesta fluida con 250, 1.000 y 5.000 discos.
- Evitar optimizaciones que cambien semántica o persistencia.

## 13.2 Biblioteca

- Mejorar búsqueda, filtros, orden persistente y acciones rápidas.
- Mantener navegación y estado al volver de una ficha.
- No ocultar resultados por heurísticas opacas.

## 13.3 Ficha de disco

- Mejorar jerarquía, navegación anterior/siguiente y tracklist.
- Reducir desplazamientos para acciones frecuentes.
- Conservar edición y accesibilidad por teclado.

## 13.4 Descubrimiento

- Reducir recomendaciones repetitivas.
- Usar historial, escuchados y puntuaciones sin crear perfiles externos.
- Mostrar una explicación breve y determinista de la recomendación.

## 13.5 Estadísticas

- Priorizar métricas accionables: colección, formatos, décadas, artistas, escuchados y pendientes.
- Evitar visualizaciones sin información adicional.

## 13.6 Calidad de datos

- Detectar duplicados probables, carátulas ausentes, campos incompletos y tracklists sospechosos.
- El diagnóstico nunca modifica datos automáticamente.

## 13.7 Backup y recuperación

- Mostrar estado/fecha del respaldo.
- Validar integridad antes de restaurar.
- Mantener checkpoint y restauración reversible.

## 13.8 PWA

- Evitar mezclas de assets entre versiones.
- Mantener `datos.json`, backups y peticiones autenticadas fuera de caché pública.
- Mejorar diagnóstico de actualización/offline sin alterar datos.

## 13.9 Mantenibilidad

- Extraer responsabilidades de módulos grandes solo cuando reduzca acoplamiento real.
- No modularizar por tamaño exclusivamente.
- Mantener funciones públicas existentes durante la migración.

## 13.10 Puerta final

Antes de integrar en `main` deben pasar:

1. pruebas de datos y persistencia;
2. sincronización y recuperación extrema;
3. importación/transferencia;
4. seguridad y privacidad;
5. arquitectura/PWA;
6. regresión funcional;
7. accesibilidad escritorio/móvil;
8. comparación visual;
9. UX/offline;
10. escala 250/1.000/5.000;
11. comprobación de que `datos.json` no cambió respecto al inicio de la fase.

Solo después se actualizan versión/caché, se repite la CI completa y se integra una única versión.

## Evidencias y decisiones de ejecución

- Datos iniciales de la rama: SHA-256 `46da5cd12915b45b11d368087c6290b9797a49f411302f6704bf00e3a2afc49b` (commit `3e338ac3d908dd09686cad38a2ec9e5cca83e318`).
- El usuario autorizó conservar los guardados posteriores de la colección en `main`. Las pruebas verifican tanto la inmutabilidad de los datos de la rama como que el merge de prueba mantiene los datos actuales de `main`.
- El usuario autorizó renovar las referencias visuales para la interfaz de Fase 13 después de revisar capturas. Se revisaron colección, ficha, importación, ficha técnica y revisión en 1440/390 del commit `336d036183c842be5bb6e4cc48d3906446dbb011`. Se conservan las dos suites, todas sus escenas, controles de overflow/errores y tolerancia de 5 píxeles con delta máximo 1/255.
- No se agregan dependencias de ejecución. `quality.js` aísla el diagnóstico puro. El manifiesto de módulos y sus pruebas incorporan explícitamente este módulo.
- `node scripts/phase13-shell-hashes.mjs` genera hashes del shell; `--check` los verifica. Debe ejecutarse tras cualquier cambio en un asset del shell. La instalación verifica todos los bytes antes de escribir y nunca activa automáticamente la actualización.
- Nuevos contratos: `phase13-contract-tests.mjs` (lógica, copias, integridad PWA y datos); `phase13-browser.mjs` (1440/390 × 250/1000/5000); `phase13-visual-review.mjs` (capturas de las escenas históricas).
- Rollback: conservar el primer padre del merge final; revertir únicamente el merge de producto con `git revert -m 1 <merge>`. No restaurar una copia antigua de `datos.json`. Para clientes PWA, cualquier despliegue de reversión necesita un identificador de caché nuevo y coherente con sus assets.

- Las comparaciones visuales esperan a que termine el reintento de portadas (900 ms), antes de capturar. Esto evita comparar un icono de imagen rota con su sustituto; no se altera ninguna tolerancia.
- Chromium de comparación usa rasterizado software sin optimizaciones Skia dependientes del runtime; ambas referencias comparten exactamente esa configuración. No se suaviza ni se filtra el resultado de las capturas.

## Cierre de implementación

La CI completa previa al incremento pasó en `339807162b92a0357b21d0e352fec9a0ec9eb402`: https://github.com/chollomaton/discoteca/actions/runs/36227444737. Solo entonces se incrementan VERSION a `2026.09.26-phase13` y CACHE de `discoteca-v60` a `discoteca-v61`, una sola vez. Las pruebas de versión siguen comprobando valores exactos. La integración requiere repetir la CI completa con estos valores.
