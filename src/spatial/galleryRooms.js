import * as THREE from "three";
import { rooms } from "./rooms";
import { galleryPalette as palette } from "./galleryPalette";

const tau = Math.PI * 2;
const glowMaterial = (hex, strength = 2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(strength) });
const box = (parent, material, position, size) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
};

function label(text, color = "#777268") {
  const canvas = document.createElement("canvas");
  canvas.width = 768; canvas.height = 128;
  const context = canvas.getContext("2d");
  context.fillStyle = color;
  context.font = "400 30px Archivo, Arial, sans-serif";
  context.textAlign = "center";
  context.fillText(text, 384, 74);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.47), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }));
}

// Locally drawn fallback art is replaced by rendered destination views when
// the portal preview manager initializes each visible doorway.
export function addRoomPortals(parent, roomId) {
  return rooms.find((item) => item.id === roomId).portals.map((portal) => {
    const destination = rooms.find((item) => item.id === portal.to);
    const doorway = new THREE.Group();
    doorway.name = `threshold-to-${portal.to}`;
    doorway.position.set(...portal.position);
    const frame = new THREE.MeshStandardMaterial({ color: palette.trim, metalness: 0.25, roughness: 0.7 });
    const edge = glowMaterial(palette.daylight, 1);
    const canvas = document.createElement("canvas");
    canvas.width = 256; canvas.height = 512;
    const context = canvas.getContext("2d");
    const gradient = context.createLinearGradient(0, 0, 256, 512);
    gradient.addColorStop(0, "#e8e4dc");
    gradient.addColorStop(1, "#f5f2eb");
    context.fillStyle = gradient; context.fillRect(0, 0, 256, 512);
    context.strokeStyle = "#a7a195";
    context.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      context.beginPath();
      context.ellipse(128, 225, 35 + i * 7, 75 + i * 8, i * 0.17, 0, tau);
      context.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const preview = new THREE.Mesh(new THREE.PlaneGeometry(2.65, 5.4), new THREE.MeshBasicMaterial({ map: texture }));
    doorway.add(preview);
    for (const x of [-1.4, 1.4]) {
      box(doorway, frame, [x, 0, 0.015], [0.12, 5.6, 0.18]);
      box(doorway, edge, [x * 0.96, 0, 0.12], [0.015, 5.4, 0.02]);
    }
    box(doorway, frame, [0, 2.77, 0], [2.9, 0.12, 0.18]);
    const caption = label(`${destination.number}  /  ${destination.name.toUpperCase()}`);
    caption.position.set(0, 3.12, 0.02);
    doorway.add(caption);
    const hit = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 5.6), new THREE.MeshBasicMaterial());
    hit.layers.set(3);
    hit.userData.portal = portal.to;
    hit.userData.surface = preview;
    hit.userData.sourceRoom = roomId;
    hit.position.z = 0.15;
    doorway.add(hit);
    parent.add(doorway);
    return hit;
  });
}

