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
      const value = Math.round(231 + strata * 1.4 + cloud * 2 + grain * 5);
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
  scene.background = new THREE.Color(0xede9e0);
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
  card(0xfffaf0, 5, [-5, 5, 4], [5, 8, 1]);
  card(0xffffff, 4, [5, 6, -5], [5, 6, 1]);
  card(0xffffff, 8, [0, 10, 0], [4, 10, 1]);
  card(0xfff4e5, 2, [1, 3, 8], [3, 7, 1]);
  return scene;
}
