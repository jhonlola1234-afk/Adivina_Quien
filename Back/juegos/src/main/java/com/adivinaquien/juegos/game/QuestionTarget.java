package com.adivinaquien.juegos.game;

import jakarta.persistence.Embeddable;

@Embeddable
class QuestionTarget {
    String actorId;
    String targetId;

    protected QuestionTarget() {}

    QuestionTarget(String actorId, String targetId) {
        this.actorId = actorId;
        this.targetId = targetId;
    }
}