export function createOrbitHall(options = {}) {
  const hall = new THREE.Group();
  hall.name = "orbit-hall";
  const stone = new THREE.MeshStandardMaterial({ color: palette.plaster, roughness: 0.93, metalness: 0 });
  const bronze = new THREE.MeshStandardMaterial({ color: palette.trim, roughness: 0.65, metalness: 0.4 });
  const gold = new THREE.MeshStandardMaterial({ color: palette.silver, metalness: 0.55, roughness: 0.45 });
  box(hall, new THREE.MeshStandardMaterial({ color: palette.stone, roughness: 0.94 }), [0, -0.22, 0], [23, 0.44, 29]);
  for (const x of [-10.2, 10.2]) {
    box(hall, stone, [x, 5, 0], [0.7, 10, 28]);
    box(hall, gold, [x * 0.96, 0.04, 0], [0.018, 0.02, 27]);
  }
  box(hall, stone, [0, 9.9, 0], [22, 0.3, 29]);
  // Open thresholds flank an immense eclipse disc at the back of the hall.
  box(hall, stone, [0, 5, -10.2], [13.6, 10, 0.5]);
  for (const x of [-10.35, 10.35]) box(hall, stone, [x, 5, -10.2], [0.7, 10, 0.5]);
  for (const x of [-8.4, 8.4]) box(hall, stone, [x, 8, -10.2], [3.5, 4, 0.5]);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(3.65, 0.055, 10, 160), gold);
  halo.position.set(0, 4.6, -9.85); hall.add(halo);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.5, 128), new THREE.MeshBasicMaterial({ color: palette.stone }));
  disc.position.set(0, 4.6, -9.8); hall.add(disc);
  for (const x of [-6, 6]) box(hall, gold, [x, 9.72, 0], [0.035, 0.02, 26]);
  const sculpture = new THREE.Group();
  sculpture.name = "nine-satin-orbits";
  sculpture.position.set(0, 3.4, -0.8);
  sculpture.scale.setScalar(0.72);
  for (let i = 0; i < 9; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.65 + i * 0.11, 0.027, 8, 144), gold);
    ring.rotation.set(i * 0.19 + 0.2, i * Math.PI / 9, i * 0.12);
    sculpture.add(ring);
    // A fine dark edge gives the light a physical, machined support.
    const support = new THREE.Mesh(new THREE.TorusGeometry(2.65 + i * 0.11, 0.046, 8, 144), bronze);
    support.rotation.copy(ring.rotation); support.position.z = -0.045;
    sculpture.add(support);
  }
  hall.add(sculpture);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.16, 96), new THREE.MeshStandardMaterial({ color: palette.porcelain, roughness: 0.95 }));
  plinth.position.set(0, 0.08, -0.8); plinth.receiveShadow = true; hall.add(plinth);
  const ambient = new THREE.HemisphereLight(palette.daylight, palette.stone, 1.25);
  const key = new THREE.PointLight(palette.daylight, 45, 25, 1.5); key.position.set(0, 5.5, 1);
  hall.add(ambient, key);
  hall.userData.setLighting = (level) => {
    hall.userData.lightLevel = level;
    gold.color.lerpColors(new THREE.Color(palette.silver), new THREE.Color(0xd3cabc), level);
    key.color.lerpColors(new THREE.Color(palette.daylight), new THREE.Color(palette.warmLight), level);
    ambient.intensity = 1.25 - level * 0.6;
  };
  hall.userData.portalTargets = addRoomPortals(hall, "orbit");
  return hall;
}

