package repository;
import model.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ICategoria extends JpaRepository<Categoria, Long> {

}