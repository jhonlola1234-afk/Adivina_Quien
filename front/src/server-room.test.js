import test from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, enterServerRoom, savedSession, serverConnection, clearSession } from './server-room.js';
import { categories } from './catalog.js';

function storage(context) {
  const values = new Map();
  context.mock.method(globalThis, 'fetch', async () => new Response('{}'));
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  } });
  context.after(() => delete globalThis.sessionStorage);
}

const snapshot = revision => ({ room: { code: 'ABC123', revision }, self: { id: 'ana', name: 'Ana', secret: 'paises-0', discards: {} } });

test('catalogo contiene cinco categorias de veinte IDs unicos', () => {
  assert.equal(categories.length, 5);
  for (const category of categories) {
    assert.equal(category.characters.length, 20);
    assert.equal(new Set(category.characters.map(character => character.id)).size, 20);
  }
});

test('crear sala usa identidad asignada por el servidor', async context => {
  storage(context);
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/rooms');
    assert.deepEqual(JSON.parse(options.body), { name: 'Ana', category: 'paises' });
    assert.equal(options.headers.Authorization, undefined);
    return Response.json({ token: 'private-token', session: snapshot(1) });
  });
  const result = await enterServerRoom('create', { name: 'Ana', category: 'paises' });
  assert.equal(result.session.code, 'ABC123');
  assert.equal(result.snapshot.self.id, 'ana');
});

test('sesion privada manda bearer y revision, guarda y elimina credencial al salir', async context => {
  storage(context);
  const published = [];
  const calls = [];
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    assert.equal(options.headers.Authorization, 'Bearer private-token');
    assert.equal(options.cache, 'no-store');
    if (url.endsWith('/leave')) return new Response(null, { status: 204 });
    return Response.json(snapshot(2));
  });
  const connection = serverConnection({ session: { code: 'ABC123', token: 'private-token' }, initialSnapshot: snapshot(1), onSnapshot: state => published.push(state), onConnection: () => {}, onInvalid: () => {} });
  try {
    assert.equal(savedSession().code, 'ABC123');
    await connection.request('accuse', { targetId: 'luis', secret: 'paises-1' });
    assert.deepEqual(JSON.parse(calls[0].options.body), { targetId: 'luis', secret: 'paises-1', revision: 1 });
    await connection.refresh();
    assert.equal(published.at(-1).room.revision, 2);
    await connection.request('leave');
    assert.equal(savedSession(), null);
  } finally { connection.close(); }
});

test('conflicto de turno actualiza sala sin repetir acusacion automaticamente', async context => {
  storage(context);
  let accusations = 0;
  const published = [];
  context.mock.method(globalThis, 'fetch', async url => {
    if (url.endsWith('/accuse')) { accusations++; return Response.json({ message: 'No es tu turno.' }, { status: 409 }); }
    return Response.json(snapshot(3));
  });
  const connection = serverConnection({ session: { code: 'ABC123', token: 'private-token' }, initialSnapshot: snapshot(1), onSnapshot: state => published.push(state), onConnection: () => {}, onInvalid: () => {} });
  try {
    await assert.rejects(connection.request('accuse', { targetId: 'luis', secret: 'paises-1' }), /No es tu turno/);
    assert.equal(accusations, 1);
    assert.equal(published.at(-1).room.revision, 3);
  } finally { connection.close(); clearSession(); }
});

test('errores de autenticacion conservan codigo HTTP y mensaje sin filtrar credenciales', async context => {
  storage(context);
  context.mock.method(globalThis, 'fetch', async () => Response.json({ message: 'Sesion no valida.' }, { status: 401 }));
  await assert.rejects(apiRequest('/rooms/ABC123/session', { token: 'private-token' }), error => error.status === 401 && error.message === 'Sesion no valida.');
});