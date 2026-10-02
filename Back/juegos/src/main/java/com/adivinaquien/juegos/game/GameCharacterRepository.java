package com.adivinaquien.juegos.game;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface GameCharacterRepository extends JpaRepository<GameCharacter, String> {
    boolean existsByIdAndCategory(String id, String category);
    List<GameCharacter> findAllByCategory(String category);
}