export function createSkyGarden() {
  const garden = new THREE.Group();
  garden.name = "sky-garden";
  const chalk = new THREE.MeshStandardMaterial({ color: palette.plaster, roughness: 0.94 });
  const ivory = new THREE.MeshStandardMaterial({ color: palette.porcelain, roughness: 0.88, metalness: 0 });
  const seam = new THREE.MeshStandardMaterial({ color: palette.trim, roughness: 0.6 });
  const light = glowMaterial(palette.daylight, 1);
  box(garden, chalk, [0, -0.2, 0], [23, 0.4, 29]);
  for (const x of [-10.2, 10.2]) {
    box(garden, chalk, [x, 4.1, 0], [0.7, 8.2, 28]);
  }
  box(garden, chalk, [0, 3.8, -10.2], [13.6, 7.6, 0.5]);
  for (const x of [-10.35, 10.35]) box(garden, chalk, [x, 3.8, -10.2], [0.7, 7.6, 0.5]);
  for (const x of [-8.4, 8.4]) box(garden, chalk, [x, 6.9, -10.2], [3.5, 2, 0.5]);
  // An open, elliptical roof frames the sky rather than closing the room.
  const roof = new THREE.Mesh(new THREE.TorusGeometry(8.1, 0.58, 12, 160), ivory);
  roof.rotation.x = Math.PI / 2; roof.scale.y = 1.35; roof.position.y = 8.6;
  garden.add(roof);
  const roofLight = new THREE.Mesh(new THREE.TorusGeometry(7.55, 0.027, 8, 160), light);
  roofLight.rotation.copy(roof.rotation); roofLight.scale.copy(roof.scale); roofLight.position.y = 8.33;
  garden.add(roofLight);
  // A soft sky is generated locally, so this room has no external media dependency.
  const skyCanvas = document.createElement("canvas"); skyCanvas.width = 16; skyCanvas.height = 256;
  const context = skyCanvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, "#e4e5e0"); gradient.addColorStop(0.55, "#f1efe9"); gradient.addColorStop(1, "#faf7ef");
  context.fillStyle = gradient; context.fillRect(0, 0, 16, 256);
  const skyTexture = new THREE.CanvasTexture(skyCanvas); skyTexture.colorSpace = THREE.SRGBColorSpace;
  const skyMaterial = new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide, depthWrite: false });
  garden.add(new THREE.Mesh(new THREE.SphereGeometry(65, 32, 20), skyMaterial));
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(4.35, 4.5, 0.22, 96), ivory);
  basin.position.set(0, 0.11, -0.8); garden.add(basin);
  const water = new THREE.Mesh(new THREE.CircleGeometry(4.08, 96), new THREE.MeshStandardMaterial({ color: palette.stone, metalness: 0, roughness: 0.95 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0.225, -0.8); garden.add(water);
  const petalsMaterial = new THREE.MeshPhysicalMaterial({ color: palette.porcelain, metalness: 0, roughness: 0.82, iridescence: 0, clearcoat: 0, envMapIntensity: 0.5, side: THREE.DoubleSide });
  const petalGeometry = new THREE.SphereGeometry(1, 12, 6);
  const petals = new THREE.InstancedMesh(petalGeometry, petalsMaterial, 1100);
  petals.name = "eleven-hundred-paper-petals";
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  for (let i = 0; i < 1100; i++) {
    const t = i / 1099, angle = t * Math.PI * 7;
    const radius = 1.2 + Math.sin(t * Math.PI) * 2.1;
    const jitter = Math.sin(i * 23.71);
    const spread = Math.sin(i * 8.71) * 0.65;
    dummy.position.set(Math.cos(angle) * (radius + spread), 1.25 + t * 3.8 + jitter * 0.2, -0.8 + Math.sin(angle) * (radius + spread) * 0.72);
    dummy.rotation.set(t * 6 + jitter * 1.6, angle, angle * 0.3 + jitter);
    dummy.scale.set(0.07 + (i % 9) * 0.006, 0.008, 0.13 + (i % 7) * 0.008);
    dummy.updateMatrix(); petals.setMatrixAt(i, dummy.matrix);
    color.setHSL(0.1, 0.06, 0.74 + (i % 11) / 85);
    petals.setColorAt(i, color);
  }
  garden.add(petals);
  // Curving ivory seats make the installation read as a place to inhabit.
  for (const x of [-6.6, 6.6]) {
    box(garden, ivory, [x, 0.55, 0], [1.1, 0.35, 6]);
    box(garden, seam, [x, 0.18, 0], [0.65, 0.36, 5.5]);
  }
  const ambient = new THREE.HemisphereLight(palette.daylight, palette.stone, 1.4);
  const sun = new THREE.DirectionalLight(palette.daylight, 2.2); sun.position.set(-4, 12, 4);
  garden.add(ambient, sun);
  garden.userData.setLighting = (level) => {
    skyMaterial.color.lerpColors(new THREE.Color(0xffffff), new THREE.Color(0x938a7b), level);
    ambient.intensity = 1.4 - level * 0.65;
    sun.intensity = 2.2 - level * 1.7;
    petalsMaterial.emissive.setHex(0x000000); petalsMaterial.emissiveIntensity = 0;
  };
  garden.userData.portalTargets = addRoomPortals(garden, "garden");
  garden.userData.petalCount = 1100;
  return garden;
}
