# Fase 8: descubrimiento práctico y feedback de escucha

Alcance concretado tras revisar la app y a petición del propietario: evolucionar Explorar con filtros por formato, tandas que permitan recorrer los candidatos sin repeticiones evitables, estados vacíos útiles y registro de escucha desde la selección. Añadir microanimaciones breves en Explorar, escucha y favoritas, respetando movimiento reducido.

Mantener los cinco modos, las portadas como protagonistas, datos locales y compatibilidad Mac/iPhone/PWA. No cambiar datos.json ni el esquema de sincronización. Validar todas las baterías y revisar 390 px y escritorio antes de ready/merge.

## Entregado

- Cinco modos con filtros Todos/Vinilo/CD, tandas de seis y recorrido completo sin duplicados.
- «Para hoy» admite colecciones pequeñas y discos sin portada. Viaje por décadas recorre todas las fichas con año.
- Escucha de hoy reversible desde Explorar, usando la persistencia y fusión existentes.
- Feedback de 180–240 ms al cambiar propuestas, marcar escucha y alternar favoritas; sin bucles y desactivado con prefers-reduced-motion.
- Estados vacíos explicativos, foco conservado en «Ver más», controles de 44 px y estado accesible de filtros/favoritas.
- VERSION `2026.09.25-phase8`, CACHE `discoteca-v54`; datos.json intacto.
- CI omite el trabajo durante draft y ejecuta la batería completa al pasar a ready y en main.

## Validación

`node scripts/validate.mjs` y las ocho baterías `scripts/*tests.mjs`, incluida phase8-tests.mjs.
Revisión interactiva de navegador a 390×844 y 1440×1000 con copia local de la colección, sin credenciales:
selecciones, filtros, tandas distintas, escucha/deshacer, navegación a ficha, favoritas y ausencia de desbordamiento.
La prueba de movimiento reducido verifica que no se invoca ninguna animación; no se ha probado un iPhone físico.

## Siguiente propuesta

Sesiones de escucha retomables: estudiar cómo conservar una selección al abrir fichas y volver,
sin duplicar «Qué escucho ahora» ni introducir otra estructura sincronizada innecesaria.
Es una propuesta para la siguiente fase, no una función entregada aquí. Sigue pendiente por separado
la migración privada descrita en LEEME.md, que requiere configurar cada dispositivo.
