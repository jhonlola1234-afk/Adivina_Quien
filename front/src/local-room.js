import { addPlayer, chooseSecret, startGame, accuse, finishTurn, publicRoom } from './game.js';
import { getCategory } from './catalog.js';

export function connectRoom({ code, player, initialRoom, onState, onSecret }) {
  const channel = new BroadcastChannel(`adivina-quien-${code}`);
  let authority = initialRoom || null;
  let closed = false;
  const pending = new Map();
  const publish = () => {
    const state = publicRoom(authority);
    onState(state);
    onSecret(authority.players.find(member => member.id === player.id)?.secret || null);
    channel.postMessage({ type: 'state', state });
  };
  const handle = (sender, action, payload) => {
    const validIds = getCategory(authority.category).characters.map(character => character.id);
    if (action === 'join') authority = addPlayer(authority, { id: sender, name: payload.name });
    else {
      if (!authority.players.some(member => member.id === sender)) throw new Error('No perteneces a esta sala.');
      if (action === 'choose') authority = chooseSecret(authority, sender, payload.secret, validIds);
      else if (action === 'start') authority = startGame(authority, sender);
      else if (action === 'pass') authority = finishTurn(authority, sender);
      else if (action === 'accuse') authority = accuse(authority, sender, payload.targetId, payload.secret, validIds);
      else throw new Error('Accion no valida.');
    }
    publish();
  };
  channel.onmessage = ({ data }) => {
    if (data.type === 'state' && !authority) onState(data.state);
    if (data.type === 'request' && authority) {
      try {
        handle(data.sender, data.action, data.payload);
        channel.postMessage({ type: 'result', requestId: data.requestId, to: data.sender });
      } catch (error) {
        channel.postMessage({ type: 'result', requestId: data.requestId, to: data.sender, error: error.message });
      }
    }
    if (data.type === 'result' && data.to === player.id) {
      const request = pending.get(data.requestId);
      if (!request) return;
      clearTimeout(request.timer);
      pending.delete(data.requestId);
      if (data.error) request.reject(new Error(data.error));
      else {
        if (request.action === 'choose') onSecret(request.payload.secret);
        request.resolve();
      }
    }
    if (data.type === 'closed') onState(null);
  };
  if (authority) publish();
  return {
    async request(action, payload = {}) {
      if (closed) throw new Error('La sala esta cerrada.');
      if (authority) { handle(player.id, action, payload); return; }
      return new Promise((resolve, reject) => {
        const requestId = crypto.randomUUID();
        const timer = setTimeout(() => { pending.delete(requestId); reject(new Error('No se encontro al anfitrion. Abre la sala en otra pestaña de este navegador.')); }, 4000);
        pending.set(requestId, { resolve, reject, timer, action, payload });
        channel.postMessage({ type: 'request', requestId, sender: player.id, action, payload });
      });
    },
    close() {
      closed = true;
      if (authority) channel.postMessage({ type: 'closed' });
      for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error('Conexion cerrada.')); }
      pending.clear();
      channel.close();
    },
  };
}