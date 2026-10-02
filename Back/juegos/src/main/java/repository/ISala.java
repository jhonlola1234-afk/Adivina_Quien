package repository;

import model.Sala;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ISala extends JpaRepository<Sala, Long> {

    Optional<Sala> findByCodigo(String codigo);

}
