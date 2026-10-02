package com.adivinaquien.juegos.game;

import static org.junit.jupiter.api.Assertions.*;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest
class GameServiceTests {
    @Autowired GameService game;
    @Autowired GameRoomRepository rooms;
    @Autowired org.springframework.transaction.support.TransactionTemplate transactions;

    GameDtos.EntryView create() { return game.create(new GameDtos.CreateRequest("Ana", "dragon-ball")); }
    GameDtos.EntryView join(GameDtos.EntryView host, String name) { return game.join(host.session().room().code(), new GameDtos.JoinRequest(name)); }
    GameDtos.SessionView choose(GameDtos.EntryView player) { return game.choose(player.session().room().code(), player.token(), "dragon-ball-0"); }

    @Test
    void duplicateSecretsPrivacyAndOnlyTargetEliminated() {
        var host = create(); var second = join(host, "Luis"); var third = join(host, "Sara");
        String code = host.session().room().code();
        choose(host); choose(second); choose(third);
        var started = game.start(code, host.token());
        assertTrue(started.room().players().stream().allMatch(GameDtos.PlayerView::ready));
        assertEquals("dragon-ball-0", game.state(code, second.token()).self().secret());
        assertFalse(java.util.Arrays.stream(GameDtos.PlayerView.class.getRecordComponents()).anyMatch(field -> field.getName().equals("secret")));
        var result = game.accuse(code, host.token(), new GameDtos.AccuseRequest(second.session().self().id(), "dragon-ball-0", started.room().revision()));
        assertTrue(result.room().players().get(1).eliminated());
        assertFalse(result.room().players().get(2).eliminated());
        assertEquals(third.session().self().id(), result.room().turnId());
        assertThrows(ResponseStatusException.class, () -> game.accuse(code, host.token(), new GameDtos.AccuseRequest(third.session().self().id(), "dragon-ball-0", started.room().revision())));
    }

    @Test
    void missConsumesTurnAndLastActiveWins() {
        var host = create(); var guest = join(host, "Luis"); String code = host.session().room().code();
        choose(host); choose(guest);
        var state = game.start(code, host.token());
        state = game.accuse(code, host.token(), new GameDtos.AccuseRequest(guest.session().self().id(), "dragon-ball-1", state.room().revision()));
        assertEquals(guest.session().self().id(), state.room().turnId());
        assertTrue(state.room().players().stream().noneMatch(GameDtos.PlayerView::eliminated));
        state = game.accuse(code, guest.token(), new GameDtos.AccuseRequest(host.session().self().id(), "dragon-ball-0", state.room().revision()));
        assertEquals("finished", state.room().phase());
        assertEquals(guest.session().self().id(), state.room().winnerId());
        var rematch = game.rematch(code, host.token());
        assertEquals("lobby", rematch.room().phase());
        assertTrue(rematch.room().players().stream().noneMatch(GameDtos.PlayerView::ready));
        assertTrue(rematch.room().history().isEmpty());
    }

    @Test
    void validatesIdentityCategoryHostAndReadyState() {
        var host = create(); var guest = join(host, "Luis"); String code = host.session().room().code();
        assertThrows(ResponseStatusException.class, () -> game.state(code, guest.token() + "bad"));
        var outsider = create();
        assertThrows(ResponseStatusException.class, () -> game.state(code, outsider.token()));
        assertThrows(ResponseStatusException.class, () -> game.choose(code, host.token(), "paises-0"));
        assertThrows(ResponseStatusException.class, () -> game.start(code, guest.token()));
        assertThrows(ResponseStatusException.class, () -> game.start(code, host.token()));
        choose(host); choose(guest); game.start(code, host.token());
        assertThrows(ResponseStatusException.class, () -> join(host, "Late"));
        assertThrows(ResponseStatusException.class, () -> game.choose(code, guest.token(), "dragon-ball-2"));
    }

