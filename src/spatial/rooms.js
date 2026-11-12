export const rooms = [
  { id: "pavilion", name: "Lumen Pavilion", short: "Pavilion", number: "01", entry: "arrival", description: "Memory, held in light.", portals: [
    { to: "orbit", position: [-8.4, 2.7, -9.76] },
    { to: "garden", position: [8.4, 2.7, -9.76] },
  ] },
  { id: "orbit", name: "Orbit Hall", short: "Orbit Hall", number: "02", entry: "orbit-arrival", description: "A constellation of golden orbits.", portals: [
    { to: "pavilion", position: [-8.4, 2.7, -9.76] },
    { to: "garden", position: [8.4, 2.7, -9.76] },
  ] },
  { id: "garden", name: "Sky Garden", short: "Sky Garden", number: "03", entry: "garden-arrival", description: "An open sky. A thousand floating petals.", portals: [
    { to: "pavilion", position: [-8.4, 2.7, -9.76] },
    { to: "prism", position: [8.4, 2.7, -9.76] },
  ] },
  { id: "prism", name: "Prism Chamber", short: "Prism", number: "04", entry: "prism-arrival", description: "One light. A world of colour.", portals: [
    { to: "garden", position: [-8.4, 2.7, -9.76] },
    { to: "pavilion", position: [8.4, 2.7, -9.76] },
  ] },
];

export const roomForView = (view) => view?.room || "pavilion";
