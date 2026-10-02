import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, CheckCheck, ChevronDown, Copy, Eye, EyeOff, Gamepad2, Ghost, Globe2, LogOut, Mic2, Plus, Search, ShieldCheck, Sparkles, Star, Trophy, Users, X, RotateCcw, Crosshair, CircleHelp, ArrowLeft, LoaderCircle } from 'lucide-react';
import { categories, getCategory, loadPortraits } from './catalog.js';
import { createRoom, addPlayer, chooseSecret, startGame, accuse, finishTurn, publicRoom } from './game.js';
import { connectRoom } from './local-room.js';

const icons = { sparkles: Sparkles, ghost: Ghost, mic: Mic2, star: Star, globe: Globe2 };
const palette = ['#7450d6', '#287dc4', '#1f9c82', '#d45683', '#b27b28'];
const initials = name => name.split(' ').map(part => part[0]).slice(0, 2).join('');

function Portrait({ character, images, className = '' }) {
  const source = character.image || images[character.id];
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [source]);
  return <div className={`portrait ${className}`}>
    {source && !failed ? <img src={source} alt={character.name} loading="lazy" onError={() => setFailed(true)} /> : <div className="portrait-fallback"><span>{initials(character.name)}</span><small>{character.name}</small></div>}
  </div>;
}

