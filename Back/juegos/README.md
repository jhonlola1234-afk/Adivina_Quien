# Adivina Quien - Backend

Java 21, Spring Boot 4.1.1, Maven y JPA. El servidor controla identidades, reglas y persistencia; nunca devuelve entidades con secretos directamente.

## Ejecutar y probar

Desde esta carpeta en Windows:

```powershell
.\mvnw.cmd spring-boot:run
.\mvnw.cmd test
.\mvnw.cmd package
```

En Linux/macOS usar `./mvnw`. API por defecto: `http://localhost:8080/api`; salud: `GET /api/health`. Iniciar el frontend en otra terminal con `npm run dev` desde `../../front`.

## Base de datos

Por defecto se utiliza H2 en archivo `./data/adivina_quien` relativo al directorio de arranque. Mantener esa carpeta en almacenamiento persistente y no guardarla en Git ni OneDrive para un despliegue real. Los datos, secretos y hashes de sesiones se conservan al reiniciar el servidor; la recuperacion requiere que el cliente conserve su token.

Para MySQL, crear la base `adivina_quien`, configurar `DB_URL`, `DB_USER` y `DB_PASSWORD` en el entorno y ejecutar:

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=mysql"
```

No almacenar credenciales reales en archivos versionados. El perfil MySQL no fue validado en este entorno; las pruebas usan H2 en memoria. Hibernate `ddl-auto=update` es para desarrollo: antes de produccion, usar migraciones versionadas y `validate`.

## Contrato HTTP

Todas las respuestas de sala llevan `{room, self}`. `room.players` no contiene secretos ni tokens. `self` contiene solo mi personaje y mis descartes. El historial muestra la opcion acusada y su resultado, no los secretos sin descubrir. Los tokens se generan con 256 bits aleatorios; en base de datos se almacena SHA-256 del token, no su valor original.

Crear/unirse devuelve `{token, session}`. Usar `Authorization: Bearer <token>` para todas las acciones posteriores. Nunca usar un ID de jugador como autenticacion. Consultar `GameDtos` para los cuerpos exactos.

| Metodo | Ruta desde /api | Cuerpo | Resultado |
| --- | --- | --- | --- |
| GET | /health | - | Salud |
| GET | /categories | - | Cinco categorias con 20 opciones |
| POST | /rooms | name, category | Token y sesion del anfitrion |
| POST | /rooms/{code}/join | name | Token y sesion del invitado |
| GET | /rooms/{code}/session | - | Sala publica y estado privado |
| PUT | /rooms/{code}/secret | secret | Elegir antes de iniciar |
| POST | /rooms/{code}/start | - | Solo anfitrion, todos listos |
| POST | /rooms/{code}/pass | revision | Consumir turno |
| POST | /rooms/{code}/accuse | targetId, secret, revision | Acusacion autoritativa |
| PUT | /rooms/{code}/discards | targetId, characterId, discarded | Descarte idempotente privado |
| POST | /rooms/{code}/discards/reset | targetId | Restaurar mi tablero de ese rival |
| POST | /rooms/{code}/leave | - | Revocar sesion; 204 |
| POST | /rooms/{code}/rematch | - | Anfitrion, partida terminada |
| POST | /rooms/{code}/kick | targetId | Retirar invitado desconectado en espera |

Los cambios se serializan por bloqueo pesimista de sala en una transaccion. Las acciones de turno requieren la revision recibida; una accion repetida o atrasada se rechaza, nunca se repite automaticamente. Un fallo de acusacion no elimina a nadie. Seleccion repetida permitida. Los secretos deben pertenecer al catalogo de la sala.

Estados: `lobby`, `playing`, `finished`, `closed`. Una consulta autenticada actualiza presencia. Los turnos duran tres minutos y se comprueba su vencimiento al consultar/actuar, sin tarea programada. Una desconexion no elimina automaticamente al jugador; salir si lo elimina durante la partida. Se conserva a los eliminados como espectadores. La salida del anfitrion transfiere su rol.

## Seguridad y limites de publicacion

- Configurar HTTPS y un proxy confiable; HTTP local no protege el token en transito.
- CORS acepta solo `GAME_ALLOWED_ORIGINS`, separados por comas; por defecto localhost/127.0.0.1:5173. CORS no reemplaza la autenticacion.
- La sesion del frontend usa `sessionStorage`, accesible a scripts del mismo origen. Para publicacion, definir CSP y revisar XSS; valorar cookies HttpOnly con proteccion CSRF si se cambia la arquitectura de sesiones.
- No hay cuentas, recuperacion por nombre, limites de peticiones/IP, limpieza de salas antiguas ni moderacion. Configurar rate limiting, limites de cuerpo, retencion y copias de seguridad antes de exposicion publica.
- Los codigos de sala son invitaciones, no contraseñas. Compartirlos solo con el grupo.
- Las respuestas usan `Cache-Control: no-store`; no registrar cabeceras Authorization ni cuerpos con secretos.
- La base de datos contiene secretos de partida. Limitar acceso y proteger volumen/backups.

## Organizacion

La logica funcional nueva esta bajo `com.adivinaquien.juegos.game`. Los modelos/controllers/service iniciales se conservan por compatibilidad, pero no son los endpoints de la partida. Las tablas nuevas usan prefijo `game_` y no alteran datos existentes de las tablas originales.

`GameServiceTests` cubre reglas, privacidad, descartes, anfitrion, sesiones, concurrencia, limite de jugadores y turnos vencidos. `GameHttpTests` recorre HTTP real y valida CORS, datos y cache. `JuegosApplicationTests` comprueba el arranque.