const archive = "https://github.com/pmilovanov/hermitage-art/blob/b8ead49c010eac0c8366bafc4ffaaf1f1a447805/";

// Nocturne collection: original colour is retained in every reproduction.
export const artworks = [
  {"id": "rembrandt-red", "room": "pavilion", "title": "Portrait of an Old Man in Red", "artist": "Rembrandt van Rijn", "date": "c. 1652–1654", "medium": "Oil on canvas", "pixels": [6203, 8132], "sourceFile": "Rembrandt_Harmensz._van_Rijn_-_Portrait_of_an_Old_Man_in_Red.jpg", "description": "A red cloak emerges from almost-black shadow. The portrait brings the first room down to a quiet encounter with a person, colour and light."},
  {"id": "caravaggio-lute", "room": "pavilion", "title": "The Lute Player", "artist": "Caravaggio", "date": "c. 1595–1596", "medium": "Oil on canvas", "pixels": [8007, 6217], "sourceFile": "Caravaggio,_Michelangelo_Merisi_da_-_The_Lute-Player.jpg", "description": "A face, a hand and a stringed instrument emerge from darkness. The restrained light gives the smallest gestures a strong presence."},
  {"id": "matisse-dance", "room": "orbit", "title": "Dance", "artist": "Henri Matisse", "date": "1910", "medium": "Oil on canvas", "pixels": [9567, 6425], "sourceFile": "Matisse,_Henri_-_The_Dance.jpg", "description": "Five red figures form a continuous circle. The spare arrangement of red, green and blue gives the room its pulse."},
  {"id": "kandinsky-murnau", "room": "orbit", "title": "View of Murnau", "artist": "Wassily Kandinsky", "date": "1908", "medium": "Oil on canvas", "pixels": [4509, 3365], "sourceFile": "Kandinsky,_Vasily_-_View_of_Murnau.jpg", "description": "A landscape becomes a meeting of deep violet, red and blue. The dark lines hold the fields of colour together."},
  {"id": "renoir-black", "room": "garden", "title": "Woman in Black", "artist": "Pierre-Auguste Renoir", "date": "c. 1876", "medium": "Oil on canvas", "pixels": [5332, 6342], "sourceFile": "Renoir,_Pierre-Auguste_-_Woman_in_Black.jpg", "description": "Black fabric, pale skin and a restrained background create a close, intimate portrait. The eye adjusts to the small variations within the dark."},
  {"id": "matisse-coffeehouse", "room": "garden", "title": "Arab Coffeehouse", "artist": "Henri Matisse", "date": "1913", "medium": "Oil on canvas", "pixels": [8124, 6803], "sourceFile": "Matisse,_Henri_-_Arab_Coffeehouse.jpg", "description": "A few figures and objects rest in a broad field of muted colour. Slow lines and open space make a quiet counterpoint to the scarlet room."},
  {"id": "rembrandt-return", "room": "prism", "title": "The Return of the Prodigal Son", "artist": "Rembrandt van Rijn", "date": "c. 1668–1669", "medium": "Oil on canvas", "pixels": [6309, 8218], "sourceFile": "Rembrandt_Harmensz._van_Rijn_-_The_Return_of_the_Prodigal_Son.jpg", "description": "A red cloak and a pair of hands emerge from the shadow. The painting holds a moment of return, recognition and care."},
  {"id": "leger-composition", "room": "prism", "title": "Composition", "artist": "Fernand Léger", "date": "20th century", "medium": "Oil on canvas", "pixels": [3359, 4238], "sourceFile": "Leger,_Fernand_-_Composition.jpg", "description": "Dark outlines, contrasting shapes and concentrated colour turn the surface into an arrangement of weight and rhythm. The source archive does not record a precise date."},
 ].map((artwork, index) => ({
  ...artwork, number: String(index + 1).padStart(2, "0"),
  collection: "State Hermitage Museum", reproduction: "Digital reproduction · Public-domain work",
  wallImage: `artworks/${artwork.id}-wall.webp`, image: `artworks/${artwork.id}-detail.webp`,
  source: archive + encodeURIComponent(artwork.sourceFile),
  position: [-9.67, 2.1, index % 2 === 0 ? -4.6 : 3.6], rotation: Math.PI / 2,
}));

export function artworkSize(artwork) {
  const aspect = artwork.pixels[0] / artwork.pixels[1];
  const height = Math.min(2.65, 3.8 / aspect);
  return { width: height * aspect, height };
}

export function artworkView(artwork) {
  return { id: `${artwork.room}-artworks`, room: artwork.room, walk: true,
    position: [-4.5, 1.72, artwork.position[2]], target: [...artwork.position] };
}
