import * as THREE from "three";
import { artworks, artworkSize } from "./artworks";

function plaque(artwork) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 240;
  const context = canvas.getContext("2d");
  context.fillStyle = "#e7e4d9"; context.fillRect(0, 0, 1024, 240);
  context.fillStyle = "#273b3b";
  context.font = "500 34px Archivo, Arial, sans-serif";
  context.fillText(artwork.artist, 42, 66);
  context.font = "400 27px Archivo, Arial, sans-serif";
  context.fillText(artwork.title, 42, 120, 940);
  context.fillStyle = "#64726a"; context.font = "400 24px Archivo, Arial, sans-serif";
  context.fillText(`${artwork.date}   /   ${artwork.medium}`, 42, 179);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(1.95, 0.46), new THREE.MeshBasicMaterial({ map: texture }));
}

export function addWallArt(parent, roomId) {
  const targets = [], pending = [];
  const loader = new THREE.TextureLoader();
  const frame = new THREE.MeshStandardMaterial({ color: 0x86785f, metalness: 0.8, roughness: 0.33 });
  const backing = new THREE.MeshStandardMaterial({ color: 0xd9dccf, roughness: 0.9 });
  const lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe5c3).multiplyScalar(1.3) });
  for (const artwork of artworks.filter((item) => item.room === roomId)) {
    const { width, height } = artworkSize(artwork);
    const group = new THREE.Group(); group.name = `wall-art-${artwork.id}`;
    group.position.set(...artwork.position); group.rotation.y = artwork.rotation;
    const box = (material, x, y, z, w, h, d) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z); group.add(mesh); return mesh;
    };
    box(backing, 0, -0.08, -0.15, width + 0.7, height + 1.2, 0.09);
    box(frame, 0, 0, -0.05, width + 0.15, height + 0.15, 0.16);
    box(backing, 0, 0, 0.04, width + 0.025, height + 0.025, 0.025);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const painting = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    painting.position.z = 0.065; painting.name = `painting-${artwork.id}`;
    group.add(painting);
    pending.push(loader.loadAsync(`${import.meta.env.BASE_URL}assets/${artwork.wallImage}`).then((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      material.map = texture; material.needsUpdate = true;
    }));
    const caption = plaque(artwork);
    caption.position.set(0, -height / 2 - 0.36, -0.075); group.add(caption);
    box(frame, 0, height / 2 + 0.36, 0.04, width * 0.65, 0.055, 0.13);
    box(lamp, 0, height / 2 + 0.32, 0.07, width * 0.6, 0.012, 0.08);
    const light = new THREE.SpotLight(0xffe7c9, 22, 6, 0.56, 0.8, 2);
    light.position.set(0, height / 2 + 0.55, 1.2);
    light.target.position.set(0, 0, -0.1); group.add(light, light.target);
    const hit = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial());
    hit.position.z = 0.085; hit.layers.set(3); hit.userData.artwork = artwork.id;
    group.add(hit); targets.push(hit); parent.add(group);
  }
  return { targets, initialized: Promise.all(pending) };
}
