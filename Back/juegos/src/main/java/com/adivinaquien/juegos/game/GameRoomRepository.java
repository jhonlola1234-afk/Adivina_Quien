package com.adivinaquien.juegos.game;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface GameRoomRepository extends JpaRepository<GameRoom, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select room from GameRoom room where room.code = :code")
    Optional<GameRoom> lockByCode(@Param("code") String code);
}