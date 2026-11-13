import * as THREE from "three";
import { galleryPalette as palette } from "./galleryPalette";

export function createGalleryAtmosphere() {
  const ceiling = new THREE.Group();
  ceiling.name = "quiet-ceiling-baffles";
  const plaster = new THREE.MeshStandardMaterial({ color: palette.plaster, roughness: 0.95 });
  const light = new THREE.MeshBasicMaterial({ color: palette.daylight });
  for (const x of [-5.2, 5.2]) {
    const baffle = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 25), plaster);
    baffle.position.set(x, 8.38, 0); ceiling.add(baffle);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.015, 23), light);
    strip.position.set(x, 8.3, 0); ceiling.add(strip);
  }
  ceiling.userData.setLighting = (level) => light.color.lerpColors(new THREE.Color(palette.daylight), new THREE.Color(palette.warmLight), level);
  return ceiling;
}