    @Test
    void discardsPersistAndArePrivatePerRival() {
        var host = create(); var second = join(host, "Luis"); var third = join(host, "Sara"); String code = host.session().room().code();
        choose(host); choose(second); choose(third); game.start(code, host.token());
        var discard = new GameDtos.DiscardRequest(second.session().self().id(), "dragon-ball-1", true);
        game.discard(code, host.token(), discard); game.discard(code, host.token(), discard);
        var saved = game.state(code, host.token()).self().discards();
        assertEquals(List.of("dragon-ball-1"), saved.get(second.session().self().id()));
        assertNull(saved.get(third.session().self().id()));
        assertTrue(game.state(code, second.token()).self().discards().isEmpty());
        game.resetDiscards(code, host.token(), second.session().self().id());
        assertTrue(game.state(code, host.token()).self().discards().isEmpty());
    }

    @Test
    void leaveTransfersHostAndRevokesSession() {
        var host = create(); var guest = join(host, "Luis"); String code = host.session().room().code();
        game.leave(code, host.token());
        assertEquals(guest.session().self().id(), game.state(code, guest.token()).room().hostId());
        assertThrows(ResponseStatusException.class, () -> game.state(code, host.token()));
        var another = join(guest, "Sara"); choose(guest); choose(another); game.start(code, guest.token());
        game.leave(code, guest.token());
        var result = game.state(code, another.token());
        assertEquals("finished", result.room().phase());
        assertEquals(another.session().self().id(), result.room().winnerId());
    }

    @Test
    void concurrentJoinsNeverExceedTwelve() throws Exception {
        var host = create(); String code = host.session().room().code();
        for (int index = 1; index < 11; index++) join(host, "Jugador " + index);
        try (var executor = Executors.newFixedThreadPool(4)) {
            List<Callable<Boolean>> tasks = new ArrayList<>();
            for (int index = 0; index < 4; index++) tasks.add(() -> {
                try { game.join(code, new GameDtos.JoinRequest("Concurrente")); return true; }
                catch (ResponseStatusException exception) { return false; }
            });
            int successes = 0;
            for (Future<Boolean> result : executor.invokeAll(tasks)) if (result.get()) successes++;
            assertEquals(1, successes);
        }
        assertEquals(12, game.state(code, host.token()).room().players().size());
    }

    @Test
    void expiredTurnsSkipAndDisconnectedLobbyMembersCanBeRemoved() {
        var host = create(); var guest = join(host, "Luis"); String code = host.session().room().code();
        assertThrows(ResponseStatusException.class, () -> game.removeOffline(code, host.token(), guest.session().self().id()));
        transactions.executeWithoutResult(status -> rooms.lockByCode(code).orElseThrow().players.get(1).lastSeen = 0);
        game.removeOffline(code, host.token(), guest.session().self().id());
        assertEquals(1, game.state(code, host.token()).room().players().size());
        assertThrows(ResponseStatusException.class, () -> game.state(code, guest.token()));
        var nextGuest = join(host, "Sara"); choose(host); choose(nextGuest);
        var state = game.start(code, host.token());
        transactions.executeWithoutResult(status -> rooms.lockByCode(code).orElseThrow().turnDeadline = 0);
        var expired = game.state(code, nextGuest.token());
        assertEquals(nextGuest.session().self().id(), expired.room().turnId());
        assertTrue(expired.room().revision() > state.room().revision());
        assertThrows(ResponseStatusException.class, () -> game.pass(code, host.token(), state.room().revision()));
    }

    @Test
    void concurrentAccusationsAreProcessedOnlyOnce() throws Exception {
        var host = create(); var guest = join(host, "Luis"); String code = host.session().room().code();
        choose(host); choose(guest);
        var started = game.start(code, host.token());
        var request = new GameDtos.AccuseRequest(guest.session().self().id(), "dragon-ball-0", started.room().revision());
        try (var executor = Executors.newFixedThreadPool(2)) {
            Callable<Boolean> attempt = () -> {
                try { game.accuse(code, host.token(), request); return true; }
                catch (ResponseStatusException exception) { return false; }
            };
            int successes = 0;
            for (var result : executor.invokeAll(List.of(attempt, attempt))) if (result.get()) successes++;
            assertEquals(1, successes);
        }
        assertEquals(1, game.state(code, host.token()).room().history().size());
    }
}