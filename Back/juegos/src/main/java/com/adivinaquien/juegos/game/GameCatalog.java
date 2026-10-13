package com.adivinaquien.juegos.game;

import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class GameCatalog implements ApplicationRunner {
    static final Map<String, List<String>> NAMES = Map.of(
        "dragon-ball", List.of("Goku", "Vegeta", "Gohan", "Piccolo", "Krillin", "Bulma", "Trunks", "Goten", "Freezer", "Cell", "Majin Buu", "Androide 18", "Androide 17", "Yamcha", "Tenshinhan", "Chaoz", "Maestro Roshi", "Beerus", "Whis", "Broly", "Bardock", "Raditz", "Nappa", "Videl", "Mr. Satan", "Pan", "Caulifla", "Kale", "Jiren", "Hit"),
        "terror", List.of("Freddy Krueger", "Jason Voorhees", "Michael Myers", "Chucky", "Pennywise", "Ghostface", "Leatherface", "Pinhead", "Annabelle", "Valak", "Jigsaw", "Samara Morgan", "Carrie", "Candyman", "Hannibal Lecter", "Regan MacNeil", "Frankenstein", "El hombre lobo", "Slender Man", "Springtrap", "Kayako Saeki", "Sadako Yamamura", "Ash Williams", "Esther Coleman", "Art the Clown", "The Babadook", "Pyramid Head", "Nemesis", "Xenomorfo", "Pumpkinhead"),
        "cantantes", List.of("Shakira", "Bad Bunny", "Taylor Swift", "Karol G", "Bruno Mars", "Adele", "Michael Jackson", "Beyonce", "The Weeknd", "Rihanna", "Ed Sheeran", "Dua Lipa", "Luis Miguel", "Daddy Yankee", "Ariana Grande", "Lady Gaga", "Justin Bieber", "Rosalia", "Harry Styles", "Freddie Mercury", "Selena Gomez", "Billie Eilish", "Sia", "Camilo", "Feid", "Anuel AA", "Juanes", "Celia Cruz", "Elvis Presley", "Bob Marley"),
        "famosos", List.of("Lionel Messi", "Cristiano Ronaldo", "Dwayne Johnson", "Emma Watson", "Leonardo DiCaprio", "Zendaya", "Tom Holland", "Robert Downey Jr.", "Will Smith", "Angelina Jolie", "Brad Pitt", "Jennifer Aniston", "Keanu Reeves", "Margot Robbie", "Johnny Depp", "Scarlett Johansson", "Jackie Chan", "Serena Williams", "LeBron James", "Pedro Pascal", "Morgan Freeman", "Natalie Portman", "Chris Evans", "Gal Gadot", "Neymar", "Kylian Mbappe", "Ana de Armas", "Ryan Gosling", "Millie Bobby Brown", "Cillian Murphy"),
        "paises", List.of("Colombia", "Mexico", "Argentina", "Brasil", "Espana", "Francia", "Alemania", "Italia", "Japon", "China", "Estados Unidos", "Canada", "Reino Unido", "Australia", "Corea del Sur", "India", "Egipto", "Sudafrica", "Peru", "Chile", "Rusia", "Portugal", "Paises Bajos", "Suecia", "Noruega", "Turquia", "Arabia Saudita", "Nueva Zelanda", "Venezuela", "Ecuador"),
        "series-infantiles", List.of("Bob Esponja", "Patricio", "Calamardo", "Arenita", "Don Cangrejo", "Plankton", "Timmy Turner", "Cosmo", "Wanda", "Tommy Pickles", "Chuckie Finster", "Dora", "Botas", "Peppa Pig", "George Pig", "Blue", "Steve", "Gumball", "Darwin", "Finn", "Ben 10", "Gwen Tennyson", "Mordecai", "Rigby", "Steven Universe", "Perla", "Jake el perro", "Marceline", "Aang", "Katara"),
        "filosofos", List.of("Socrates", "Platon", "Aristoteles", "Confucio", "Lao-Tse", "Hipatia", "San Agustin", "Tomas de Aquino", "Maquiavelo", "Rene Descartes", "John Locke", "David Hume", "Immanuel Kant", "Georg Hegel", "Soren Kierkegaard", "Karl Marx", "Friedrich Nietzsche", "Simone de Beauvoir", "Hannah Arendt", "Michel Foucault", "Thomas Hobbes", "Jean-Jacques Rousseau", "Baruch Spinoza", "Voltaire", "Arthur Schopenhauer", "John Stuart Mill", "Bertrand Russell", "Ludwig Wittgenstein", "Albert Camus", "Judith Butler"),
        "pokemon", List.of("Pikachu", "Charizard", "Bulbasaur", "Squirtle", "Charmander", "Jigglypuff", "Meowth", "Psyduck", "Snorlax", "Eevee", "Mewtwo", "Gengar", "Lucario", "Greninja", "Garchomp", "Blaziken", "Dragonite", "Lapras", "Rayquaza", "Gardevoir", "Tyranitar", "Metagross", "Salamence", "Infernape", "Zoroark", "Sylveon", "Decidueye", "Cinderace", "Tinkaton", "Miraidon")
    );
    private final GameCharacterRepository characters;

    public GameCatalog(GameCharacterRepository characters) {
        this.characters = characters;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments arguments) {
        NAMES.forEach((category, names) -> IntStream.range(0, names.size()).forEach(index -> {
            String id = category + "-" + index;
            String name = names.get(index);
            var existing = characters.findById(id);
            if (existing.isEmpty()) {
                characters.save(new GameCharacter(id, category, name));
                return;
            }
            GameCharacter character = existing.get();
            if (!character.category.equals(category) || !character.name.equals(name)) {
                character.category = category;
                character.name = name;
                characters.save(character);
            }
        }));
    }

    @Transactional(readOnly = true)
    public List<GameDtos.CategoryView> list() {
        return NAMES.keySet().stream().sorted().map(category -> new GameDtos.CategoryView(category,
            characters.findAllByCategory(category).stream()
                .sorted(java.util.Comparator.comparingInt(character -> Integer.parseInt(character.id.substring(category.length() + 1))))
                .map(character -> new GameDtos.CharacterView(character.id, character.name, null)).toList())).toList();
    }
}
