const archive = "https://github.com/pmilovanov/hermitage-art/blob/b8ead49c010eac0c8366bafc4ffaaf1f1a447805/";

export const artworks = [
  {
    id: "monet-waterloo", room: "pavilion", title: "Waterloo Bridge, Effect of Fog",
    artist: "Claude Monet", date: "1903", medium: "Oil on canvas", pixels: [4818, 3090],
    sourceFile: "Monet,_Claude_-_Waterloo_Bridge._Effect_of_Fog.jpg",
    description: "Mist turns the bridge and its reflection into a study of light. Look at the small changes of colour between the sky, the river, and the city beyond.",
  },
  {
    id: "friedrich-sailing", room: "pavilion", title: "On a Sailing Ship",
    artist: "Caspar David Friedrich", date: "c. 1818–1819", medium: "Oil on canvas", pixels: [4359, 5611],
    sourceFile: "Friedrich,_Caspar_David_-_On_a_Sailing_Ship.jpg",
    description: "Two figures face the distant shore. The boat draws the eye into the image, while the open sky leaves room for quiet and anticipation.",
  },
  {
    id: "kandinsky-composition", room: "orbit", title: "Composition VI",
    artist: "Wassily Kandinsky", date: "1913", medium: "Oil on canvas", pixels: [9493, 6317],
    sourceFile: "Kandinsky,_Vasily_-_Composition_VI.jpg",
    description: "Colour and line move across a dense, sweeping composition. Follow the curved forms and notice how small marks gather into larger rhythms.",
  },
  {
    id: "kandinsky-winter", room: "orbit", title: "Winter Landscape",
    artist: "Wassily Kandinsky", date: "1909", medium: "Oil on canvas", pixels: [6823, 4985],
    sourceFile: "Kandinsky,_Vasily_-_Winter_Landscape.jpg",
    description: "A winter scene becomes a meeting of vivid colour and simplified shapes. The painting offers a quieter counterpoint to the movement of Composition VI.",
  },
  {
    id: "monet-garden", room: "garden", title: "Corner of the Garden at Montgeron",
    artist: "Claude Monet", date: "1876", medium: "Oil on canvas", pixels: [7395, 6668],
    sourceFile: "Monet,_Claude_-_Corner_of_the_Garden_at_Montgeron.jpg",
    description: "Water, leaves, and flowers share the light. Look closely at the reflections: the garden continues below the surface in a different arrangement of brushstrokes.",
  },
  {
    id: "vangogh-lilac", room: "garden", title: "Lilac Bush",
    artist: "Vincent van Gogh", date: "1889", medium: "Oil on canvas", pixels: [7503, 5942],
    sourceFile: "Gogh,_Vincent_van_-_Lilac_Bush.jpg",
    description: "Short, energetic marks give the lilac its density and movement. Violet blossoms and varied greens create a close, immersive view of the garden.",
  },
  {
    id: "matisse-red-room", room: "prism", title: "The Red Room (Harmony in Red)",
    artist: "Henri Matisse", date: "1908", medium: "Oil on canvas", pixels: [5735, 4725],
    sourceFile: "Matisse,_Henri_-_The_Red_Room_(Harmony_in_Red).jpg",
    description: "Red spreads across the table and wall, bringing separate surfaces into one field of colour. Blue ornament and the green view outside give the room its contrasts.",
  },
  {
    id: "cezanne-still-life", room: "prism", title: "Still Life with a Curtain",
    artist: "Paul Cézanne", date: "c. 1895", medium: "Oil on canvas", pixels: [3176, 2315],
    sourceFile: "Cezanne,_Paul_-_Still_Life_with_a_Curtain.jpg",
    description: "Fruit, vessels, and folded fabric become a study of weight and structure. Notice how the different viewpoints make the table feel carefully balanced and slightly unsettled.",
  },
].map((artwork, index) => ({
  ...artwork, number: String(index + 1).padStart(2, "0"),
  collection: "State Hermitage Museum", reproduction: "Digital reproduction · Public-domain work",
  wallImage: `artworks/${artwork.id}-wall.webp`, image: `artworks/${artwork.id}-detail.webp`,
  source: archive + encodeURIComponent(artwork.sourceFile),
  position: [-9.67, 3.35, index % 2 === 0 ? -4.6 : 3.6], rotation: Math.PI / 2,
}));

export function artworkSize(artwork) {
  const aspect = artwork.pixels[0] / artwork.pixels[1];
  const height = Math.min(2.9, 3.8 / aspect);
  return { width: height * aspect, height };
}

export function artworkView(artwork) {
  return { id: `${artwork.room}-artworks`, room: artwork.room,
    position: [-4.5, 3.35, artwork.position[2]], target: [...artwork.position] };
}
