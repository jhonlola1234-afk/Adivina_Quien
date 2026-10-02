package repository;

import model.Personaje;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IPersonaje extends JpaRepository<Personaje, Long> {

    List<Personaje> findByCategoriaId(Long categoriaId);

}