export const MAX_PLAYERS = 12;

export function createRoom(code, category, host) {
  return { code, category, hostId: host.id, phase: 'lobby', players: [{ ...host, eliminated: false, secret: null }], turnId: null, winnerId: null, history: [], questionTargets: {} };
}

export function addPlayer(room, player) {
  if (room.phase !== 'lobby') throw new Error('La partida ya ha comenzado.');
  if (room.players.some(member => member.id === player.id)) return room;
  if (room.players.length >= MAX_PLAYERS) throw new Error('La sala ya tiene 12 jugadores.');
  return { ...room, players: [...room.players, { ...player, eliminated: false, secret: null }] };
}

export function chooseSecret(room, playerId, secret, validIds) {
  if (room.phase !== 'lobby') throw new Error('La partida ya ha comenzado.');
  if (!validIds.includes(secret)) throw new Error('Elige un personaje de esta categoria.');
  if (!room.players.some(player => player.id === playerId)) throw new Error('No perteneces a esta sala.');
  return { ...room, players: room.players.map(player => player.id === playerId ? { ...player, secret } : player) };
}

export function startGame(room, playerId) {
  if (playerId !== room.hostId) throw new Error('Solo el anfitrion puede iniciar.');
  if (room.phase !== 'lobby') throw new Error('La partida ya ha comenzado.');
  if (room.players.length < 2) throw new Error('Se necesitan al menos 2 jugadores.');
  if (room.players.some(player => !player.secret)) throw new Error('Todavia hay jugadores eligiendo.');
  const questionTargets = Object.fromEntries(room.players.map((player, index) => [player.id, room.players[(index + 1) % room.players.length].id]));
  return { ...room, phase: 'playing', turnId: room.players[0].id, questionTargets };
}

export function finishTurn(room, playerId) {
  if (room.phase !== 'playing' || room.turnId !== playerId) throw new Error('No es tu turno.');
  const currentIndex = room.players.findIndex(player => player.id === playerId);
  for (let offset = 1; offset <= room.players.length; offset += 1) {
    const candidate = room.players[(currentIndex + offset) % room.players.length];
    if (!candidate.eliminated) return { ...room, turnId: candidate.id };
  }
  throw new Error('No hay jugadores activos.');
}

export function accuse(room, actorId, targetId, secret, validIds) {
  if (room.phase !== 'playing' || room.turnId !== actorId) throw new Error('No es tu turno.');
  const target = room.players.find(player => player.id === targetId);
  if (!target || target.eliminated || actorId === targetId) throw new Error('Elige un rival activo.');
  if (!validIds.includes(secret)) throw new Error('Personaje no valido.');
  const correct = target.secret === secret;
  const next = {
    ...room,
    players: room.players.map(player => player.id === targetId && correct ? { ...player, eliminated: true } : player),
    history: [...room.history, { id: `${room.history.length}-${actorId}`, actorId, targetId, secret, correct }],
  };
  const active = next.players.filter(player => !player.eliminated);
  return active.length === 1 ? { ...next, phase: 'finished', winnerId: active[0].id, turnId: null } : finishTurn(next, actorId);
}

export function publicRoom(room) {
  return { ...room, players: room.players.map(({ secret, ...player }) => ({ ...player, ready: Boolean(secret) })) };
}