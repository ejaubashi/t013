import * as THREE from "three";

// An authored horizon beyond the pavilion, not a reconstruction of Vienna.
export function createGalleryVista() {
  const vista = new THREE.Group();
  const canvas = document.createElement("canvas");
  canvas.width = 64; canvas.height = 512;
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, "#1e4967");
  gradient.addColorStop(0.55, "#8bd4ce");
  gradient.addColorStop(0.8, "#e7b18f");
  gradient.addColorStop(1, "#315764");
  context.fillStyle = gradient; context.fillRect(0, 0, 64, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const skyMaterial = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(180, 95), skyMaterial);
  sky.position.set(0, 12, -60);
  vista.add(sky);
  const hillMaterials = [];
  for (let layer = 2; layer >= 0; layer--) {
    const shape = new THREE.Shape();
    shape.moveTo(-90, -18);
    for (let i = 0; i <= 100; i++) {
      const x = -90 + i * 1.8;
      const y = 2.4 + layer * 0.75 + Math.sin(x * 0.06 + layer) * 1.3 + Math.sin(x * 0.17 + layer * 2) * 0.45;
      shape.lineTo(x, y);
    }
    shape.lineTo(90, -18); shape.closePath();
    const material = new THREE.MeshBasicMaterial({ color: [0x416e73, 0x648b8c, 0x8ca3a0][layer] });
    const hills = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
    hills.position.z = -28 - layer * 5;
    hillMaterials.push({ material, day: material.color.clone() });
    vista.add(hills);
  }
  const sunMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffdcaa).multiplyScalar(1.6), transparent: true });
  const sun = new THREE.Mesh(new THREE.CircleGeometry(1.7, 96), sunMaterial);
  sun.position.set(-6, 9, -43);
  vista.add(sun);
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = 128;
  const glowContext = glowCanvas.getContext("2d");
  const glow = glowContext.createRadialGradient(64, 64, 0, 64, 64, 64);
  glow.addColorStop(0, "rgba(255,220,168,0.8)");
  glow.addColorStop(0.2, "rgba(255,199,150,0.3)");
  glow.addColorStop(1, "rgba(255,180,130,0)");
  glowContext.fillStyle = glow; glowContext.fillRect(0, 0, 128, 128);
  const glowTexture = new THREE.CanvasTexture(glowCanvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  const glowMaterial = new THREE.MeshBasicMaterial({ map: glowTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.65 });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), glowMaterial);
  halo.position.set(-6, 9, -42.9);
  vista.add(halo);
  const day = new THREE.Color(0xffffff), night = new THREE.Color(0x223e61);
  vista.userData.setLighting = (level) => {
    skyMaterial.color.lerpColors(day, night, level);
    sunMaterial.opacity = 1 - level * 0.97;
    glowMaterial.opacity = 0.65 * (1 - level);
    hillMaterials.forEach(({ material, day: base }) => material.color.copy(base).lerp(night, level * 0.8));
  };
  return vista;
}
