# Adivina Quien

Juego para grupos de 2 a 12 personas. Una categoria por sala, personajes secretos elegidos por cada jugador y preguntas por Discord o Teams. Los personajes pueden repetirse. Acertar una acusacion elimina solo al rival señalado; fallar consume el turno. Gana el ultimo jugador activo.

## Estructura

- `front/`: frontend React + Vite con sala de espera, seleccion secreta, descartes por rival, turnos, acusaciones, reconexion y revancha.
- `Back/juegos/`: servidor Java 21 + Spring Boot + JPA. Base H2 persistente por defecto; perfil MySQL disponible.

## Frontend

```sh
cd front
npm install
npm run dev
```

Validacion: `npm test` y `npm run build`. Consultar [front/README.md](front/README.md) para detalles.

## Backend

Requiere Java 21. No es necesario instalar MySQL para empezar: H2 guarda datos en `Back/juegos/data/` cuando se arranca desde esa carpeta. Para usar MySQL, consultar [Back/juegos/README.md](Back/juegos/README.md). No publicar contraseñas ni credenciales reales.

En Windows, desde `Back/juegos/`:

```powershell
.\mvnw.cmd spring-boot:run
```

## Estado actual

El juego usa el servidor para partidas de 2 a 12 jugadores. Los secretos y los descartes privados se guardan en base de datos. Cada jugador tiene una sesion privada; recargar la misma pestaña recupera la partida. La sala se actualiza cada dos segundos mediante HTTP. El anfitrion puede iniciar y preparar revancha; al abandonar se transfiere el rol. El turno vencido avanza tras tres minutos al consultar el servidor.

Para jugar en red local, iniciar ambos proyectos y usar la direccion Network del frontend con `npm run dev -- --host 0.0.0.0`. Para Internet, todavia hace falta desplegar con HTTPS, origenes permitidos, base persistente y protecciones frente a abuso. No usar el servidor de desarrollo Vite como hosting de produccion.

## Validacion

Backend: `.\mvnw.cmd test` desde `Back/juegos/`. Frontend: `npm test`, `npm run build` y `npm run test:e2e` desde `front/`. E2E requiere backend en 8080 y Chromium instalado con `npx playwright install chromium`. Detalles en [front/README.md](front/README.md) y [Back/juegos/README.md](Back/juegos/README.md).

Las imagenes usan fuentes externas y cuentan con respaldo por nombre cuando no cargan. Revisar licencias y atribuciones antes de publicar el juego.