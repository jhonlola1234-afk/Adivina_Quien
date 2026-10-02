# Adivina Quien - Frontend

React + Vite. Salas reales de 2 a 12 jugadores con backend Spring. Interfaz en blanco, morado y azul.

## Arranque

En una terminal, desde `../Back/juegos/`, ejecutar `./mvnw spring-boot:run` o `.\mvnw.cmd spring-boot:run` en Windows. En otra terminal, desde esta carpeta:

```sh
npm install
npm run dev
```

Vite reenvia `/api` a `http://127.0.0.1:8080`. Las peticiones al servidor son HTTP y la sala se actualiza cada dos segundos, no por WebSocket. No se usa BroadcastChannel.

## Partida

El anfitrion crea la sala con una categoria. Los jugadores entran por codigo y eligen su secreto; se permiten repetidos. Cuando todos estan listos, el anfitrion inicia. Las preguntas se hacen por Discord o Teams. Los descartes son privados y separados por rival. Acertar elimina solo al rival acusado; fallar consume el turno. Gana el ultimo activo.

Los turnos duran hasta tres minutos. Cerrar una pestaña conserva la plaza para volver; el turno vencido avanza cuando el servidor recibe la siguiente consulta. Salir con el boton revoca la sesion y cuenta como eliminacion durante la partida. El anfitrion se transfiere al salir. En espera puede retirar jugadores que no consultan al servidor durante 30 segundos. Al terminar, el anfitrion puede preparar otra partida con nuevos secretos.

La sesion se guarda en `sessionStorage`: recargar la misma pestaña recupera sala, secreto y descartes. Si se cierra la pestaña o borra su almacenamiento, puede perderse la credencial y no hay recuperacion por nombre. No compartir ni registrar el token. No duplicar una pestaña para crear otro jugador: abrir una nueva desde la URL o usar otro navegador.

La demostracion es independiente del backend y contiene 11 rivales simulados que pasan sus turnos; no responde preguntas ni simula una IA.

## Red local y despliegue

`npm run dev -- --host 0.0.0.0` expone el frontend en la red local. Compartir la direccion Network que muestra Vite y permitir el puerto del frontend en el firewall, manualmente si es necesario. Cada dispositivo accede al mismo frontend y el proxy llega al backend. No hace falta exponer 8080 directamente. Vite es solo para desarrollo, no publicacion.

Para publicar, servir `dist/` con HTTPS y un proxy `/api` al backend. Si la API esta en otro dominio, configurar `VITE_API_URL` durante el build y `GAME_ALLOWED_ORIGINS` en el backend con el origen exacto del frontend. Las variables `VITE_*` son publicas: nunca colocar contraseñas en ellas. `npm run preview` no incluye el proxy de desarrollo.

## Pruebas

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

E2E requiere el backend activo en 8080 y usa 5174 para Vite. Incluye tres recorridos con navegadores aislados: partida/revancha, recuperacion/privacidad y limite de sala.

## Catalogo e imagenes

Cinco categorias de 20 opciones: Dragon Ball, terror, cantantes, famosos y paises. Los IDs del catalogo visual coinciden con el catalogo que valida el backend; al ampliarlo, actualizar ambos y sus pruebas. Retratos externos desde Dragon Ball API y Wikipedia/Wikimedia; banderas desde FlagCDN. Algunas miniaturas faltan: se muestra nombre e iniciales. Revisar atribuciones/licencias antes de publicar.