export default function App() {
  const [player] = useState(() => ({ id: crypto.randomUUID(), name: '' }));
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('dragon-ball');
  const [joinCode, setJoinCode] = useState('');
  const [room, setRoom] = useState(null);
  const [secret, setSecret] = useState(null);
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [images, setImages] = useState({});
  const [imageNotice, setImageNotice] = useState(false);
  const [query, setQuery] = useState('');
  const [targetId, setTargetId] = useState('');
  const [discarded, setDiscarded] = useState({});
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [guessId, setGuessId] = useState('');
  const [modal, setModal] = useState(null);
  const [copied, setCopied] = useState(false);
  const connection = useRef(null);
  const demoRoom = useRef(null);
  const category = getCategory(room?.category || selectedCategory);
  const self = room?.players.find(member => member.id === player.id);
  const rivals = room?.players.filter(member => member.id !== player.id) || [];
  const target = rivals.find(member => member.id === targetId);
  const isTurn = room?.phase === 'playing' && room.turnId === player.id;
  const isPlaying = room?.phase === 'playing' || room?.phase === 'finished';
  const excluded = discarded[targetId] || [];
  const myCharacter = category.characters.find(character => character.id === secret);
  const visibleCharacters = category.characters.filter(character => character.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) && (!isPlaying || !onlyAvailable || !excluded.includes(character.id)));

  useEffect(() => {
    const controller = new AbortController();
    setImages({}); setImageNotice(false);
    loadPortraits(category, controller.signal).then(setImages).catch(error => { if (error.name !== 'AbortError') setImageNotice(true); });
    return () => controller.abort();
  }, [category.id]);
  useEffect(() => () => connection.current?.close(), []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!rivals.some(member => member.id === targetId && !member.eliminated)) setTargetId(rivals.find(member => !member.eliminated)?.id || '');
  }, [room]);
  useEffect(() => {
    if (!demo || room?.phase !== 'playing' || isTurn) return;
    const timer = setTimeout(() => {
      demoRoom.current = finishTurn(demoRoom.current, demoRoom.current.turnId);
      setRoom(publicRoom(demoRoom.current));
    }, 1500);
    return () => clearTimeout(timer);
  }, [demo, room?.turnId, room?.phase]);

  const receiveRoom = state => {
    if (!state) { setRoom(null); setError('El anfitrion cerro la sala.'); return; }
    if (state.players.some(member => member.id === player.id)) setRoom(state);
  };
  async function enter(mode) {
    setError('');
    if (!name.trim()) { setError('Escribe tu nombre para entrar.'); return; }
    if (mode === 'join' && !/^[A-Z0-9]{6}$/.test(joinCode)) { setError('El codigo debe tener 6 letras o numeros.'); return; }
    if (!('BroadcastChannel' in window)) { setError('Este navegador no admite salas locales. Prueba la demostracion.'); return; }
    setBusy(true);
    const identity = { ...player, name: name.trim() };
    const code = mode === 'create' ? crypto.randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase() : joinCode;
    const initialRoom = mode === 'create' ? createRoom(code, category.id, identity) : null;
    connection.current?.close();
    connection.current = connectRoom({ code, player: identity, initialRoom, onState: receiveRoom, onSecret: setSecret });
    try { if (mode === 'join') await connection.current.request('join', { name: identity.name }); }
    catch (error) { setError(error.message); connection.current.close(); connection.current = null; }
    finally { setBusy(false); }
  }
  function openDemo() {
    connection.current?.close(); connection.current = null;
    let state = createRoom('DEMO12', category.id, { ...player, name: name.trim() || 'Tú' });
    const demoNames = ['Sofía', 'Mateo', 'Valentina', 'Lucas', 'Camila', 'Daniel', 'Martina', 'Nicolás', 'Lucía', 'Samuel', 'Emma'];
    demoNames.forEach((member, index) => { state = addPlayer(state, { id: `demo-${index}`, name: member }); });
    const validIds = category.characters.map(character => character.id);
    state.players.slice(1).forEach((member, index) => { state = chooseSecret(state, member.id, validIds[index % 8], validIds); });
    demoRoom.current = state; setDemo(true); setRoom(publicRoom(state)); setSecret(null); setError(''); setDiscarded({});
  }
  async function action(type, payload = {}) {
    setError(''); setBusy(true);
    try {
      if (demo) {
        const validIds = category.characters.map(character => character.id);
        let state = demoRoom.current;
        if (type === 'choose') { state = chooseSecret(state, player.id, payload.secret, validIds); setSecret(payload.secret); }
        if (type === 'start') state = startGame(state, player.id);
        if (type === 'pass') state = finishTurn(state, player.id);
        if (type === 'accuse') state = accuse(state, player.id, payload.targetId, payload.secret, validIds);
        demoRoom.current = state; setRoom(publicRoom(state));
      } else await connection.current.request(type, payload);
      if (type === 'choose') setToast('Tu personaje secreto está listo.');
      if (type === 'accuse') { setModal(null); setGuessId(''); }
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  function leave() {
    connection.current?.close(); connection.current = null; demoRoom.current = null;
    setRoom(null); setSecret(null); setDemo(false); setDiscarded({}); setQuery(''); setError(''); setModal(null); setShowSecret(false); setGuessId(''); setOnlyAvailable(false);
  }
  function toggleDiscard(characterId) {
    if (!targetId || self?.eliminated || room.phase !== 'playing') return;
    setDiscarded(current => ({ ...current, [targetId]: (current[targetId] || []).includes(characterId) ? current[targetId].filter(id => id !== characterId) : [...(current[targetId] || []), characterId] }));
  }
  async function copyCode() {
    try { await navigator.clipboard.writeText(room.code); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setToast(`Código de sala: ${room.code}`); }
  }

  return <div className="app">
    <header className="topbar"><a className="brand" href="/" onClick={event => { event.preventDefault(); if (room) setModal('leave'); }}><span className="brand-symbol"><Gamepad2 size={25} /></span><span>Adivina<span className="brand-purple">Quién</span><small>UN SECRETO. MUCHAS SOSPECHAS.</small></span></a><div className="header-right"><span className="local-badge"><span />{demo ? 'Demostración' : 'Modo local'}</span>{room && <button className="icon-button" title="Salir de la sala" aria-label="Salir de la sala" onClick={() => setModal('leave')}><LogOut size={19} /></button>}</div></header>
    <main>
      {!room ? <>
        <div className="page-heading"><div><div className="eyebrow"><span />QUE EMPIECE LA SOSPECHA</div><h1>Tu grupo. Una categoría.<br /><span>Un montón de secretos.</span></h1><p>¿Quién se esconde detrás de cada jugador?</p></div><div className="heading-stamp"><Users size={23} /><strong>2–12</strong><span>jugadores por sala</span></div></div>
        <div className="setup-layout"><section className="category-section"><div className="section-title"><h2>Elige el universo</h2><span>01 / Categoría</span></div><div className="categories">{categories.map(item => { const Icon = icons[item.icon]; return <button className={`category-card ${selectedCategory === item.id ? 'selected' : ''}`} style={{ '--accent': item.color }} key={item.id} onClick={() => setSelectedCategory(item.id)} aria-pressed={selectedCategory === item.id}><div className={`category-art art-${item.id}`}><img src={item.cover} alt="" onError={event => { event.currentTarget.style.display = 'none'; }} /><Icon className="art-icon" size={55} /><span className="count">20 personajes</span>{selectedCategory === item.id && <span className="selected-check"><Check size={17} /></span>}</div><div className="category-caption"><span className="category-icon"><Icon size={18} /></span><div><strong>{item.name}</strong><small>{item.tag}</small></div></div></button>; })}</div></section>
        <aside className="entry-panel"><div className="panel-kicker"><Gamepad2 size={20} /> TU PRÓXIMA PARTIDA</div><h2>Nos vemos en la sala.</h2><label htmlFor="name">Tu nombre</label><input id="name" maxLength={24} placeholder="¿Cómo te llaman?" value={name} onChange={event => setName(event.target.value)} /><div className="chosen-category"><span>Categoría elegida</span><strong>{category.name}</strong></div><button className="button primary full" disabled={busy} onClick={() => enter('create')}><Plus size={18} />Crear sala<ArrowRight size={18} /></button><div className="divider"><span>o entra con tu grupo</span></div><label htmlFor="code">Código de sala</label><div className="join-row"><input id="code" placeholder="ABC123" maxLength={6} value={joinCode} onChange={event => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} /><button className="button secondary" onClick={() => enter('join')} disabled={busy}>Entrar<ArrowRight size={17} /></button></div><div className="local-note"><span className="status-dot" />Salas entre pestañas de este navegador</div><button className="demo-link" onClick={openDemo}><Sparkles size={16} />Probar partida de 12 jugadores<ArrowRight size={15} /></button></aside></div>
        <div className="bottom-strip"><span><ShieldCheck size={19} />Tu elección, solo tuya</span><span><Users size={19} />Personajes repetidos permitidos</span><span><Mic2 size={19} />Discord / Teams</span></div>
      </> : <>
        <div className="room-heading"><div><div className="eyebrow">{category.name.toUpperCase()} <span className="tiny-divider">/</span> {room.phase === 'lobby' ? 'SALA DE ESPERA' : room.phase === 'finished' ? 'PARTIDA TERMINADA' : 'EN PARTIDA'}</div><h1>{room.phase === 'lobby' ? 'Guarda bien tu secreto.' : room.phase === 'finished' ? 'Tenemos un ganador.' : 'Todas las caras. Ninguna certeza.'}</h1></div><button className="room-code" onClick={copyCode} title="Copiar código"><span>SALA</span><strong>{room.code}</strong>{copied ? <Check size={17} /> : <Copy size={17} />}</button></div>
        {demo && <div className="notice"><Sparkles size={17} /><span>Demostración · 11 rivales simulados · sus turnos avanzan automáticamente</span></div>}
        <div className="game-layout"><aside className="players-sidebar"><div className="section-title"><h2>La sala</h2><span>{room.players.length}/12</span></div><div className="player-list">{room.players.map((member, index) => <button key={member.id} disabled={!isPlaying || member.id === player.id || member.eliminated} className={`player-row ${member.id === targetId && isPlaying ? 'active' : ''} ${member.eliminated ? 'eliminated' : ''}`} onClick={() => { setTargetId(member.id); setGuessId(''); }}><span className="avatar" style={{ '--avatar': palette[index % palette.length] }}>{initials(member.name)}</span><span className="player-info"><strong>{member.name}{member.id === player.id && <small> (tú)</small>}</strong><small>{member.eliminated ? 'Eliminado' : room.phase === 'lobby' ? member.ready ? 'Listo' : 'Eligiendo...' : room.turnId === member.id ? 'Su turno' : 'En juego'}</small></span>{member.id === room.hostId && <Star size={13} />}{room.phase === 'lobby' && member.ready && <Check size={15} />}{room.turnId === member.id && <span className="turn-indicator" />}</button>)}</div><div className="voice-note"><Mic2 size={19} /><div><strong>El grupo pone la voz</strong><span>Discord / Teams</span></div></div></aside>
        <section className="board-section">{room.phase === 'finished' ? <div className="winner-banner"><Trophy size={37} /><div><span>ÚLTIMO EN PIE</span><h2>{room.players.find(member => member.id === room.winnerId)?.name}</h2></div><button className="button secondary" onClick={leave}>Volver al inicio<ArrowRight size={17} /></button></div> : <div className={`board-context ${isTurn ? 'your-turn' : ''}`}><span className="context-icon">{room.phase === 'lobby' ? <EyeOff size={21} /> : self?.eliminated ? <Eye size={21} /> : <Crosshair size={21} />}</span><div><strong>{room.phase === 'lobby' ? self?.ready ? 'Tu secreto está elegido' : 'Elige tu personaje secreto' : self?.eliminated ? 'Estás como espectador' : isTurn ? 'Es tu turno' : `Turno de ${room.players.find(member => member.id === room.turnId)?.name}`}</strong><span>{room.phase === 'lobby' ? `${room.players.filter(member => member.ready).length} de ${room.players.length} jugadores listos` : target ? `Tablero de sospechas: ${target.name}` : 'No quedan rivales activos'}</span></div>{room.phase === 'lobby' ? <ShieldCheck size={21} /> : <span className="remaining-count">{20 - excluded.length}<small>posibles</small></span>}</div>}
        <div className="board-toolbar"><div><h2>{room.phase === 'lobby' ? '¿Quién vas a ser?' : 'Tu tablero'}</h2><span>{category.name} · 20 personajes</span></div><div className="toolbar-controls"><label className="search-box"><Search size={17} /><input aria-label="Buscar personaje" placeholder="Buscar..." value={query} onChange={event => setQuery(event.target.value)} /></label>{isPlaying && <><button className={`icon-button ${onlyAvailable ? 'on' : ''}`} aria-pressed={onlyAvailable} title="Mostrar solo personajes no descartados" onClick={() => setOnlyAvailable(!onlyAvailable)}><Eye size={18} /></button><button className="icon-button" title="Restaurar descartes del rival" onClick={() => setModal('reset')} disabled={!excluded.length}><RotateCcw size={17} /></button></>}</div></div>
        {imageNotice && <div className="image-notice">No se pudieron cargar algunos retratos. Puedes jugar con los nombres.</div>}
        <div className="character-grid">{visibleCharacters.map((character, index) => { const isDiscarded = isPlaying && excluded.includes(character.id); const selected = room.phase === 'lobby' ? secret === character.id : guessId === character.id; return <div className={`character-wrap ${isDiscarded ? 'discarded' : ''} ${selected ? 'character-selected' : ''}`} key={character.id} style={{ '--tile-color': palette[index % palette.length] }}><button className="character-card" onClick={() => room.phase === 'lobby' ? action('choose', { secret: character.id }) : toggleDiscard(character.id)} disabled={busy || room.phase === 'finished' || (isPlaying && (self?.eliminated || !targetId))} aria-pressed={room.phase === 'lobby' ? selected : isDiscarded} aria-label={room.phase === 'lobby' ? `Elegir ${character.name}` : `${isDiscarded ? 'Restaurar' : 'Descartar'} ${character.name}`}><Portrait character={character} images={images} className={category.id === 'dragon-ball' || category.id === 'paises' ? 'contain' : ''} /><span className="character-name">{character.name}</span>{selected && <span className="tile-check"><Check size={14} /></span>}{isDiscarded && <span className="discard-cross"><X size={35} /></span>}</button>{isPlaying && !isDiscarded && room.phase === 'playing' && !self?.eliminated && <button className={`guess-pick ${selected ? 'picked' : ''}`} title={`Preparar acusación: ${character.name}`} aria-label={`Acusar con ${character.name}`} disabled={!isTurn || !targetId} onClick={() => setGuessId(selected ? '' : character.id)}><Crosshair size={15} /></button>}</div>; })}</div>{!visibleCharacters.length && <div className="empty-state"><Search size={25} /><p>No hay personajes que coincidan.</p><button className="button secondary" onClick={() => { setQuery(''); setOnlyAvailable(false); }}>Mostrar todos</button></div>}
        </section><aside className="match-sidebar"><section className="secret-section"><div className="section-title"><h2>Tu secreto</h2><button className="icon-button" disabled={!secret} title={showSecret ? 'Ocultar mi personaje' : 'Ver mi personaje'} aria-label={showSecret ? 'Ocultar mi personaje' : 'Ver mi personaje'} onClick={() => setShowSecret(!showSecret)}>{showSecret ? <Eye size={18} /> : <EyeOff size={18} />}</button></div>{showSecret && myCharacter ? <div className="revealed-secret"><Portrait character={myCharacter} images={images} /><strong>{myCharacter.name}</strong></div> : <div className="secret-hidden"><span className="secret-mark">?</span><strong>{secret ? 'Solo tú lo sabes.' : 'Todavía sin elegir'}</strong><span>{secret ? 'Personaje elegido' : 'Tu próximo secreto'}</span></div>}</section>
        {room.phase === 'lobby' ? <section className="start-section"><div className="ready-count"><CheckCheck size={21} /><strong>{room.players.filter(member => member.ready).length}/{room.players.length}</strong><span>listos</span></div>{room.hostId === player.id ? <button className="button primary full" disabled={busy || room.players.length < 2 || room.players.some(member => !member.ready)} onClick={() => { setQuery(''); action('start'); }}>Empezar partida<ArrowRight size={18} /></button> : <p>Esperando al anfitrión</p>}<small>{room.players.length < 2 ? 'Falta al menos otro jugador' : room.players.some(member => !member.ready) ? 'Esperando a que todos elijan' : 'Todo listo para empezar'}</small></section> : room.phase === 'playing' && <section className="turn-section"><div className="eyebrow">{self?.eliminated ? 'ESPECTADOR' : isTurn ? 'TU JUGADA' : 'ESPERANDO TURNO'}</div><h3>{target ? `¿Quién es ${target.name}?` : 'Sin rivales'}</h3><label className="target-select"><select aria-label="Rival" value={targetId} onChange={event => { setTargetId(event.target.value); setGuessId(''); }}>{rivals.filter(member => !member.eliminated).map(member => <option value={member.id} key={member.id}>{member.name}</option>)}</select><ChevronDown size={17} /></label><div className="guess-summary">{guessId ? category.characters.find(character => character.id === guessId)?.name : 'Sin acusación seleccionada'}</div><button className="button primary full" disabled={!isTurn || busy || !guessId || !targetId || self?.eliminated} onClick={() => setModal('accuse')}><Crosshair size={17} />Acusar</button><button className="button secondary full" disabled={!isTurn || busy || self?.eliminated} onClick={() => action('pass')} >Terminar turno<ArrowRight size={17} /></button></section>}
        <section className="activity"><h2>Lo que ha pasado</h2>{room.history.length ? room.history.slice(-5).reverse().map(event => <div className={`activity-event ${event.correct ? 'correct' : ''}`} key={event.id}>{event.correct ? <Check size={16} /> : <X size={16} />}<p><strong>{room.players.find(member => member.id === event.actorId)?.name}</strong>{event.correct ? ' descubrió a ' : ' falló contra '}<strong>{room.players.find(member => member.id === event.targetId)?.name}</strong><small>{category.characters.find(character => character.id === event.secret)?.name}</small></p></div>) : <div className="activity-empty"><CircleHelp size={23} /><span>Los secretos siguen a salvo.</span></div>}</section></aside></div>
      </>}
      {error && <div className="error-message" role="alert"><CircleHelp size={18} /><span>{error}</span><button className="icon-button" aria-label="Cerrar error" onClick={() => setError('')}><X size={17} /></button></div>}
    </main><footer><span>AdivinaQuién <span className="footer-dot">·</span> La sala de los sospechosos</span><span>{room ? `${room.players.filter(member => !member.eliminated).length} jugadores en pie` : 'Hecho para jugar juntos.'}</span></footer>
    {toast && <div className="toast" role="status"><Check size={17} />{toast}</div>}
    {busy && <div className="busy-indicator" role="status"><LoaderCircle size={16} className="spin" />Conectando...</div>}
    {modal && <div className="modal-backdrop" onClick={event => { if (event.target === event.currentTarget && !busy) setModal(null); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close icon-button" aria-label="Cerrar" onClick={() => setModal(null)} disabled={busy}><X size={20} /></button><span className="modal-icon">{modal === 'accuse' ? <Crosshair size={28} /> : modal === 'reset' ? <RotateCcw size={28} /> : <LogOut size={28} />}</span><h2 id="modal-title">{modal === 'accuse' ? `¿${target?.name} es ${category.characters.find(character => character.id === guessId)?.name}?` : modal === 'reset' ? '¿Restaurar este tablero?' : '¿Salir de la sala?'}</h2><p>{modal === 'accuse' ? 'Si aciertas, ese rival queda eliminado. Si fallas, pierdes tu turno.' : modal === 'reset' ? `Se quitarán tus descartes para ${target?.name}. Los otros tableros no cambian.` : room?.hostId === player.id && !demo ? 'Eres el anfitrión. La sala local se cerrará para todos.' : 'Volverás a la selección de categoría.'}</p><div className="modal-actions"><button className="button secondary" disabled={busy} onClick={() => setModal(null)}>Cancelar</button><button className="button primary" disabled={busy} onClick={() => { if (modal === 'accuse') action('accuse', { targetId, secret: guessId }); else if (modal === 'reset') { setDiscarded(current => ({ ...current, [targetId]: [] })); setModal(null); } else leave(); }}>{modal === 'accuse' ? 'Confirmar acusación' : modal === 'reset' ? 'Restaurar' : 'Salir'}</button></div></div></div>}
  </div>;
}