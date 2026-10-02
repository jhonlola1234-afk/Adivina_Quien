# Adivina Quien

Frontend React + Vite. Interfaz en blanco, morado y azul para salas de 2 a 12 jugadores.

## Ejecutar

```sh
npm install
npm run dev
npm test
npm run build
```

## Flujo

El anfitrion elige una categoria y crea una sala. Cada jugador elige su secreto; pueden repetirse. Todos deben estar listos para iniciar. Las preguntas se hacen en Discord o Teams. Los descartes son privados y separados por rival. Una acusacion correcta elimina solo al rival señalado; una incorrecta consume el turno. Gana el ultimo jugador activo. La demostracion contiene 11 rivales simulados que pasan automaticamente; no responde preguntas ni simula una IA.

## Estado de la conexion

Esta version es un prototipo local, NO multijugador por Internet. BroadcastChannel permite conectar pestañas del mismo navegador y origen. El anfitrion mantiene el estado en memoria y debe dejar su pestaña abierta. Los descartes y la partida se pierden al recargar. La salida de un invitado no elimina su plaza; no hay reconexion ni deteccion de desconexiones. No uses esta version para una partida real con secretos sensibles: el anfitrion local posee los secretos y los mensajes pueden inspeccionarse con herramientas del navegador. El estado publico no incluye secretos, pero esto no sustituye autenticacion de servidor.

El backend vecino todavia no tiene endpoints funcionales. Para integrar: identidad autenticada por jugador, estado autoritativo y turnos en servidor, capacidad maxima validada atomicamente, seleccion privada sin unicidad, DTO publico sin secretos y endpoint privado para mi secreto, descartes con jugador/rival/personaje, eventos de sala por WebSocket, reconexion y estados de presencia. Nunca devolver entidades Jugador directamente si contienen el personaje secreto. Categorias y personajes deben servirse desde la base de datos, validando que cada secreto pertenezca a la categoria de la sala.

## Catalogo e imagenes

Cinco categorias de 20 opciones: Dragon Ball, terror, cantantes, famosos y paises. Retratos externos desde Dragon Ball API y miniaturas de Wikipedia/Wikimedia; banderas desde FlagCDN. Algunas miniaturas pueden faltar o estar bloqueadas: las tarjetas conservan nombre e iniciales. Las portadas que no cargan usan el icono de su categoria. Es necesario revisar atribuciones/licencias y alojar activos autorizados antes de publicar. Los nombres no implican afiliacion con sus titulares.