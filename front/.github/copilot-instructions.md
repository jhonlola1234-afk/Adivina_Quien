# Proyecto

- Frontend React JavaScript con Vite y lucide-react.
- Interfaz en español, blanco, morado y azul.
- Una categoria por sala, 20 personajes por categoria, maximo 12 jugadores.
- Secretos elegidos por jugadores; se permiten duplicados.
- Acertar elimina solo al rival acusado; fallar consume el turno. Gana el ultimo activo.
- Mantener reglas puras de demostracion en src/game.js y pruebas con node:test.
- Partidas reales controladas por backend Spring vecino en ../Back/juegos. El cliente usa src/server-room.js, tokens privados y polling HTTP; no BroadcastChannel.
- No devolver secretos ajenos ni confiar en IDs de cliente para autenticar. Persistir descartes por jugador y rival.
- H2 persistente por defecto, perfil MySQL configurable. No afirmar que esta desplegado en Internet ni listo para produccion.
- Validar frontend con npm test y npm run build; E2E con npm run test:e2e y backend activo. Backend con mvnw.cmd test.

# Configuracion completada

- Requisitos y estructura preparados.
- Interfaz, catalogo y reglas implementados.
- No se requieren extensiones adicionales.
- Comandos y limitaciones documentados en README.md.