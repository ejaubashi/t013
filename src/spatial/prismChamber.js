import * as THREE from "three";
import { addRoomPortals } from "./galleryRooms";
import { galleryPalette as palette } from "./galleryPalette";

// An authored optical installation. The floor light is a procedural artwork,
// not a physical caustics solver. The renderer scales its refraction buffer.
export function createPrismChamber() {
  const chamber = new THREE.Group();
  chamber.name = "prism-chamber";
  const stone = new THREE.MeshStandardMaterial({ color: palette.plaster, roughness: 0.94, metalness: 0 });
  const porcelain = new THREE.MeshStandardMaterial({ color: palette.porcelain, roughness: 0.87, metalness: 0 });
  const trim = new THREE.MeshStandardMaterial({ color: palette.trim, roughness: 0.7, metalness: 0.3 });
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.daylight) });
  const box = (material, x, y, z, w, h, d) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); chamber.add(mesh); return mesh;
  };
  box(stone, 0, -0.2, 0, 23, 0.4, 29);
  for (const x of [-10.2, 10.2]) {
    box(stone, x, 5, 0, 0.6, 10, 28);
    box(glow, x * 0.96, 0.035, 0, 0.018, 0.02, 27);
  }
  box(stone, 0, 10, 0, 22, 0.3, 28);
  box(stone, 0, 5, -10.2, 13.6, 10, 0.5);
  for (const x of [-10.35, 10.35]) box(stone, x, 5, -10.2, 0.7, 10, 0.5);
  for (const x of [-8.4, 8.4]) box(stone, x, 8, -10.2, 3.5, 4, 0.5);
  const haloGeometry = new THREE.TorusGeometry(3.95, 0.035, 8, 192);
  const halo = new THREE.Mesh(haloGeometry, trim);
  halo.position.set(0, 4.8, -9.84); chamber.add(halo);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.85, 128),
    new THREE.MeshStandardMaterial({ color: palette.stone, roughness: 0.95 }));
  disc.position.set(0, 4.8, -9.8); chamber.add(disc);
  for (const x of [-5.2, 5.2]) box(glow, x, 9.8, 0, 0.025, 0.02, 25);
  const island = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.65, 0.28, 96), porcelain);
  island.position.set(0, 0.14, -0.8); chamber.add(island);
  const islandRim = new THREE.Mesh(new THREE.TorusGeometry(4.42, 0.018, 6, 144), glow);
  islandRim.rotation.x = Math.PI / 2; islandRim.position.set(0, 0.29, -0.8); chamber.add(islandRim);
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xf5f2eb, roughness: 0.25, metalness: 0,
    transmission: 0.58, thickness: 1.5, ior: 1.48,
    dispersion: 0.08, clearcoat: 0.4,
    iridescence: 0, iridescenceIOR: 1.35,
    iridescenceThicknessRange: [100, 420], envMapIntensity: 0.8,
  });
  const installation = new THREE.Group(); installation.name = "seven-spectral-crystals";
  const crystalGeometry = new THREE.OctahedronGeometry(1);
  const crystals = [
    [0, 4.2, -0.8, 1.65, 3.4, 1.35, 0.13, 0.35, -0.12],
    [-2.5, 3.1, -1.2, 1, 2.4, 0.9, 0.2, -0.35, 0.32],
    [2.6, 3.2, -1.5, 1, 2.5, 0.95, -0.1, 0.2, -0.4],
    [-1.2, 2.15, 1.4, 0.72, 1.65, 0.7, 0.18, 0.8, -0.35],
    [1.3, 2.3, 1.6, 0.65, 1.8, 0.65, -0.16, -0.4, 0.4],
    [-0.9, 3.2, -3, 0.72, 2.5, 0.7, -0.3, -0.1, -0.25],
    [1.5, 3.8, -2.7, 0.75, 2.8, 0.8, 0.28, 0.4, 0.3],
  ];
  for (const [x, y, z, sx, sy, sz, rx, ry, rz] of crystals) {
    const crystal = new THREE.Mesh(crystalGeometry, glass);
    crystal.position.set(x, y, z); crystal.scale.set(sx, sy, sz); crystal.rotation.set(rx, ry, rz);
    installation.add(crystal);
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(crystalGeometry), new THREE.LineBasicMaterial({ color: palette.trim, transparent: true, opacity: 0.16 }));
    outline.position.copy(crystal.position); outline.scale.copy(crystal.scale); outline.rotation.copy(crystal.rotation);
    installation.add(outline);
  }
  installation.scale.setScalar(0.72);
  chamber.add(installation);
  const ambient = new THREE.HemisphereLight(palette.daylight, palette.stone, 1.25);
  const key = new THREE.PointLight(palette.daylight, 45, 23, 1.6); key.position.set(-4, 7.5, 4);
  const fill = new THREE.PointLight(palette.daylight, 32, 20, 1.6); fill.position.set(4, 5, -4);
  chamber.add(ambient, key, fill);
  chamber.userData.setSpectrum = (value) => {
    const level = THREE.MathUtils.clamp(value, 0, 1);
    installation.rotation.y = (level - 0.5) * 0.18;
    key.color.lerpColors(new THREE.Color(palette.warmLight), new THREE.Color(0xf5f7f6), level);
    fill.color.lerpColors(new THREE.Color(palette.daylight), new THREE.Color(0xe9e7e1), level);
    chamber.userData.spectrum = level;
  };
  chamber.userData.setLighting = (level) => {
    ambient.intensity = 1.25 - level * 0.65;
    key.intensity = 45 + level * 8;
    fill.intensity = 32 + level * 8;
  };
  chamber.userData.crystalCount = crystals.length;
  chamber.userData.portalTargets = addRoomPortals(chamber, "prism");
  chamber.userData.setSpectrum(0.5);
  return chamber;
}
