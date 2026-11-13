import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { createLightInstallation } from "./lightInstallation";
import { stoneTexture } from "./pavilionMaterials";
import { createGalleryAtmosphere } from "./galleryAtmosphere";
import { createGalleryVista } from "./galleryVista";
import { galleryPalette as palette } from "./galleryPalette";

export function createGalleryArchitecture({ reflectionSize, reflectionSamples, balancedLighting = false } = {}) {
  if (!balancedLighting) RectAreaLightUniformsLib.init();
  const gallery = new THREE.Group();
  gallery.name = "lumen-pavilion";
  const texture = stoneTexture();
  const limestone = new THREE.MeshStandardMaterial({
    color: palette.plaster, map: texture, bumpMap: texture, bumpScale: 0.003, roughness: 0.86,
  });
  const darkStone = new THREE.MeshStandardMaterial({
    color: palette.stone, map: texture, bumpMap: texture, bumpScale: 0.004, roughness: 0.92, metalness: 0,
  });
  // Screen-space filtering keeps distant floor joints from breaking into dots.
  darkStone.onBeforeCompile = (shader) => {
    shader.vertexShader = "varying vec2 pavilionFloorPosition;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\npavilionFloorPosition = (modelMatrix * vec4(transformed, 1.0)).xz;",
    );
    shader.fragmentShader = "varying vec2 pavilionFloorPosition;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      vec2 floorGrid = pavilionFloorPosition / vec2(3.0, 4.0);
      vec2 jointDistance = abs(fract(floorGrid - 0.5) - 0.5) / max(fwidth(floorGrid), vec2(0.0001));
      float floorJoint = 1.0 - min(min(jointDistance.x, jointDistance.y), 1.0);
      diffuseColor.rgb *= 1.0 - floorJoint * 0.045;`,
    );
  };
  const bronze = new THREE.MeshStandardMaterial({ color: palette.trim, metalness: 0.32, roughness: 0.65 });
  const charcoal = new THREE.MeshStandardMaterial({ color: palette.charcoal, roughness: 0.8 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: palette.porcelain, metalness: 0, roughness: 0.3,
    transparent: true, opacity: 0.055, depthWrite: false,
    side: THREE.DoubleSide, envMapIntensity: 0.7,
  });
  const warmLight = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.warmLight) });
  const coolLight = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.daylight) });
  const box = (x, y, z, w, h, d, material, castShadow = false) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = castShadow;
    gallery.add(mesh);
    return mesh;
  };
  box(0, -0.2, 0, 23, 0.4, 29, darkStone);
  box(-10.2, 4.4, 0, 0.8, 8.8, 27, limestone, true);
  box(10.2, 4.4, 0, 0.8, 8.8, 27, limestone, true);
  // One immense circular opening replaces decorative repeated arches.
  const rear = new THREE.Shape();
  rear.moveTo(-11, 0); rear.lineTo(11, 0); rear.lineTo(11, 9.8); rear.lineTo(-11, 9.8); rear.closePath();
  const opening = new THREE.Path();
  opening.absarc(2.2, 5.1, 3.65, 0, Math.PI * 2, true);
  rear.holes.push(opening);
  for (const center of [-8.4, 8.4]) {
    const threshold = new THREE.Path();
    threshold.moveTo(center - 1.45, 0);
    threshold.lineTo(center - 1.45, 5.65);
    threshold.lineTo(center + 1.45, 5.65);
    threshold.lineTo(center + 1.45, 0);
    threshold.closePath();
    rear.holes.push(threshold);
  }
  const rearWall = new THREE.Mesh(new THREE.ExtrudeGeometry(rear, {
    depth: 0.65, steps: 1, bevelEnabled: true,
    bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 3, curveSegments: 96,
  }), limestone);
  rearWall.position.z = -10.5;
  rearWall.receiveShadow = true;
  gallery.add(rearWall);
  const oculus = new THREE.Mesh(new THREE.TorusGeometry(3.64, 0.035, 8, 144), bronze);
  oculus.position.set(2.2, 5.1, -9.78);
  gallery.add(oculus);
  const vista = createGalleryVista();
  gallery.add(vista);
  // A deep central skylight, framed by stone slabs and bronze cross members.
  box(-6.7, 8.8, 0, 8.6, 0.45, 27, limestone, true);
  box(6.7, 8.8, 0, 8.6, 0.45, 27, limestone, true);
  box(0, 9.65, 0, 4.8, 0.03, 27, coolLight);
  for (let z = -11; z <= 13; z += 4) box(0, 9.15, z, 4.8, 0.12, 0.045, bronze, true);
  for (const x of [-2.38, 2.38]) box(x, 8.56, 0, 0.025, 0.025, 26, warmLight);
  // Unbroken plaster walls leave the paintings room to breathe.
  box(-10.15, 0.035, 0, 0.02, 0.03, 25, warmLight);
  box(10.15, 0.035, 0, 0.02, 0.03, 25, warmLight);
  const works = [
    { x: -4.5, width: 2.7, height: 2.06, title: "01  /  THE FAMILY", detail: "PERSONAL PHOTOGRAPHS" },
    { x: 0, width: 2.8, height: 1.6, title: "02  /  THE VOICE", detail: "BENNO KERN · TESTIMONY" },
    { x: 4.5, width: 2.8, height: 1.52, title: "03  /  THE CITY", detail: "VIENNA · A PLACE REMEMBERED" },
  ];
  const exhibitLights = [];
  for (const work of works) {
    box(work.x, 2.6, -7.82, 3.65, 5.2, 0.065, glass);
    for (const edge of [-1.84, 1.84])
      box(work.x + edge, 2.6, -7.82, 0.018, 5.2, 0.085, bronze);
    box(work.x, 0.065, -7.82, 3.75, 0.13, 0.4, bronze, true);
    box(work.x, 0.14, -7.6, 3.5, 0.018, 0.025, coolLight);
    box(work.x, 2.75, -7.53, work.width + 0.12, work.height + 0.12, 0.07, bronze);
    box(work.x, 2.75, -7.48, work.width + 0.035, work.height + 0.035, 0.02, charcoal);
    box(work.x, 5.06, -7.51, 3.35, 0.018, 0.02, warmLight);
    const labelY = 2.75 - work.height / 2 - 0.32;
    const labelX = work.x - work.width / 2 + 0.8;
    box(labelX, labelY, -7.505, 1.7, 0.29, 0.025, charcoal);
    const label = labelMesh(work.title, work.detail, "#f4f1e9");
    label.position.set(labelX, labelY, -7.48);
    gallery.add(label);
    const light = new THREE.SpotLight(palette.daylight, 22, 10, 0.62, 0.8, 2);
    light.position.set(work.x, 5.6, -4.8);
    light.target.position.set(work.x, 2.5, -7.8);
    exhibitLights.push(light);
    gallery.add(light, light.target);
  }
  box(-4.85, 0.39, 0.6, 3.6, 0.22, 0.85, limestone, true);
  box(-6.2, 0.15, 0.6, 0.15, 0.3, 0.6, bronze, true);
  box(-3.5, 0.15, 0.6, 0.15, 0.3, 0.6, bronze, true);
  const installation = createLightInstallation();
  const atmosphere = createGalleryAtmosphere();
  gallery.add(installation, atmosphere);
  gallery.userData.mirrorCount = installation.userData.mirrorCount;
  gallery.userData.setArtPhase = (value) => {
    installation.userData.setPhase(value);
    gallery.userData.artPhase = value;
  };
  const coarse = matchMedia("(pointer: coarse)").matches;
  const mirrorSize = reflectionSize ?? (coarse ? 512 : 1024);
  // A low limestone island replaces the dark reflecting basin. Its footprint
  // matches the existing walking clearance around the sculpture.
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.16, 128),
    new THREE.MeshStandardMaterial({ color: palette.porcelain, roughness: 0.94 }));
  plinth.position.set(2.2, 0.08, 0); plinth.receiveShadow = true; gallery.add(plinth);
  const caption = labelMesh("AFTERIMAGE / 001", "A STUDY IN FORM AND LIGHT", "#777267");
  caption.position.set(2.2, 0.165, 3.6);
  caption.rotation.x = -Math.PI / 2;
  caption.scale.setScalar(1.8);
  gallery.add(caption);
  const ambient = new THREE.HemisphereLight(palette.daylight, palette.stone, 1.25);
  const sun = new THREE.DirectionalLight(palette.daylight, 2.4);
  sun.position.set(-3, 12, 6);
  sun.target.position.set(0, 0, -4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 0.5, far: 35 });
  sun.shadow.normalBias = 0.05;
  sun.shadow.bias = -0.00003;
  const fill = balancedLighting
    ? new THREE.DirectionalLight(palette.daylight, 1.0)
    : new THREE.RectAreaLight(palette.daylight, 2.2, 5, 6);
  fill.position.set(6.5, 5, 4);
  if (fill.isDirectionalLight) {
    fill.target.position.set(2.2, 3, 0);
    gallery.add(fill.target);
  } else fill.lookAt(2.2, 3, 0);
  const sculptureLight = new THREE.PointLight(palette.warmLight, 6, 8, 1.7);
  sculptureLight.position.set(2.2, 3.2, 0.2);
  gallery.add(ambient, sun, sun.target, fill, sculptureLight);
  const dayCeiling = coolLight.color.clone(), nightCeiling = new THREE.Color(palette.warmLight).multiplyScalar(0.75);
  gallery.userData.setLighting = (level) => {
    const blend = Number(level);
    gallery.userData.lightLevel = blend;
    atmosphere.userData.setLighting(blend);
    ambient.intensity = THREE.MathUtils.lerp(1.25, 0.6, blend);
    sun.intensity = THREE.MathUtils.lerp(2.4, 0.35, blend);
    fill.intensity = THREE.MathUtils.lerp(balancedLighting ? 1.0 : 2.2, balancedLighting ? 0.55 : 1.0, blend);
    sculptureLight.intensity = THREE.MathUtils.lerp(6, 12, blend);
    vista.userData.setLighting(blend);
    coolLight.color.lerpColors(dayCeiling, nightCeiling, blend);
    exhibitLights.forEach((light) => (light.intensity = THREE.MathUtils.lerp(22, 26, blend)));
  };
  return gallery;
}

function labelMesh(title, detail, ink = "#292d27") {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 160;
  const context = canvas.getContext("2d");
  context.fillStyle = ink; context.font = "500 32px Archivo, Arial, sans-serif"; context.fillText(title, 3, 60);
  context.globalAlpha = 0.65; context.font = "400 19px Archivo, Arial, sans-serif"; context.fillText(detail, 3, 103);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.25), new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false, toneMapped: false,
  }));
}
