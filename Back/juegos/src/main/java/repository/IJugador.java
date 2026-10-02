package repository;

import model.Jugador;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IJugador extends JpaRepository<Jugador, Long> {

    List<Jugador> findBySalaId(Long salaId);

}