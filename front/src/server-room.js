const API = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');
const STORAGE_KEY = 'adivina-quien-session';

export function savedSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    return session && /^[A-Z0-9]{6}$/.test(session.code) && typeof session.token === 'string' ? session : null;
  } catch { return null; }
}

export function clearSession() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export async function apiRequest(path, { method = 'GET', body, token, signal } = {}) {
  const timeout = AbortSignal.timeout(8000);
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      method,
      cache: 'no-store',
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    throw new Error('No se pudo conectar al servidor. Revisa que el backend este encendido.');
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || 'El servidor no pudo completar la accion.');
    error.status = response.status;
    throw error;
  }
  return data;
}

export function serverConnection({ session, onSnapshot, onConnection, onInvalid, initialSnapshot }) {
  const controller = new AbortController();
  let closed = false;
  let timer;
  let current = initialSnapshot;
  let queue = Promise.resolve();
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  const publish = snapshot => {
    if (closed) return;
    if (!current || snapshot.room.revision >= current.room.revision) {
      current = snapshot;
      onSnapshot(snapshot);
    }
    onConnection(true);
  };
  const enqueue = task => {
    const operation = queue.then(() => {
      if (closed) throw new Error('La conexion esta cerrada.');
      return task();
    });
    queue = operation.catch(() => {});
    return operation;
  };
  const getState = async () => {
    const snapshot = await apiRequest(`/rooms/${session.code}/session`, { token: session.token, signal: controller.signal });
    publish(snapshot);
    return snapshot;
  };
  const schedulePoll = () => {
    if (closed) return;
    timer = setTimeout(async () => {
      try { await enqueue(getState); }
      catch (error) {
        if (closed) return;
        if (error.status === 401 || error.status === 404) {
          clearSession();
          connection.close();
          onInvalid(error.message);
          return;
        }
        onConnection(false);
      }
      schedulePoll();
    }, 2000);
  };
  const routes = {
    choose: ['PUT', 'secret'], start: ['POST', 'start'], pass: ['POST', 'pass'],
    accuse: ['POST', 'accuse'], discard: ['PUT', 'discards'], reset: ['POST', 'discards/reset'],
    rematch: ['POST', 'rematch'], leave: ['POST', 'leave'], kick: ['POST', 'kick'],
  };
  const connection = {
    async refresh() { return enqueue(getState); },
    async request(action, payload = {}) {
      return enqueue(async () => {
        const [method, route] = routes[action] || [];
        if (!method) throw new Error('Accion no valida.');
        const body = ['pass', 'accuse'].includes(action) ? { ...payload, revision: current.room.revision } : payload;
        try {
          const snapshot = await apiRequest(`/rooms/${session.code}/${route}`, { method, body, token: session.token, signal: controller.signal });
          if (action === 'leave') { clearSession(); return; }
          publish(snapshot);
        } catch (error) {
          if (error.status === 409) await getState().catch(() => {});
          throw error;
        }
      });
    },
    close() {
      closed = true;
      clearTimeout(timer);
      controller.abort();
    },
  };
  if (initialSnapshot) publish(initialSnapshot);
  schedulePoll();
  return connection;
}

export async function enterServerRoom(mode, { name, category, code }) {
  const path = mode === 'create' ? '/rooms' : `/rooms/${code}/join`;
  const result = await apiRequest(path, { method: 'POST', body: mode === 'create' ? { name, category } : { name } });
  return { session: { code: result.session.room.code, token: result.token }, snapshot: result.session };
}