package com.adivinaquien.juegos.game;

import jakarta.persistence.Embeddable;

@Embeddable
class GuessEvent {
    String id;
    String actorId;
    String targetId;
    String secret;
    boolean correct;

    protected GuessEvent() {}

    GuessEvent(String id, String actorId, String targetId, String secret, boolean correct) {
        this.id = id;
        this.actorId = actorId;
        this.targetId = targetId;
        this.secret = secret;
        this.correct = correct;
    }
}