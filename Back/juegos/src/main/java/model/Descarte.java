package model;

import jakarta.persistence.*;

@Entity
@Table(
        name = "descartes",
        uniqueConstraints = {
                @UniqueConstraint(
                        columnNames = {"jugador_id", "personaje_id"}
                )
        }
)
public class Descarte {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "jugador_id", nullable = false)
    private Jugador jugador;

    @ManyToOne
    @JoinColumn(name = "personaje_id", nullable = false)
    private Personaje personaje;

    public Descarte() {
    }

    public Descarte(Jugador jugador, Personaje personaje) {
        this.jugador = jugador;
        this.personaje = personaje;
    }

    public Long getId() {
        return id;
    }

    public Jugador getJugador() {
        return jugador;
    }

    public void setJugador(Jugador jugador) {
        this.jugador = jugador;
    }

    public Personaje getPersonaje() {
        return personaje;
    }

    public void setPersonaje(Personaje personaje) {
        this.personaje = personaje;
    }
}