# Fase 7: privacidad, seguridad y recuperación

Aplicación: `2026.09.25-phase7`. Caché: `discoteca-v53`.

## Entregado

- Compatibilidad con datos en otro repositorio privado, incluido JSON grande mediante API autenticada.
- Inicio sin descargar el JSON público; conservación de la colección local de instalaciones previas.
- Claves por sesión o recordadas expresamente en IndexedDB; respaldo sin secretos y migración compatible.
- CSP sin JavaScript inline, referrer desactivado y diagnósticos censurados.
- Configuración validada, visibilidad del repositorio comprobada y cambios de destino protegidos.
- Copias completas, validación antes de importar, copia previa automática y recuperación de borrados.
- Solicitud de almacenamiento persistente y aviso ante falta de espacio.
- Caché limitada a los archivos de la app y limpieza restringida a sus propias versiones.
- CI ampliado a aperturas/actualizaciones de PR e incorporación de phase7-tests.mjs.

## Límite de privacidad y acciones pendientes del propietario

`datos.json` no se modifica en esta entrega. Sigue siendo público en el repositorio actual y su
historial. La separación funcional está implementada; la migración de los dispositivos exige crear
un repositorio privado y configurar un token limitado a él. Consulta LEEME.md. No se han generado,
leído ni publicado credenciales reales. No se reescribe historial ni se borran datos públicos.

## Validación

Ejecutar `node scripts/validate.mjs` y todas las baterías `scripts/*tests.mjs`. Las pruebas incluyen
red y almacenes simulados; no escriben datos reales. La verificación visual se hace sobre una copia
local sin credenciales. Los tamaños móviles no sustituyen una prueba en un iPhone físico.

## Continuidad del proyecto

Esta tarea es el brazo técnico de Discoteca. Los requisitos y próximas fases se deciden en el chat
principal APP DISCOTECA. Las futuras tareas deben partir del main actual, trabajar en rama y PR draft,
conservar datos, ejecutar todas las pruebas y fusionar solo tras CI verde. La siguiente actuación
recomendada es completar y verificar la migración privada; no se define una Fase 8 sin decisión del usuario.
