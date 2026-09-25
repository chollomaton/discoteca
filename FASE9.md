# Fase 9: sesiones de escucha retomables

Continuación de la propuesta de FASE8.md: conservar modo, tiempo, filtro y discos elegidos en «Qué escucho ahora»; volver desde una ficha sin reconstruir la selección; mostrar progreso de escuchas de hoy y permitir terminar la sesión.

La selección se conserva en esta pestaña mediante sessionStorage (con respaldo en memoria si no está disponible), separada por destino de datos. Solo almacena IDs y preferencias, nunca fichas ni claves. No se sincroniza ni modifica datos.json. Las escuchas usan la lógica existente. Mantener ambos modos, móvil 390 px, escritorio, PWA y prefers-reduced-motion.

## Entregado y validación

- Sesión por pestaña: modo, minutos, filtro y referencias a discos, con validación y respaldo en memoria.
- Vuelta desde ficha mediante botón, cierre o Escape; selección conservada al alternar modos o recargar.
- Progreso de escuchas de hoy, minutos pendientes calculados con las pistas y registro/deshacer en la sesión.
- Terminar elimina la selección temporal y conserva escuchas. Bajas y cambios de destino invalidan referencias.
- Reutiliza las microanimaciones de Fase 8, sin movimiento continuo y con movimiento reducido respetado.
- VERSION `2026.09.25-phase9`, CACHE `discoteca-v55`; datos.json y esquema de sincronización intactos.

Validación: validate.mjs y las nueve baterías scripts/*tests.mjs, incluida phase9-tests.mjs.
Pruebas interactivas en navegador a 390×844 y 1440×1000: abrir/volver, Escape, recarga,
alternancia de modos, marcar/deshacer, terminar, ausencia de errores y desbordamiento.
No probado en un iPhone físico. La selección es local a la pestaña y puede desaparecer al cerrarla.

## Siguiente propuesta

Afinar el ajuste de las sesiones al tiempo disponible y explicar con claridad cuándo una selección
excede el objetivo o faltan duraciones. El algoritmo actual conserva el margen de hasta cinco minutos
o un 12 % de Fase 6. Se propone estudiarlo como siguiente mejora, sin alterar datos bibliográficos.

