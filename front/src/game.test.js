import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, addPlayer, chooseSecret, startGame, accuse, publicRoom, finishTurn } from './game.js';

const validIds = ['goku', 'vegeta'];
function readyRoom(count = 3) {
  let room = createRoom('ABC123', 'dragon-ball', { id: 'host', name: 'Ana' });
  for (let index = 1; index < count; index += 1) room = addPlayer(room, { id: `player${index}`, name: `Jugador ${index}` });
  for (const player of room.players) room = chooseSecret(room, player.id, 'goku', validIds);
  return room;
}

test('se permiten secretos repetidos y nunca aparecen en el estado publico', () => {
  const room = readyRoom();
  assert.equal(room.players[0].secret, room.players[1].secret);
  assert.ok(publicRoom(room).players.every(player => player.ready && !('secret' in player)));
});
test('acertar elimina solo al rival acusado y salta su turno', () => {
  const room = accuse(startGame(readyRoom(), 'host'), 'host', 'player1', 'goku', validIds);
  assert.equal(room.players[1].eliminated, true);
  assert.equal(room.players[2].eliminated, false);
  assert.equal(room.turnId, 'player2');
});
test('fallar consume el turno sin eliminar jugadores', () => {
  const room = accuse(startGame(readyRoom(), 'host'), 'host', 'player1', 'vegeta', validIds);
  assert.equal(room.turnId, 'player1');
  assert.ok(room.players.every(player => !player.eliminated));
});
test('el ultimo jugador activo gana', () => {
  const room = accuse(startGame(readyRoom(2), 'host'), 'host', 'player1', 'goku', validIds);
  assert.equal(room.phase, 'finished');
  assert.equal(room.winnerId, 'host');
});
test('no inicia sin todos listos ni con un solo jugador', () => {
  assert.throws(() => startGame(readyRoom(1), 'host'));
  assert.throws(() => startGame(addPlayer(readyRoom(2), { id: 'new', name: 'Nuevo' }), 'host'));
  assert.throws(() => startGame(readyRoom(), 'player1'));
});
test('limita la sala a 12 y valida turnos, rivales y categoria', () => {
  assert.throws(() => addPlayer(readyRoom(12), { id: 'overflow', name: 'Extra' }));
  const room = startGame(readyRoom(), 'host');
  assert.throws(() => accuse(room, 'player1', 'host', 'goku', validIds));
  assert.throws(() => accuse(room, 'host', 'host', 'goku', validIds));
  assert.throws(() => accuse(room, 'host', 'player1', 'otro', validIds));
  assert.equal(finishTurn(room, 'host').turnId, 'player1');
});