# Fase 9: sesiones de escucha retomables

Continuación de la propuesta de FASE8.md: conservar modo, tiempo, filtro y discos elegidos en «Qué escucho ahora»; volver desde una ficha sin reconstruir la selección; mostrar progreso de escuchas de hoy y permitir terminar la sesión.

La selección se conserva en esta pestaña mediante sessionStorage (con respaldo en memoria si no está disponible), separada por destino de datos. Solo almacena IDs y preferencias, nunca fichas ni claves. No se sincroniza ni modifica datos.json. Las escuchas usan la lógica existente. Mantener ambos modos, móvil 390 px, escritorio, PWA y prefers-reduced-motion.
