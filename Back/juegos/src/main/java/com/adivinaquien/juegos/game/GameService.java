package com.adivinaquien.juegos.game;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class GameService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int MAX_PLAYERS = 12;
    private static final long TURN_MILLIS = 180_000;
    private final GameRoomRepository rooms;
    private final GameCharacterRepository characters;

    public GameService(GameRoomRepository rooms, GameCharacterRepository characters) {
        this.rooms = rooms;
        this.characters = characters;
    }

    public GameDtos.EntryView create(GameDtos.CreateRequest request) {
        require(GameCatalog.NAMES.containsKey(request.category()), "Categoria no valida.");
        GameRoom room = new GameRoom();
        do { room.code = randomCode(); } while (rooms.existsById(room.code));
        room.category = request.category();
        String token = newToken();
        GameMember host = member(request.name(), token);
        room.hostId = host.id;
        room.players.add(host);
        touch(room);
        rooms.save(room);
        return new GameDtos.EntryView(token, snapshot(room, host));
    }

    public GameDtos.EntryView join(String code, GameDtos.JoinRequest request) {
        GameRoom room = locked(code);
        require(room.phase.equals("lobby"), "La partida ya comenzo o la sala esta cerrada.");
        require(room.players.size() < MAX_PLAYERS, "La sala ya tiene 12 jugadores.");
        String token = newToken();
        GameMember player = member(request.name(), token);
        room.players.add(player);
        touch(room);
        return new GameDtos.EntryView(token, snapshot(room, player));
    }

    public GameDtos.SessionView state(String code, String token) {
        GameRoom room = locked(code);
        GameMember actor = authenticate(room, token);
        expireTurn(room);
        actor.lastSeen = System.currentTimeMillis();
        return snapshot(room, actor);
    }

    public GameDtos.SessionView choose(String code, String token, String secret) {
        GameRoom room = locked(code);
        GameMember actor = authenticate(room, token);
        require(room.phase.equals("lobby"), "El personaje solo se elige antes de empezar.");
        validCharacter(room, secret);
        actor.secret = secret;
        touch(room);
        return snapshot(room, actor);
    }

    public GameDtos.SessionView start(String code, String token) {
        GameRoom room = locked(code);
        GameMember actor = authenticate(room, token);
        require(actor.id.equals(room.hostId), "Solo el anfitrion puede iniciar.");
        require(room.phase.equals("lobby"), "La sala no esta esperando jugadores.");
        require(room.players.size() >= 2, "Se necesitan al menos 2 jugadores.");
        require(room.players.stream().allMatch(player -> player.secret != null), "Faltan jugadores por elegir.");
        room.phase = "playing";
        refreshQuestionTargets(room);
        room.turnId = room.players.getFirst().id;
        room.turnDeadline = System.currentTimeMillis() + TURN_MILLIS;
        touch(room);
        return snapshot(room, actor);
    }

    public GameDtos.SessionView pass(String code, String token, long revision) {
        GameRoom room = locked(code);
        GameMember actor = authenticate(room, token);
        expireTurn(room);
        requireTurn(room, actor, revision);
        nextTurn(room, actor.id);
        touch(room);
        return snapshot(room, actor);
    }

    public GameDtos.SessionView accuse(String code, String token, GameDtos.AccuseRequest request) {
        GameRoom room = locked(code);
        GameMember actor = authenticate(room, token);
        expireTurn(room);
        requireTurn(room, actor, request.revision());
        refreshQuestionTargets(room);
        String assignedTargetId = targetFor(room, actor.id);
        if (assignedTargetId != null) {
            require(assignedTargetId.equals(request.targetId()), "Debes preguntar a tu rival asignado por la ruleta.");
        }
        GameMember target = rival(room, actor, request.targetId());
        validCharacter(room, request.secret());
        boolean correct = request.secret().equals(target.secret);
        if (correct) target.eliminated = true;
        room.history.add(new GuessEvent(UUID.randomUUID().toString(), actor.id, target.id, request.secret(), correct));
        if (!finishIfNeeded(room)) {
            refreshQuestionTargets(room);
            nextTurn(room, actor.id);
        }
        touch(room);
        return snapshot(room, actor);
    }

    public GameDtos.SessionView discard(String code, String token, GameDtos.DiscardRequest request) {
        GameRoom room = locked(code);
        GameMember actor = authenticate(room, token);
        require(room.phase.equals("playing") && !actor.eliminated, "No puedes modificar este tablero.");
        rival(room, actor, request.targetId());
        validCharacter(room, request.characterId());
        actor.discards.removeIf(discard -> discard.targetId.equals(request.targetId()) && discard.characterId.equals(request.characterId()));
        if (request.discarded()) actor.discards.add(new PrivateDiscard(request.targetId(), request.characterId()));
        return snapshot(room, actor);
    }

    public GameDtos.SessionView resetDiscards(String code, String token, String targetId) {
        GameRoom room = locked(code);
        GameMember actor = authenticate(room, token);
        require(room.phase.equals("playing") && !actor.eliminated, "No puedes modificar este tablero.");
        rival(room, actor, targetId);
        actor.discards.removeIf(discard -> discard.targetId.equals(targetId));
        return snapshot(room, actor);
    }

    public void leave(String code, String token) {
        GameRoom room = locked(code);
        GameMember actor = authenticate(room, token);
        if (room.phase.equals("lobby")) {
            room.players.remove(actor);
            for (GameMember player : room.players) player.discards.removeIf(discard -> discard.targetId.equals(actor.id));
        } else {
            actor.departed = true;
            actor.eliminated = true;
            actor.tokenHash = "revoked";
            if (room.phase.equals("playing")) refreshQuestionTargets(room);
            if (room.phase.equals("playing") && !finishIfNeeded(room) && actor.id.equals(room.turnId)) nextTurn(room, actor.id);
        }
        if (actor.id.equals(room.hostId)) {
            room.hostId = room.players.stream().filter(player -> !player.departed && !player.eliminated)
                .findFirst().or(() -> room.players.stream().filter(player -> !player.departed).findFirst())
                .map(player -> player.id).orElse(null);
        }
        if (room.hostId == null) { room.phase = "closed"; room.turnId = null; room.turnDeadline = 0; }
        touch(room);
    }

    public GameDtos.SessionView rematch(String code, String token) {
        GameRoom room = locked(code);
        GameMember actor = authenticate(room, token);
        require(actor.id.equals(room.hostId), "Solo el anfitrion puede preparar otra partida.");
        require(room.phase.equals("finished"), "La partida todavia no termino.");
        room.players.removeIf(player -> player.departed);
        room.players.forEach(player -> { player.secret = null; player.eliminated = false; player.discards.clear(); });
        room.history.clear();
        room.phase = "lobby";
        room.turnId = null;
        room.winnerId = null;
        room.turnDeadline = 0;
        room.questionTargets.clear();
        touch(room);
        return snapshot(room, actor);
    }

    public GameDtos.SessionView removeOffline(String code, String token, String targetId) {
        GameRoom room = locked(code);
        GameMember actor = authenticate(room, token);
        require(actor.id.equals(room.hostId) && room.phase.equals("lobby"), "Solo el anfitrion puede retirar jugadores en espera.");
        GameMember target = rival(room, actor, targetId);
        require(System.currentTimeMillis() - target.lastSeen >= 30_000, "El jugador todavia esta conectado.");
        room.players.remove(target);
        touch(room);
        return snapshot(room, actor);
    }

    private GameRoom locked(String code) {
        if (code == null || !code.matches("[A-Z0-9]{6}")) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sala no encontrada.");
        return rooms.lockByCode(code).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sala no encontrada."));
    }

    private GameMember authenticate(GameRoom room, String token) {
        if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesion no valida.");
        String hash = hash(token);
        return room.players.stream().filter(player -> !player.departed && MessageDigest.isEqual(
            player.tokenHash.getBytes(StandardCharsets.US_ASCII), hash.getBytes(StandardCharsets.US_ASCII)))
            .findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesion no valida."));
    }

    private GameMember member(String name, String token) {
        require(name != null && !name.isBlank() && name.strip().length() <= 24, "Nombre no valido.");
        GameMember player = new GameMember();
        player.id = UUID.randomUUID().toString();
        player.name = name.strip();
        player.tokenHash = hash(token);
        player.lastSeen = System.currentTimeMillis();
        return player;
    }

    private void validCharacter(GameRoom room, String id) {
        require(id != null && inCatalog(room.category, id), "El personaje no pertenece a la categoria.");
    }

    private static boolean inCatalog(String category, String id) {
        List<String> names = GameCatalog.NAMES.get(category);
        if (names == null) return false;
        String prefix = category + "-";
        if (!id.startsWith(prefix)) return false;
        try {
            int index = Integer.parseInt(id.substring(prefix.length()));
            return index >= 0 && index < names.size();
        } catch (NumberFormatException exception) {
            return false;
        }
    }

    private GameMember rival(GameRoom room, GameMember actor, String targetId) {
        return room.players.stream().filter(player -> player.id.equals(targetId) && !player.id.equals(actor.id)
            && !player.eliminated && !player.departed).findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Elige un rival activo."));
    }

    private void requireTurn(GameRoom room, GameMember actor, long revision) {
        require(room.phase.equals("playing") && !actor.eliminated && actor.id.equals(room.turnId), "No es tu turno.");
        require(room.revision == revision, "La sala cambio. Revisa el turno e intenta de nuevo.");
    }

    private void expireTurn(GameRoom room) {
        if (room.phase.equals("playing") && room.turnDeadline <= System.currentTimeMillis()) {
            nextTurn(room, room.turnId);
            touch(room);
        }
    }

    private void nextTurn(GameRoom room, String currentId) {
        int currentIndex = indexOf(room.players, currentId);
        for (int offset = 1; offset <= room.players.size(); offset++) {
            GameMember candidate = room.players.get((currentIndex + offset) % room.players.size());
            if (!candidate.eliminated && !candidate.departed) {
                room.turnId = candidate.id;
                room.turnDeadline = System.currentTimeMillis() + TURN_MILLIS;
                return;
            }
        }
    }

    private boolean finishIfNeeded(GameRoom room) {
        List<GameMember> active = room.players.stream().filter(player -> !player.eliminated && !player.departed).toList();
        if (active.size() > 1) return false;
        room.phase = "finished";
        room.winnerId = active.isEmpty() ? null : active.getFirst().id;
        room.turnId = null;
        room.turnDeadline = 0;
        return true;
    }

    private void touch(GameRoom room) {
        room.revision++;
        room.updatedAt = System.currentTimeMillis();
    }

    private void refreshQuestionTargets(GameRoom room) {
        List<GameMember> active = activePlayers(room);
        if (active.size() < 2) {
            room.questionTargets.clear();
            return;
        }
        Set<String> activeIds = active.stream().map(player -> player.id).collect(java.util.stream.Collectors.toSet());
        if (hasValidQuestionTargets(room, activeIds)) return;
        room.questionTargets.clear();
        List<GameMember> wheel = new ArrayList<>(active);
        Collections.shuffle(wheel, RANDOM);
        for (int index = 0; index < wheel.size(); index++) {
            GameMember actor = wheel.get(index);
            GameMember target = wheel.get((index + 1) % wheel.size());
            room.questionTargets.add(new QuestionTarget(actor.id, target.id));
        }
    }

    private static boolean hasValidQuestionTargets(GameRoom room, Set<String> activeIds) {
        if (room.questionTargets.size() != activeIds.size()) return false;
        Set<String> seenActors = new HashSet<>();
        Set<String> seenTargets = new HashSet<>();
        for (QuestionTarget target : room.questionTargets) {
            if (!activeIds.contains(target.actorId) || !activeIds.contains(target.targetId)) return false;
            if (target.actorId.equals(target.targetId)) return false;
            if (!seenActors.add(target.actorId)) return false;
            if (!seenTargets.add(target.targetId)) return false;
        }
        return seenActors.equals(activeIds) && seenTargets.equals(activeIds);
    }

    private String targetFor(GameRoom room, String actorId) {
        for (QuestionTarget target : room.questionTargets) if (target.actorId.equals(actorId)) return target.targetId;
        return null;
    }

    private static List<GameMember> activePlayers(GameRoom room) {
        return room.players.stream().filter(player -> !player.eliminated && !player.departed).toList();
    }

    private GameDtos.SessionView snapshot(GameRoom room, GameMember actor) {
        long now = System.currentTimeMillis();
        var players = room.players.stream().map(player -> new GameDtos.PlayerView(player.id, player.name,
            player.secret != null, player.eliminated, player.departed, !player.departed && now - player.lastSeen < 30_000)).toList();
        var history = room.history.stream().skip(Math.max(0, room.history.size() - 100))
            .map(event -> new GameDtos.EventView(event.id, event.actorId, event.targetId, event.secret, event.correct)).toList();
        Map<String, String> questionTargets = new LinkedHashMap<>();
        for (QuestionTarget target : room.questionTargets) questionTargets.put(target.actorId, target.targetId);
        Map<String, List<String>> discards = new LinkedHashMap<>();
        for (PrivateDiscard discard : actor.discards) discards.computeIfAbsent(discard.targetId, key -> new ArrayList<>()).add(discard.characterId);
        var publicRoom = new GameDtos.RoomView(room.code, room.category, room.hostId, room.phase, players,
            room.turnId, room.winnerId, history, room.revision, room.turnDeadline, questionTargets);
        return new GameDtos.SessionView(publicRoom, new GameDtos.SelfView(actor.id, actor.name, actor.secret, discards));
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    private static String newToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException exception) { throw new IllegalStateException(exception); }
    }

    private static String randomCode() {
        String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder code = new StringBuilder();
        for (int index = 0; index < 6; index++) code.append(alphabet.charAt(RANDOM.nextInt(alphabet.length())));
        return code.toString();
    }

    private static int indexOf(List<GameMember> players, String id) {
        for (int index = 0; index < players.size(); index++) if (players.get(index).id.equals(id)) return index;
        throw new IllegalStateException("Turno sin jugador.");
    }
}