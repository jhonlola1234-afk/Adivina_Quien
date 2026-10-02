const entries = {
  'dragon-ball': {
    name: 'Dragon Ball', tag: 'Anime', color: '#ed854b', icon: 'sparkles',
    names: ['Goku', 'Vegeta', 'Gohan', 'Piccolo', 'Krillin', 'Bulma', 'Trunks', 'Goten', 'Freezer', 'Cell', 'Majin Buu', 'Androide 18', 'Androide 17', 'Yamcha', 'Tenshinhan', 'Chaoz', 'Maestro Roshi', 'Beerus', 'Whis', 'Broly'],
    wiki: ['Goku', 'Vegeta', 'Gohan', 'Piccolo (Dragon Ball)', 'Krillin', 'Bulma', 'Trunks (Dragon Ball)', 'Goten', 'Frieza', 'Cell (Dragon Ball)', 'Majin Buu', 'Android 18', 'Android 17', 'Yamcha', 'Tien Shinhan', 'Chiaotzu', 'Master Roshi', 'Beerus', 'Whis', 'Broly'],
    cover: 'https://dragonball-api.com/characters/goku_normal.webp',
  },
  terror: {
    name: 'Personajes de terror', tag: 'Cine & videojuegos', color: '#67776b', icon: 'ghost',
    names: ['Freddy Krueger', 'Jason Voorhees', 'Michael Myers', 'Chucky', 'Pennywise', 'Ghostface', 'Leatherface', 'Pinhead', 'Annabelle', 'Valak', 'Jigsaw', 'Samara Morgan', 'Carrie White', 'Norman Bates', 'Hannibal Lecter', 'Drácula', 'Frankenstein', 'El hombre lobo', 'Slender Man', 'Springtrap'],
    wiki: ['Freddy Krueger', 'Jason Voorhees', 'Michael Myers (Halloween)', 'Chucky (character)', 'It (character)', 'Ghostface (identity)', 'Leatherface', 'Pinhead (Hellraiser)', 'Annabelle (doll)', 'Valak', 'Jigsaw (Saw character)', 'Samara Morgan', 'Carrie White', 'Norman Bates', 'Hannibal Lecter', 'Count Dracula', "Frankenstein's monster", 'Werewolf', 'Slender Man', 'Five Nights at Freddy\'s 3'],
    cover: 'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=600&auto=format&fit=crop&q=80',
  },
  cantantes: {
    name: 'Cantantes', tag: 'Música', color: '#da5d88', icon: 'mic',
    names: ['Shakira', 'Bad Bunny', 'Taylor Swift', 'Karol G', 'Bruno Mars', 'Adele', 'Michael Jackson', 'Beyoncé', 'The Weeknd', 'Rihanna', 'Ed Sheeran', 'Dua Lipa', 'Luis Miguel', 'Daddy Yankee', 'Ariana Grande', 'Lady Gaga', 'Justin Bieber', 'Rosalía', 'Harry Styles', 'Freddie Mercury'],
    wiki: ['Shakira', 'Bad Bunny', 'Taylor Swift', 'Karol G', 'Bruno Mars', 'Adele', 'Michael Jackson', 'Beyoncé', 'The Weeknd', 'Rihanna', 'Ed Sheeran', 'Dua Lipa', 'Luis Miguel', 'Daddy Yankee', 'Ariana Grande', 'Lady Gaga', 'Justin Bieber', 'Rosalía', 'Harry Styles', 'Freddie Mercury'],
    cover: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/2023-11-16_Gala_de_los_Latin_Grammy%2C_03_%28cropped%2902.jpg/500px-2023-11-16_Gala_de_los_Latin_Grammy%2C_03_%28cropped%2902.jpg',
  },
  famosos: {
    name: 'Famosos', tag: 'Cine, deporte & más', color: '#388bd5', icon: 'star',
    names: ['Lionel Messi', 'Cristiano Ronaldo', 'Dwayne Johnson', 'Emma Watson', 'Leonardo DiCaprio', 'Zendaya', 'Tom Holland', 'Robert Downey Jr.', 'Will Smith', 'Angelina Jolie', 'Brad Pitt', 'Jennifer Aniston', 'Keanu Reeves', 'Margot Robbie', 'Johnny Depp', 'Scarlett Johansson', 'Jackie Chan', 'Serena Williams', 'LeBron James', 'Pedro Pascal'],
    wiki: ['Lionel Messi', 'Cristiano Ronaldo', 'Dwayne Johnson', 'Emma Watson', 'Leonardo DiCaprio', 'Zendaya', 'Tom Holland', 'Robert Downey Jr.', 'Will Smith', 'Angelina Jolie', 'Brad Pitt', 'Jennifer Aniston', 'Keanu Reeves', 'Margot Robbie', 'Johnny Depp', 'Scarlett Johansson', 'Jackie Chan', 'Serena Williams', 'LeBron James', 'Pedro Pascal'],
    cover: 'https://upload.wikimedia.org/wikipedia/commons/7/7f/Emma_Watson_2013.jpg',
  },
  paises: {
    name: 'Países', tag: 'Alrededor del mundo', color: '#21a58c', icon: 'globe',
    names: ['Colombia', 'México', 'Argentina', 'Brasil', 'España', 'Francia', 'Alemania', 'Italia', 'Japón', 'China', 'Estados Unidos', 'Canadá', 'Reino Unido', 'Australia', 'Corea del Sur', 'India', 'Egipto', 'Sudáfrica', 'Perú', 'Chile'],
    codes: ['co', 'mx', 'ar', 'br', 'es', 'fr', 'de', 'it', 'jp', 'cn', 'us', 'ca', 'gb', 'au', 'kr', 'in', 'eg', 'za', 'pe', 'cl'],
    cover: 'https://flagcdn.com/w640/br.png',
  },
};

