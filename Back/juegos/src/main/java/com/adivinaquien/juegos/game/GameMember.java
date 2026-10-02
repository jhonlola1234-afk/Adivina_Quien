package com.adivinaquien.juegos.game;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "game_members")
class GameMember {
    @Id
    String id;
    @Column(nullable = false, length = 24)
    String name;
    @Column(nullable = false, length = 64)
    String tokenHash;
    String secret;
    boolean eliminated;
    boolean departed;
    long lastSeen;
    @ElementCollection
    @CollectionTable(name = "game_discards", joinColumns = @JoinColumn(name = "member_id"))
    List<PrivateDiscard> discards = new ArrayList<>();

    protected GameMember() {}
}