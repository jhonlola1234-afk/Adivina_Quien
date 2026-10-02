# Adivina Quien

Juego para grupos de 2 a 12 personas. Una categoria por sala, personajes secretos elegidos por cada jugador y preguntas por Discord o Teams. Los personajes pueden repetirse. Acertar una acusacion elimina solo al rival señalado; fallar consume el turno. Gana el ultimo jugador activo.

## Estructura

- `front/`: frontend React + Vite. Incluye cinco categorias con 20 opciones cada una, sala de espera, tablero de descartes por rival y demostracion de 12 jugadores.
- `Back/juegos/`: proyecto Java con Spring Boot, Maven y MySQL. Modelos y repositorios iniciales; endpoints y logica del servidor pendientes.

## Frontend

```sh
cd front
npm install
npm run dev
```

Validacion: `npm test` y `npm run build`. Consultar [front/README.md](front/README.md) para detalles.

## Backend

Requiere Java 21 y MySQL local con base de datos `adivina_quien`. Revisar `Back/juegos/src/main/resources/application.properties` antes de ejecutar. No publicar contraseñas ni credenciales reales.

En Windows, desde `Back/juegos/`:

```powershell
.\mvnw.cmd spring-boot:run
```

## Estado actual

El frontend es un prototipo local: las salas comunican pestañas del mismo navegador usando BroadcastChannel, no equipos distintos por Internet. El anfitrion debe mantener su pestaña abierta; no hay persistencia ni reconexion. Los secretos locales no tienen seguridad de servidor. Falta implementar e integrar el backend para multijugador real.

Las imagenes usan fuentes externas y cuentan con respaldo por nombre cuando no cargan. Revisar licencias y atribuciones antes de publicar el juego.