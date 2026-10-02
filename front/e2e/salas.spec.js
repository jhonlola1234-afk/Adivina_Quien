import { test, expect } from '@playwright/test';

test('catalogo, limite de 12, controles de anfitrion y revocacion de sesion', async ({ request }) => {
  const catalog = await request.get('/api/categories');
  const categories = await catalog.json();
  expect(categories).toHaveLength(5);
  expect(categories.every(category => category.characters.length === 20)).toBeTruthy();
  const created = await request.post('/api/rooms', { data: { name: 'Ana', category: 'dragon-ball' } });
  expect(created.status()).toBe(201);
  const host = await created.json();
  const code = host.session.room.code;
  const sessions = [host];
  const authorization = session => ({ Authorization: `Bearer ${session.token}` });
  try {
    const joined = await Promise.all(Array.from({ length: 14 }, (_, index) => request.post(`/api/rooms/${code}/join`, { data: { name: `Jugador ${index}` } })));
    for (const response of joined) if (response.ok()) sessions.push(await response.json());
    expect(sessions).toHaveLength(12);
    expect(joined.filter(response => response.status() === 409)).toHaveLength(3);
    const denied = await request.post(`/api/rooms/${code}/start`, { headers: authorization(sessions[1]) });
    expect(denied.status()).toBe(409);
    const wrongCategory = await request.put(`/api/rooms/${code}/secret`, { headers: authorization(host), data: { secret: 'paises-0' } });
    expect(wrongCategory.status()).toBe(409);
    const notReady = await request.post(`/api/rooms/${code}/start`, { headers: authorization(host) });
    expect(notReady.status()).toBe(409);
    await request.post(`/api/rooms/${code}/leave`, { headers: authorization(sessions[1]) });
    const revoked = await request.get(`/api/rooms/${code}/session`, { headers: authorization(sessions[1]) });
    expect(revoked.status()).toBe(401);
    const state = await request.get(`/api/rooms/${code}/session`, { headers: authorization(host) });
    expect((await state.json()).room.players).toHaveLength(11);
  } finally {
    for (const session of sessions.slice().reverse()) await request.post(`/api/rooms/${code}/leave`, { headers: authorization(session) });
  }
});