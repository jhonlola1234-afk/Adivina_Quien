package com.adivinaquien.juegos.game;

import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingRequestHeaderException;

@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<GameDtos.ErrorView> rule(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode()).body(new GameDtos.ErrorView(exception.getReason()));
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<GameDtos.ErrorView> invalid(Exception exception) {
        return ResponseEntity.badRequest().body(new GameDtos.ErrorView("Datos no validos. Revisa el nombre y los campos enviados."));
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<GameDtos.ErrorView> noSession(Exception exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new GameDtos.ErrorView("Falta la sesion del jugador."));
    }
}