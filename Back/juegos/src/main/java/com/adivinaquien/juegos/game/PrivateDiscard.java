package com.adivinaquien.juegos.game;

import jakarta.persistence.Embeddable;

@Embeddable
class PrivateDiscard {
    String targetId;
    String characterId;

    protected PrivateDiscard() {}

    PrivateDiscard(String targetId, String characterId) {
        this.targetId = targetId;
        this.characterId = characterId;
    }
}