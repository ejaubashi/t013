import * as THREE from "three";
import { addRoomPortals } from "./galleryRooms";

// An authored optical installation. The floor light is a procedural artwork,
// not a physical caustics solver. The renderer scales its refraction buffer.
export function createPrismChamber() {
  const chamber = new THREE.Group();
  chamber.name = "prism-chamber";
  const stone = new THREE.MeshStandardMaterial({ color: 0x272637, roughness: 0.43, metalness: 0.3 });
  const porcelain = new THREE.MeshStandardMaterial({ color: 0xc9c6d8, roughness: 0.36, metalness: 0.18 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x7d7994, roughness: 0.3, metalness: 0.85 });
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xc5c7ff).multiplyScalar(2) });
  const box = (material, x, y, z, w, h, d) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); chamber.add(mesh); return mesh;
  };
  box(stone, 0, -0.2, 0, 23, 0.4, 29);
  for (const x of [-10.7, 10.7]) {
    box(stone, x, 5, 0, 0.6, 10, 28);
    for (let z = -10; z < 13; z += 0.75) box(trim, x * 0.97, 4.8, z, 0.04, 9.6, 0.1);
    box(glow, x * 0.96, 0.035, 0, 0.018, 0.02, 27);
  }
  box(stone, 0, 10, 0, 22, 0.3, 28);
  box(stone, 0, 5, -10.2, 13.6, 10, 0.5);
  for (const x of [-10.35, 10.35]) box(stone, x, 5, -10.2, 0.7, 10, 0.5);
  for (const x of [-8.4, 8.4]) box(stone, x, 8, -10.2, 3.5, 4, 0.5);
  const haloGeometry = new THREE.TorusGeometry(3.95, 0.035, 8, 192);
  const positions = haloGeometry.getAttribute("position"), colors = [];
  const color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    color.setHSL((Math.atan2(positions.getY(i), positions.getX(i)) / (Math.PI * 2) + 1) % 1, 0.85, 0.5).multiplyScalar(1.4);
    colors.push(color.r, color.g, color.b);
  }
  haloGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const halo = new THREE.Mesh(haloGeometry, new THREE.MeshBasicMaterial({ vertexColors: true }));
  halo.position.set(0, 4.8, -9.84); chamber.add(halo);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.85, 128), new THREE.ShaderMaterial({
    vertexShader: "varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader: `varying vec2 vUv; void main(){
      vec2 p=vUv-0.5;
      vec3 spectrum=0.55+0.45*cos(6.28318*(p.x*0.65+p.y*0.3+vec3(0.0,0.33,0.67)));
      float glow=0.35+0.5*exp(-dot(p,p)*5.0);
      gl_FragColor=vec4(mix(vec3(0.16,0.18,0.27),spectrum*0.95,glow),1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  }));
  disc.position.set(0, 4.8, -9.8); chamber.add(disc);
  for (const x of [-5.2, 5.2]) box(glow, x, 9.8, 0, 0.025, 0.02, 25);
  const island = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.65, 0.28, 96), porcelain);
  island.position.set(0, 0.14, -0.8); chamber.add(island);
  const islandRim = new THREE.Mesh(new THREE.TorusGeometry(4.42, 0.018, 6, 144), glow);
  islandRim.rotation.x = Math.PI / 2; islandRim.position.set(0, 0.29, -0.8); chamber.add(islandRim);
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xe4e8ff, roughness: 0.07, metalness: 0,
    transmission: 0.92, thickness: 2.5, ior: 1.48,
    dispersion: 0.85, clearcoat: 1,
    iridescence: 0.28, iridescenceIOR: 1.35,
    iridescenceThicknessRange: [100, 420], envMapIntensity: 2.1,
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
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(crystalGeometry), new THREE.LineBasicMaterial({ color: 0xbfc7ed, transparent: true, opacity: 0.32 }));
    outline.position.copy(crystal.position); outline.scale.copy(crystal.scale); outline.rotation.copy(crystal.rotation);
    installation.add(outline);
  }
  chamber.add(installation);
  const spectrumUniform = { value: 0.5 };
  const caustics = new THREE.Mesh(new THREE.PlaneGeometry(19, 23), new THREE.ShaderMaterial({
    uniforms: { uSpectrum: spectrumUniform }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: "varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader: `
      uniform float uSpectrum;
      varying vec2 vUv;
      vec3 palette(float t) { return 0.55 + 0.45*cos(6.28318*(vec3(0.0,0.33,0.67)+t)); }
      void main() {
        vec2 p=(vUv-0.5)*vec2(19.0,23.0);
        p.x += (uSpectrum-0.5)*4.0;
        float a=atan(p.y+1.5,p.x), r=length(p*vec2(0.85,1.0));
        float wave=sin(r*2.2+sin(a*3.0+uSpectrum*3.0)*1.8);
        float bands=pow(max(0.0,1.0-abs(wave)),9.0);
        float falloff=exp(-r*r*0.021)*smoothstep(0.6,2.0,r);
        vec3 spectrum=palette(a/6.28318+uSpectrum*0.3+r*0.055);
        gl_FragColor=vec4(spectrum*1.5,bands*falloff*0.72);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  caustics.rotation.x = -Math.PI / 2; caustics.position.set(0, 0.305, -0.8); chamber.add(caustics);
  const rays = new THREE.Group(); rays.position.set(0, 3.9, -0.8);
  for (let i = 0; i < 7; i++) {
    const rayGeometry = new THREE.BufferGeometry();
    rayGeometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, -4.9 + i * 1.4, -3.58, 7.5, -4.2 + i * 1.4, -3.58, 7.5], 3));
    color.setHSL(i / 8, 0.7, 0.65);
    const ray = new THREE.Mesh(rayGeometry, new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(1.8), transparent: true, opacity: 0.055, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    rays.add(ray);
  }
  chamber.add(rays);
  const ambient = new THREE.HemisphereLight(0xd8dcff, 0x392a43, 1.1);
  const key = new THREE.PointLight(0xf5d7c2, 80, 23, 1.6); key.position.set(-4, 7.5, 4);
  const fill = new THREE.PointLight(0x9aafff, 65, 20, 1.6); fill.position.set(4, 5, -4);
  chamber.add(ambient, key, fill);
  chamber.userData.setSpectrum = (value) => {
    const level = THREE.MathUtils.clamp(value, 0, 1);
    spectrumUniform.value = level;
    rays.rotation.y = (level - 0.5) * 0.65;
    installation.rotation.y = (level - 0.5) * 0.18;
    key.color.setHSL(0.05 + level * 0.68, 0.35, 0.8);
    fill.color.setHSL(0.65 - level * 0.45, 0.45, 0.75);
    chamber.userData.spectrum = level;
  };
  chamber.userData.setLighting = (level) => {
    ambient.intensity = 1.1 - level * 0.6;
    key.intensity = 80 + level * 15;
    fill.intensity = 65 + level * 20;
  };
  chamber.userData.crystalCount = crystals.length;
  chamber.userData.portalTargets = addRoomPortals(chamber, "prism");
  chamber.userData.setSpectrum(0.5);
  return chamber;
}
