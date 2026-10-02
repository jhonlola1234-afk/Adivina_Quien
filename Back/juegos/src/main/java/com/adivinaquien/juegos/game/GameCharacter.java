package com.adivinaquien.juegos.game;

import jakarta.persistence.*;

@Entity
@Table(name = "game_characters")
class GameCharacter {
    @Id
    String id;
    @Column(nullable = false)
    String category;
    @Column(nullable = false)
    String name;

    protected GameCharacter() {}

    GameCharacter(String id, String category, String name) {
        this.id = id;
        this.category = category;
        this.name = name;
    }
}