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
    @Lob
    @Basic(fetch = FetchType.LAZY)
    byte[] imageData;
    @Column(nullable = false)
    String imageContentType;

    protected GameCharacter() {}

    GameCharacter(String id, String category, String name) {
        this.id = id;
        this.category = category;
        this.name = name;
        this.imageData = new byte[0];
        this.imageContentType = "image/svg+xml";
    }
}