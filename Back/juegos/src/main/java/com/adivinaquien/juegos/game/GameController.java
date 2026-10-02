package com.adivinaquien.juegos.game;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class GameController {
    private final GameService game;
    private final GameCatalog catalog;

    public GameController(GameService game, GameCatalog catalog) {
        this.game = game;
        this.catalog = catalog;
    }

    @GetMapping("/health")
    public java.util.Map<String, String> health() { return java.util.Map.of("status", "ok"); }

    @GetMapping("/categories")
    public List<GameDtos.CategoryView> categories() { return catalog.list(); }

    @PostMapping("/rooms")
    @ResponseStatus(HttpStatus.CREATED)
    public GameDtos.EntryView create(@Valid @RequestBody GameDtos.CreateRequest request) { return game.create(request); }

    @PostMapping("/rooms/{code}/join")
    public GameDtos.EntryView join(@PathVariable String code, @Valid @RequestBody GameDtos.JoinRequest request) { return game.join(code, request); }

    @GetMapping("/rooms/{code}/session")
    public GameDtos.SessionView state(@PathVariable String code, @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        return game.state(code, token(authorization));
    }

    @PutMapping("/rooms/{code}/secret")
    public GameDtos.SessionView choose(@PathVariable String code, @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                                       @Valid @RequestBody GameDtos.SecretRequest request) { return game.choose(code, token(authorization), request.secret()); }

    @PostMapping("/rooms/{code}/start")
    public GameDtos.SessionView start(@PathVariable String code, @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) { return game.start(code, token(authorization)); }

    @PostMapping("/rooms/{code}/pass")
    public GameDtos.SessionView pass(@PathVariable String code, @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                                     @Valid @RequestBody GameDtos.TurnRequest request) { return game.pass(code, token(authorization), request.revision()); }

    @PostMapping("/rooms/{code}/accuse")
    public GameDtos.SessionView accuse(@PathVariable String code, @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                                       @Valid @RequestBody GameDtos.AccuseRequest request) { return game.accuse(code, token(authorization), request); }

    @PutMapping("/rooms/{code}/discards")
    public GameDtos.SessionView discard(@PathVariable String code, @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                                        @Valid @RequestBody GameDtos.DiscardRequest request) { return game.discard(code, token(authorization), request); }

    @PostMapping("/rooms/{code}/discards/reset")
    public GameDtos.SessionView reset(@PathVariable String code, @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                                      @Valid @RequestBody GameDtos.ResetRequest request) { return game.resetDiscards(code, token(authorization), request.targetId()); }

    @PostMapping("/rooms/{code}/leave")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leave(@PathVariable String code, @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) { game.leave(code, token(authorization)); }

    @PostMapping("/rooms/{code}/rematch")
    public GameDtos.SessionView rematch(@PathVariable String code, @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) { return game.rematch(code, token(authorization)); }

    @PostMapping("/rooms/{code}/kick")
    public GameDtos.SessionView removeOffline(@PathVariable String code, @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                                              @Valid @RequestBody GameDtos.ResetRequest request) { return game.removeOffline(code, token(authorization), request.targetId()); }

    private String token(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Falta la sesion del jugador.");
        return authorization.substring(7);
    }
}