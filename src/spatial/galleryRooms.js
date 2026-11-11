import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { rooms } from "./rooms";

const tau = Math.PI * 2;
const glowMaterial = (hex, strength = 2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(strength) });
const box = (parent, material, position, size) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
};

function label(text, color = "#e4d9bb") {
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

// Small, locally drawn previews keep the thresholds legible without rendering
// two additional scenes into textures on every camera movement.
export function addRoomPortals(parent, roomId) {
  return rooms.find((item) => item.id === roomId).portals.map((portal) => {
    const destination = rooms.find((item) => item.id === portal.to);
    const doorway = new THREE.Group();
    doorway.name = `threshold-to-${portal.to}`;
    doorway.position.set(...portal.position);
    const frame = new THREE.MeshStandardMaterial({ color: 0x8e8269, metalness: 0.8, roughness: 0.3 });
    const edge = glowMaterial(portal.to === "orbit" ? 0xf5c47f : 0xcde5df, 1.4);
    const canvas = document.createElement("canvas");
    canvas.width = 256; canvas.height = 512;
    const context = canvas.getContext("2d");
    const gradient = context.createLinearGradient(0, 0, 256, 512);
    gradient.addColorStop(0, portal.to === "orbit" ? "#0b1116" : "#b7d3d2");
    gradient.addColorStop(1, portal.to === "orbit" ? "#5b3920" : "#f5e7cf");
    context.fillStyle = gradient; context.fillRect(0, 0, 256, 512);
    context.strokeStyle = portal.to === "orbit" ? "#f0c180" : "#ffffee";
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
    hit.position.z = 0.15;
    doorway.add(hit);
    parent.add(doorway);
    return hit;
  });
}

function reflectingFloor(parent, options, color = 0x0d1317) {
  const size = options.reflectionSize ?? (matchMedia("(pointer: coarse)").matches ? 512 : 1024);
  const floor = new Reflector(new THREE.PlaneGeometry(16, 23), {
    textureWidth: size, textureHeight: size, multisample: options.reflectionSamples ?? 2,
    color, clipBias: 0.003,
    shader: {
      ...Reflector.ReflectorShader,
      uniforms: { ...THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms), texelSize: { value: new THREE.Vector2(1 / size, 1 / size) } },
      fragmentShader: `
        uniform vec3 color;
        uniform sampler2D tDiffuse;
        uniform vec2 texelSize;
        varying vec4 vUv;
        #include <common>
        #include <logdepthbuf_pars_fragment>
        void main() {
          #include <logdepthbuf_fragment>
          vec2 uv = vUv.xy / vUv.w;
          vec2 offset = texelSize * 1.6;
          vec3 reflected = texture2D(tDiffuse, uv).rgb * 0.4;
          reflected += texture2D(tDiffuse, uv + vec2(offset.x, 0.0)).rgb * 0.15;
          reflected += texture2D(tDiffuse, uv - vec2(offset.x, 0.0)).rgb * 0.15;
          reflected += texture2D(tDiffuse, uv + vec2(0.0, offset.y)).rgb * 0.15;
          reflected += texture2D(tDiffuse, uv - vec2(0.0, offset.y)).rgb * 0.15;
          gl_FragColor = vec4(mix(color, reflected, 0.72), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    },
  });
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.015, 0);
  floor.name = "orbit-reflection";
  // The room is still until a visitor changes the view or lighting.
  const render = floor.onBeforeRender;
  const view = new THREE.Matrix4(), projection = new THREE.Matrix4();
  let initialized = false, previousLevel = -1;
  floor.onBeforeRender = (...args) => {
    const camera = args[2], level = parent.userData.lightLevel ?? 0;
    if (initialized && view.equals(camera.matrixWorldInverse) && projection.equals(camera.projectionMatrix) && previousLevel === level) return;
    render.apply(floor, args);
    view.copy(camera.matrixWorldInverse); projection.copy(camera.projectionMatrix);
    previousLevel = level; initialized = true;
  };
  parent.add(floor);
}

export function createOrbitHall(options = {}) {
  const hall = new THREE.Group();
  hall.name = "orbit-hall";
  const stone = new THREE.MeshStandardMaterial({ color: 0x171c23, roughness: 0.52, metalness: 0.35 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0xb59a72, roughness: 0.27, metalness: 0.9 });
  const gold = glowMaterial(0xffca83, 2.6);
  box(hall, stone, [0, -0.22, 0], [23, 0.44, 29]);
  for (const x of [-10.7, 10.7]) {
    box(hall, stone, [x, 5, 0], [0.7, 10, 28]);
    for (let z = -10; z <= 12; z += 0.7) box(hall, bronze, [x * 0.97, 4.9, z], [0.06, 9.8, 0.09]);
    box(hall, gold, [x * 0.96, 0.04, 0], [0.018, 0.02, 27]);
  }
  box(hall, stone, [0, 9.9, 0], [22, 0.3, 29]);
  // Open thresholds flank an immense eclipse disc at the back of the hall.
  box(hall, stone, [0, 5, -10.2], [13.6, 10, 0.5]);
  for (const x of [-10.35, 10.35]) box(hall, stone, [x, 5, -10.2], [0.7, 10, 0.5]);
  for (const x of [-8.4, 8.4]) box(hall, stone, [x, 8, -10.2], [3.5, 4, 0.5]);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(3.65, 0.055, 10, 160), gold);
  halo.position.set(0, 4.6, -9.85); hall.add(halo);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.5, 128), new THREE.MeshBasicMaterial({ color: 0x050a10 }));
  disc.position.set(0, 4.6, -9.8); hall.add(disc);
  for (const x of [-6, 6]) box(hall, gold, [x, 9.72, 0], [0.035, 0.02, 26]);
  const sculpture = new THREE.Group();
  sculpture.name = "nine-golden-orbits";
  sculpture.position.set(0, 4.1, -0.8);
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
  const points = [];
  for (let i = 0; i < 180; i++) {
    const angle = i * 2.399963, radius = 0.25 + (i % 31) / 31 * 2.3;
    points.push(Math.cos(angle) * radius, 3.8 + Math.sin(i * 1.79) * 2.3, -0.8 + Math.sin(angle) * radius);
  }
  const dust = new THREE.BufferGeometry();
  dust.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  hall.add(new THREE.Points(dust, new THREE.PointsMaterial({ color: 0xffe5ac, size: 0.025, sizeAttenuation: true })));
  reflectingFloor(hall, options);
  const ambient = new THREE.HemisphereLight(0xc0d7ea, 0x29201b, 0.65);
  const key = new THREE.PointLight(0xffcd8c, 80, 25, 1.5); key.position.set(0, 5.5, 1);
  hall.add(ambient, key);
  hall.userData.setLighting = (level) => {
    hall.userData.lightLevel = level;
    gold.color.lerpColors(new THREE.Color(0xffca83).multiplyScalar(2.6), new THREE.Color(0xaedfff).multiplyScalar(2.6), level);
    key.color.lerpColors(new THREE.Color(0xffcd8c), new THREE.Color(0x9ecbff), level);
    ambient.intensity = 0.65 - level * 0.2;
  };
  hall.userData.portalTargets = addRoomPortals(hall, "orbit");
  return hall;
}

export function createSkyGarden() {
  const garden = new THREE.Group();
  garden.name = "sky-garden";
  const chalk = new THREE.MeshStandardMaterial({ color: 0xe1dfd1, roughness: 0.7 });
  const ivory = new THREE.MeshStandardMaterial({ color: 0xf5f0dc, roughness: 0.4, metalness: 0.1 });
  const seam = new THREE.MeshStandardMaterial({ color: 0x91a9a2, roughness: 0.6 });
  const light = glowMaterial(0xe8fff0, 1.8);
  box(garden, chalk, [0, -0.2, 0], [23, 0.4, 29]);
  for (const x of [-10.7, 10.7]) {
    box(garden, chalk, [x, 4.1, 0], [0.7, 8.2, 28]);
    for (let z = -10; z < 13; z += 1.35) box(garden, ivory, [x * 0.97, 4.1, z], [0.14, 8.2, 0.17]);
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
  gradient.addColorStop(0, "#92c4d1"); gradient.addColorStop(0.55, "#d7e3dc"); gradient.addColorStop(1, "#faf0d3");
  context.fillStyle = gradient; context.fillRect(0, 0, 16, 256);
  const skyTexture = new THREE.CanvasTexture(skyCanvas); skyTexture.colorSpace = THREE.SRGBColorSpace;
  const skyMaterial = new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide, depthWrite: false });
  garden.add(new THREE.Mesh(new THREE.SphereGeometry(65, 32, 20), skyMaterial));
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(4.35, 4.5, 0.22, 96), ivory);
  basin.position.set(0, 0.11, -0.8); garden.add(basin);
  const water = new THREE.Mesh(new THREE.CircleGeometry(4.08, 96), new THREE.MeshStandardMaterial({ color: 0x779f9e, metalness: 0.65, roughness: 0.19 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0.225, -0.8); garden.add(water);
  for (let i = 0; i < 4; i++) {
    const ripple = new THREE.Mesh(new THREE.TorusGeometry(1.2 + i * 0.81, 0.007, 5, 96), light);
    ripple.rotation.x = Math.PI / 2; ripple.position.set(0, 0.23, -0.8); garden.add(ripple);
  }
  const petalsMaterial = new THREE.MeshPhysicalMaterial({ color: 0xe0efec, metalness: 0.62, roughness: 0.17, iridescence: 1, iridescenceIOR: 1.4, iridescenceThicknessRange: [180, 480], clearcoat: 1, envMapIntensity: 1.9, side: THREE.DoubleSide });
  const petalGeometry = new THREE.SphereGeometry(1, 12, 6);
  const petals = new THREE.InstancedMesh(petalGeometry, petalsMaterial, 1100);
  petals.name = "eleven-hundred-iridescent-petals";
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  for (let i = 0; i < 1100; i++) {
    const t = i / 1099, angle = t * Math.PI * 7;
    const radius = 1.2 + Math.sin(t * Math.PI) * 2.1;
    const jitter = Math.sin(i * 23.71);
    const spread = Math.sin(i * 8.71) * 0.65;
    dummy.position.set(Math.cos(angle) * (radius + spread), 1.5 + t * 5.2 + jitter * 0.37, -0.8 + Math.sin(angle) * (radius + spread) * 0.72);
    dummy.rotation.set(t * 6 + jitter * 1.6, angle, angle * 0.3 + jitter);
    dummy.scale.set(0.095 + (i % 9) * 0.009, 0.012, 0.19 + (i % 7) * 0.011);
    dummy.updateMatrix(); petals.setMatrixAt(i, dummy.matrix);
    color.setHSL(0.36 + (i % 53) / 53 * 0.27, 0.19, 0.7 + (i % 11) / 110);
    petals.setColorAt(i, color);
  }
  garden.add(petals);
  // Curving ivory seats make the installation read as a place to inhabit.
  for (const x of [-6.6, 6.6]) {
    box(garden, ivory, [x, 0.55, 0], [1.1, 0.35, 6]);
    box(garden, seam, [x, 0.18, 0], [0.65, 0.36, 5.5]);
  }
  const ambient = new THREE.HemisphereLight(0xe2f6fb, 0x727d66, 2.1);
  const sun = new THREE.DirectionalLight(0xffe5b9, 3.2); sun.position.set(-4, 12, 4);
  garden.add(ambient, sun);
  garden.userData.setLighting = (level) => {
    skyMaterial.color.lerpColors(new THREE.Color(0xffffff), new THREE.Color(0x385e91), level);
    ambient.intensity = 2.1 - level * 1.25;
    sun.intensity = 3.2 - level * 2.6;
    petalsMaterial.emissive.setHex(0x82bac6); petalsMaterial.emissiveIntensity = level * 0.18;
  };
  garden.userData.portalTargets = addRoomPortals(garden, "garden");
  garden.userData.petalCount = 1100;
  return garden;
}
