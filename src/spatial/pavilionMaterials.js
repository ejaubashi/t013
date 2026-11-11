import * as THREE from "three";

// Authored surface detail; no remote textures or historical imagery.
export function stoneTexture() {
  const size = 512, pixels = new Uint8Array(size * size * 4);
  const noise = (x, y) => {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const grain = noise(x, y);
      const strata = Math.sin(y * 0.085 + Math.sin(x * 0.026) * 1.4);
      const cloud = Math.sin(x * 0.035 + y * 0.013) * Math.cos(y * 0.027);
      const value = Math.round(190 + strata * 4 + cloud * 8 + grain * 12 + (grain < 0.025 ? -34 : 0));
      pixels.set([value, value, value, 255], (y * size + x) * 4);
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

// Studio light cards, following the technique illustrated by drei Lightformer.
export function createPavilionEnvironment() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x262e30);
  const card = (color, intensity, position, scale) => {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.lookAt(0, 2, 0);
    scene.add(mesh);
  };
  card(0xffe3b2, 12, [-5, 5, 4], [3, 8, 1]);
  card(0xc8e0ed, 8, [5, 6, -5], [5, 4, 1]);
  card(0xffffff, 18, [0, 10, 0], [2, 10, 1]);
  card(0xffe8c0, 5, [1, 3, 8], [1, 7, 1]);
  card(0x83e8e0, 7, [-4, 3, -3], [2, 6, 1]);
  return scene;
}
