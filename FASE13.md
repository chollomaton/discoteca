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