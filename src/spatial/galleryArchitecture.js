import * as THREE from "three";

// Crisp architectural geometry surrounds the Gaussian-splat artworks.
export function createGalleryArchitecture() {
  const gallery = new THREE.Group();
  gallery.name = "gallery-architecture";
  const plaster = new THREE.MeshStandardMaterial({
    color: 0xf4f4ef,
    roughness: 0.83,
  });
  const stone = new THREE.MeshStandardMaterial({
    color: 0xd8dcd9,
    roughness: 0.21,
    metalness: 0.12,
  });
  const paleStone = new THREE.MeshStandardMaterial({
    color: 0xe6e8e3,
    roughness: 0.54,
  });
  const black = new THREE.MeshStandardMaterial({
    color: 0x141919,
    roughness: 0.37,
    metalness: 0.45,
  });
  const light = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lime = new THREE.MeshStandardMaterial({
    color: 0xd3f96a,
    emissive: 0x9adf32,
    emissiveIntensity: 0.35,
    roughness: 0.3,
  });
  const box = (x, y, z, width, height, depth, material, castShadow = false) => {
    const object = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      material,
    );
    object.position.set(x, y, z);
    object.castShadow = castShadow;
    object.receiveShadow = true;
    gallery.add(object);
    return object;
  };
  // Monumental, quiet proportions and a continuous polished mineral floor.
  box(0, -0.13, -0.1, 14, 0.25, 12, stone);
  box(0, 2.7, -5.08, 12.2, 5.4, 0.18, plaster);
  box(-6.08, 2.7, -0.1, 0.18, 5.4, 10, plaster);
  // A deep wall reveal gives the right side an architectural rhythm.
  for (let z = -4.4; z <= 3.8; z += 1.65) {
    box(6.02, 2.7, z, 0.2, 5.4, 1.56, plaster);
    box(5.96, 2.7, z + 0.81, 0.06, 5.25, 0.035, light);
  }
  // Flush ceiling slabs leave a luminous central lightwell.
  box(-4.3, 5.43, -0.1, 3.5, 0.2, 10.4, plaster);
  box(4.3, 5.43, -0.1, 3.5, 0.2, 10.4, plaster);
  box(0, 5.55, -0.1, 5.15, 0.08, 10.4, light);
  box(-2.6, 5.29, -0.1, 0.025, 0.04, 10.3, black);
  box(2.6, 5.29, -0.1, 0.025, 0.04, 10.3, black);
  // Low shadow gaps, expansion joints, and embedded floor light.
  box(0, 0.045, -4.93, 12, 0.055, 0.025, black);
  for (let x = -4; x <= 4; x += 2)
    box(x, 0.001, -0.1, 0.008, 0.004, 10, paleStone);
  for (const z of [-3.6, -0.8, 2])
    box(0, 0.002, z, 12, 0.004, 0.008, paleStone);
  box(5.78, 0.006, -0.15, 0.025, 0.008, 9.9, light);
  // A suspended elliptical luminaire creates a recognizable gallery silhouette.
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(1.95, 0.045, 10, 112),
    black,
  );
  halo.rotation.x = Math.PI / 2;
  halo.scale.set(1.32, 1, 1);
  halo.position.set(0.75, 4.33, -0.55);
  gallery.add(halo);
  const haloLight = new THREE.Mesh(
    new THREE.TorusGeometry(1.95, 0.018, 8, 112),
    light,
  );
  haloLight.rotation.copy(halo.rotation);
  haloLight.scale.copy(halo.scale);
  haloLight.position.copy(halo.position);
  haloLight.position.y -= 0.04;
  gallery.add(haloLight);
  for (const x of [-1.1, 2.6]) box(x, 4.88, -0.55, 0.009, 1.05, 0.009, black);
  // Each piece floats off the wall with a narrow charcoal edge and a shadow gap.
  const works = [
    {
      x: -3.15,
      width: 2.35,
      height: 1.8,
      number: "01",
      title: "THE FAMILY",
      detail: "PHOTOGRAPHS / PERSONAL ARCHIVE",
    },
    {
      x: 0,
      width: 2.4,
      height: 1.37,
      number: "02",
      title: "THE VOICE",
      detail: "BENNO KERN / TESTIMONY",
    },
    {
      x: 3.15,
      width: 2.42,
      height: 1.31,
      number: "03",
      title: "THE CITY",
      detail: "VIENNA / A PLACE REMEMBERED",
    },
  ];
  for (const work of works) {
    box(
      work.x,
      2.13,
      -4.91,
      work.width + 0.04,
      work.height + 0.04,
      0.12,
      black,
      true,
    );
    box(work.x, 3.76, -4.75, 2.5, 0.025, 0.06, light);
    const wallLight = new THREE.SpotLight(0xffffff, 18, 8, 0.55, 1, 1.3);
    wallLight.position.set(work.x, 4.8, -3.3);
    wallLight.target.position.set(work.x, 2, -5);
    gallery.add(wallLight, wallLight.target);
    const label = makeLabel(work.number, work.title, work.detail);
    label.position.set(
      work.x - work.width / 2 + 0.5,
      2.13 - work.height / 2 - 0.27,
      -4.8,
    );
    gallery.add(label);
  }
  // A contemporary sculptural study, deliberately separate from historical material.
  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.66, 0.66, 0.6, 64),
    paleStone,
  );
  plinth.position.set(1.25, 0.3, 0.25);
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  gallery.add(plinth);
  const baseLight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.63, 0.63, 0.018, 64),
    lime,
  );
  baseLight.position.set(1.25, 0.014, 0.25);
  gallery.add(baseLight);
  const chrome = new THREE.MeshStandardMaterial({
    color: 0xbfc9ce,
    metalness: 1,
    roughness: 0.14,
    envMapIntensity: 1.7,
  });
  const sculpture = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.45, 0.115, 168, 20, 2, 3),
    chrome,
  );
  sculpture.name = "memory-sculpture";
  sculpture.rotation.set(0.22, -0.45, 0.3);
  sculpture.position.set(1.25, 1.36, 0.25);
  sculpture.scale.set(0.92, 1.28, 0.92);
  sculpture.castShadow = true;
  gallery.add(sculpture);
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 2.5),
    new THREE.MeshBasicMaterial({
      map: contactShadow(),
      transparent: true,
      depthWrite: false,
      opacity: 0.5,
    }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(1.25, 0.004, 0.25);
  gallery.add(contact);
  // A cantilevered bench adds human scale without the old writing-desk motif.
  box(-3.8, 0.46, 1.2, 2.15, 0.1, 0.65, paleStone, true);
  box(-4.54, 0.225, 1.2, 0.12, 0.45, 0.51, black, true);
  box(-3.06, 0.225, 1.2, 0.12, 0.45, 0.51, black, true);
  const ambient = new THREE.HemisphereLight(0xf4f8ff, 0xb8b9b3, 1.6);
  gallery.add(ambient);
  const sun = new THREE.DirectionalLight(0xfffcf4, 2.8);
  sun.position.set(4.5, 7.5, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -8;
  sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 8;
  sun.shadow.camera.bottom = -8;
  sun.shadow.normalBias = 0.025;
  sun.shadow.bias = -0.0002;
  sun.target.position.set(0, 0, -2);
  gallery.add(sun, sun.target);
  return gallery;
}

function makeLabel(number, title, detail) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 180;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, 768, 180);
  context.fillStyle = "#202625";
  context.font = "500 34px Archivo, Arial, sans-serif";
  context.fillText(`${number}   ${title}`, 3, 65);
  context.fillStyle = "#626a66";
  context.font = "400 18px Archivo, Arial, sans-serif";
  context.fillText(detail, 3, 106);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(1, 0.235),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  );
}

function contactShadow() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(64, 64, 18, 64, 64, 64);
  gradient.addColorStop(0, "rgba(0,0,0,.65)");
  gradient.addColorStop(0.55, "rgba(0,0,0,.2)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}
