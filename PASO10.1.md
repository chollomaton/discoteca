# Paso 10.1 — Ajuste temporal de Qué escucho ahora

La selección compara combinaciones por segundos dentro del margen existente (5 min o 12 %), prioriza la menor distancia y, en empate, no exceder el objetivo. Conserva la preferencia por variedad entre estados equivalentes y la mezcla inicial.

Muestra duración prevista, objetivo, exceso exacto y duraciones incompletas. Nuevas selecciones por tiempo usan solo discos con todas sus pistas de duración válida y positiva. Sesiones antiguas siguen mostrando sus discos, con total parcial indicado como «al menos». No cambia datos.json, sincronización, modos, almacenamiento de sesión ni animaciones.

VERSION: 2026.09.25-phase10.1. CACHE: discoteca-v56.

Validación: validate.mjs y diez baterías scripts/*tests.mjs, incluida step10-1-tests.mjs (cinco objetivos, filtros, segundos, empates, exceso, datos incompletos, inmutabilidad y comparación exhaustiva de 40 colecciones pequeñas). Navegador local en Mac: 390×844 y 1440×1000, duración visible, ficha/Escape y recarga con selección conservada. Ejemplo real: 59 min 56 s de 60 min. No probado en iPhone físico ni Safari/PWA instalada. El margen máximo anterior se conserva; no se cortan discos ni se inventan duraciones.

CI ahora también valida PR draft, para comprobarlo antes de marcar ready.
