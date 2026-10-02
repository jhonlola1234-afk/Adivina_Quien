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
        "dragon-ball", List.of("Goku", "Vegeta", "Gohan", "Piccolo", "Krillin", "Bulma", "Trunks", "Goten", "Freezer", "Cell", "Majin Buu", "Androide 18", "Androide 17", "Yamcha", "Tenshinhan", "Chaoz", "Maestro Roshi", "Beerus", "Whis", "Broly"),
        "terror", List.of("Freddy Krueger", "Jason Voorhees", "Michael Myers", "Chucky", "Pennywise", "Ghostface", "Leatherface", "Pinhead", "Annabelle", "Valak", "Jigsaw", "Samara Morgan", "Carrie White", "Norman Bates", "Hannibal Lecter", "Drácula", "Frankenstein", "El hombre lobo", "Slender Man", "Springtrap"),
        "cantantes", List.of("Shakira", "Bad Bunny", "Taylor Swift", "Karol G", "Bruno Mars", "Adele", "Michael Jackson", "Beyoncé", "The Weeknd", "Rihanna", "Ed Sheeran", "Dua Lipa", "Luis Miguel", "Daddy Yankee", "Ariana Grande", "Lady Gaga", "Justin Bieber", "Rosalía", "Harry Styles", "Freddie Mercury"),
        "famosos", List.of("Lionel Messi", "Cristiano Ronaldo", "Dwayne Johnson", "Emma Watson", "Leonardo DiCaprio", "Zendaya", "Tom Holland", "Robert Downey Jr.", "Will Smith", "Angelina Jolie", "Brad Pitt", "Jennifer Aniston", "Keanu Reeves", "Margot Robbie", "Johnny Depp", "Scarlett Johansson", "Jackie Chan", "Serena Williams", "LeBron James", "Pedro Pascal"),
        "paises", List.of("Colombia", "México", "Argentina", "Brasil", "España", "Francia", "Alemania", "Italia", "Japón", "China", "Estados Unidos", "Canadá", "Reino Unido", "Australia", "Corea del Sur", "India", "Egipto", "Sudáfrica", "Perú", "Chile")
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
            if (!characters.existsById(id)) characters.save(new GameCharacter(id, category, names.get(index)));
        }));
    }

    @Transactional(readOnly = true)
    public List<GameDtos.CategoryView> list() {
        return NAMES.keySet().stream().sorted().map(category -> new GameDtos.CategoryView(category,
            characters.findAllByCategory(category).stream()
                .sorted(java.util.Comparator.comparingInt(character -> Integer.parseInt(character.id.substring(category.length() + 1))))
                .map(character -> new GameDtos.CharacterView(character.id, character.name)).toList())).toList();
    }
}