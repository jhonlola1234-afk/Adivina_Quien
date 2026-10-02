package repository;

import model.Descarte;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IDescarte extends JpaRepository<Descarte, Long> {

    List<Descarte> findByJugadorId(Long jugadorId);

}