export const categories = Object.entries(entries).map(([id, entry]) => ({
  ...entry, id,
  characters: entry.names.map((name, index) => ({ id: `${id}-${index}`, name, wiki: entry.wiki?.[index], image: entry.codes ? `https://flagcdn.com/w320/${entry.codes[index]}.png` : null })),
}));
export const getCategory = id => categories.find(category => category.id === id);

export async function loadPortraits(category, signal) {
  if (category.id === 'paises') return {};
  if (category.id === 'dragon-ball') {
    const response = await fetch('https://dragonball-api.com/api/characters?limit=100', { signal });
    if (!response.ok) throw new Error('No se pudieron cargar las imágenes.');
    const { items } = await response.json();
    const aliases = { 'Freezer': 'Frieza', 'Krillin': 'Krilin', 'Cell': 'Celula', 'Beerus': 'Bills', 'Majin Buu': 'Majin Buu', 'Maestro Roshi': 'Master Roshi', 'Androide 18': 'Android 18', 'Androide 17': 'Android 17', 'Chaoz': 'Chiaotzu', 'Tenshinhan': 'Tien Shinhan' };
    return Object.fromEntries(category.characters.map(character => [character.id, items.find(item => [character.name.toLowerCase(), aliases[character.name]?.toLowerCase()].includes(item.name.toLowerCase()))?.image]));
  }
  const params = new URLSearchParams({ action: 'query', format: 'json', origin: '*', prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '400', redirects: '1', titles: category.wiki.join('|') });
  const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, { signal });
  if (!response.ok) throw new Error('No se pudieron cargar las imágenes.');
  const data = await response.json();
  const pages = Object.values(data.query?.pages || {});
  const redirects = data.query?.redirects || [];
  const normalized = data.query?.normalized || [];
  return Object.fromEntries(category.characters.map(character => {
    let title = normalized.find(item => item.from === character.wiki)?.to || character.wiki;
    title = redirects.find(item => item.from === title)?.to || title;
    return [character.id, pages.find(page => page.title === title)?.thumbnail?.source];
  }));
}