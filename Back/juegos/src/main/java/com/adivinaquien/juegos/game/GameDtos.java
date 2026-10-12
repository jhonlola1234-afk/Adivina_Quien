package com.adivinaquien.juegos.game;

import jakarta.validation.constraints.*;
import java.util.List;
import java.util.Map;

public final class GameDtos {
    private GameDtos() {}

    public record CreateRequest(@NotBlank @Size(max = 24) String name, @NotBlank String category) {}
    public record JoinRequest(@NotBlank @Size(max = 24) String name) {}
    public record SecretRequest(@NotBlank String secret) {}
    public record TurnRequest(@NotNull @PositiveOrZero Long revision) {}
    public record AccuseRequest(@NotBlank String targetId, @NotBlank String secret, @NotNull @PositiveOrZero Long revision) {}
    public record DiscardRequest(@NotBlank String targetId, @NotBlank String characterId, @NotNull Boolean discarded) {}
    public record ResetRequest(@NotBlank String targetId) {}
    public record CharacterView(String id, String name, String image) {}
    public record CategoryView(String id, List<CharacterView> characters) {}
    public record PlayerView(String id, String name, boolean ready, boolean eliminated, boolean departed, boolean online) {}
    public record EventView(String id, String actorId, String targetId, String secret, boolean correct) {}
    public record RoomView(String code, String category, String hostId, String phase, List<PlayerView> players,
                           String turnId, String winnerId, List<EventView> history, long revision, long turnDeadline,
                           Map<String, String> questionTargets) {}
    public record SelfView(String id, String name, String secret, Map<String, List<String>> discards) {}
    public record SessionView(RoomView room, SelfView self) {}
    public record EntryView(String token, SessionView session) {}
    public record ErrorView(String message) {}
}