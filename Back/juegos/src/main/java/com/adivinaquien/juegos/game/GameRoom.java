package com.adivinaquien.juegos.game;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "game_rooms")
class GameRoom {
    @Id
    String code;
    @Column(nullable = false)
    String category;
    @Column(nullable = false)
    String phase = "lobby";
    String hostId;
    String turnId;
    String winnerId;
    long revision;
    long turnDeadline;
    long updatedAt;
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "room_code")
    @OrderColumn(name = "seat_index")
    List<GameMember> players = new ArrayList<>();
    @ElementCollection
    @CollectionTable(name = "game_guesses", joinColumns = @JoinColumn(name = "room_code"))
    @OrderColumn(name = "event_index")
    List<GuessEvent> history = new ArrayList<>();
    @ElementCollection
    @CollectionTable(name = "game_question_targets", joinColumns = @JoinColumn(name = "room_code"))
    List<QuestionTarget> questionTargets = new ArrayList<>();

    protected GameRoom() {}
}