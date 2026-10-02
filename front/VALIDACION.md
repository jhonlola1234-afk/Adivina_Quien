# Validacion del juego

Fecha: 2026-10-02. Entorno: Windows, Java 21.0.8, Node 24.14.0, Spring Boot 4.1.1.

## Resultado

| Comprobacion | Comando o accion | Resultado |
| --- | --- | --- |
| Backend | mvnw.cmd test | 11 pruebas, 0 fallos, salida 0 |
| Frontend | npm test | 11 pruebas, 0 fallos, salida 0 |
| Bundle | npm run build | Correcto, salida 0 |
| Navegadores y HTTP | npm run test:e2e | 3 recorridos, 0 fallos, salida 0 |
| Reinicio | Reiniciar Spring y recargar sesion existente | Sala, ganador, secreto, historial y descartes recuperados |
| Movil | Vista 390 x 844 en prueba de privacidad | Sin desbordamiento horizontal |

## Cobertura

- Partida entre navegadores con almacenamiento aislado, seleccion repetida, fallo que consume turno, eliminacion del rival señalado, ganador y revancha.
- Recarga de la misma pestaña con recuperacion de secreto y descartes por rival; los descartes no aparecen para el otro jugador.
- DTO publico sin secretos ni hashes de tokens, acceso sin token rechazado, token de otro jugador/sala rechazado y salida que revoca la sesion.
- Limite de 12 jugadores bajo entradas simultaneas, una sola acusacion procesada ante solicitudes duplicadas, estados/listos/categoria/turnos validados por servidor.
- Turno vencido, transferencia de anfitrion, retiro de invitado desconectado en espera y CORS de origen explicito.
- Cinco categorias y 20 opciones por categoria.

## Herramientas y limites

Chromium instalado con `npx playwright install chromium`. Base usada en las pruebas Java: H2 en memoria; servidor ejecutado: H2 en archivo. Docker no esta instalado. El perfil MySQL no se ha probado y requiere verificar SQL/esquema y concurrencia con esa base antes de usarlo.

La prueba de reinicio fue una comprobacion manual del servidor y la sesion existente, no parte de los tres archivos E2E. Las imagenes son externas y pueden faltar; Goten y Chaoz muestran respaldo por nombre si no hay miniatura disponible.

Validacion funcional para desarrollo/red local, no certificacion de seguridad de produccion. No se realizaron pruebas de carga, pentesting, despliegue externo ni verificacion de HTTPS. Antes de Internet: proxy HTTPS, rate limiting, CSP, migraciones, almacenamiento persistente, retencion de salas y backups. Las sesiones del cliente estan en sessionStorage; no hay cuentas ni recuperacion si se pierde el token.

Las pruebas de navegador requieren backend activo en 8080; Playwright arranca o reutiliza Vite en 5174. Las pruebas de API crean y retiran jugadores de prueba; no borran partidas ajenas.