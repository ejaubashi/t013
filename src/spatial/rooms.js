export const rooms = [
  { id: "pavilion", name: "Nocturne Hall", short: "Nocturne", number: "01", entry: "arrival", description: "A face. A red cloak. A pool of light.", portals: [
    { to: "orbit", position: [-8.4, 2.7, -9.76] },
    { to: "garden", position: [8.4, 2.7, -9.76] },
  ] },
  { id: "orbit", name: "Scarlet Room", short: "Scarlet", number: "02", entry: "orbit-arrival", description: "Satin geometry. Fields of red and blue.", portals: [
    { to: "pavilion", position: [-8.4, 2.7, -9.76] },
    { to: "garden", position: [8.4, 2.7, -9.76] },
  ] },
  { id: "garden", name: "Night Garden", short: "Garden", number: "03", entry: "garden-arrival", description: "Moonlight. Paper forms. A quieter colour.", portals: [
    { to: "pavilion", position: [-8.4, 2.7, -9.76] },
    { to: "prism", position: [8.4, 2.7, -9.76] },
  ] },
  { id: "prism", name: "Obsidian Room", short: "Obsidian", number: "04", entry: "prism-arrival", description: "Dark glass. The last trace of colour.", portals: [
    { to: "garden", position: [-8.4, 2.7, -9.76] },
    { to: "pavilion", position: [8.4, 2.7, -9.76] },
  ] },
];

export const roomForView = (view) => view?.room || "pavilion";
