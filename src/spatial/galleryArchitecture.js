import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { createLightInstallation } from "./lightInstallation";
import { stoneTexture } from "./pavilionMaterials";

export function createGalleryArchitecture({ reflectionSize, reflectionSamples, balancedLighting = false } = {}) {
  if (!balancedLighting) RectAreaLightUniformsLib.init();
  const gallery = new THREE.Group();
  gallery.name = "lumen-pavilion";
  const texture = stoneTexture();
  const limestone = new THREE.MeshStandardMaterial({
    color: 0xcac1ac, map: texture, bumpMap: texture, bumpScale: 0.009, roughness: 0.86,
  });
  const darkStone = new THREE.MeshStandardMaterial({
    color: 0x515752, map: texture, bumpMap: texture, bumpScale: 0.012, roughness: 0.43, metalness: 0.18,
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
      diffuseColor.rgb *= 1.0 - floorJoint * 0.16;`,
    );
  };
  const bronze = new THREE.MeshStandardMaterial({ color: 0x8d7247, metalness: 0.9, roughness: 0.3 });
  const charcoal = new THREE.MeshStandardMaterial({ color: 0x101c1c, roughness: 0.8 });
  const warmLight = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffdeb0).multiplyScalar(2) });
  const coolLight = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xc5e2ef).multiplyScalar(2) });
  const box = (x, y, z, w, h, d, material, castShadow = false) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = castShadow;
    gallery.add(mesh);
    return mesh;
  };
  box(0, -0.2, 0, 23, 0.4, 29, darkStone);
  box(-10.7, 4.4, 0, 0.8, 8.8, 27, limestone, true);
  box(10.7, 4.4, 0, 0.8, 8.8, 27, limestone, true);
  // One immense circular opening replaces decorative repeated arches.
  const rear = new THREE.Shape();
  rear.moveTo(-11, 0); rear.lineTo(11, 0); rear.lineTo(11, 9.8); rear.lineTo(-11, 9.8); rear.closePath();
  const opening = new THREE.Path();
  opening.absarc(2.2, 5.1, 3.65, 0, Math.PI * 2, true);
  rear.holes.push(opening);
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
  const horizon = new THREE.Mesh(new THREE.PlaneGeometry(45, 26), new THREE.MeshBasicMaterial({ map: skyTexture(), toneMapped: false }));
  horizon.position.set(0, 6, -13);
  gallery.add(horizon);
  // A deep central skylight, framed by stone slabs and bronze cross members.
  box(-6.7, 8.8, 0, 8.6, 0.45, 27, limestone, true);
  box(6.7, 8.8, 0, 8.6, 0.45, 27, limestone, true);
  box(0, 9.65, 0, 4.8, 0.03, 27, coolLight);
  for (let z = -11; z <= 13; z += 1.25) box(0, 9.15, z, 4.8, 0.12, 0.045, bronze, true);
  for (const x of [-2.38, 2.38]) box(x, 8.56, 0, 0.025, 0.025, 26, warmLight);
  // Slender bronze fins make the left corridor recede into shadow.
  for (let z = -9; z <= 10; z += 0.42) box(-9.72, 3.95, z, 0.055, 7.9, 0.16, bronze, true);
  box(-10.15, 0.035, 0, 0.02, 0.03, 25, warmLight);
  box(10.15, 0.035, 0, 0.02, 0.03, 25, warmLight);
  const works = [
    { x: -4.5, width: 2.7, height: 2.06, title: "01  /  THE FAMILY", detail: "PERSONAL PHOTOGRAPHS" },
    { x: 0, width: 2.8, height: 1.6, title: "02  /  THE VOICE", detail: "BENNO KERN · TESTIMONY" },
    { x: 4.5, width: 2.8, height: 1.52, title: "03  /  THE CITY", detail: "VIENNA · A PLACE REMEMBERED" },
  ];
  const exhibitLights = [];
  for (const work of works) {
    box(work.x, 2.6, -7.82, 3.65, 5.2, 0.45, limestone, true);
    box(work.x, 2.75, -7.53, work.width + 0.12, work.height + 0.12, 0.07, bronze);
    box(work.x, 2.75, -7.48, work.width + 0.035, work.height + 0.035, 0.02, charcoal);
    box(work.x, 5.06, -7.51, 3.35, 0.018, 0.02, warmLight);
    const label = labelMesh(work.title, work.detail);
    label.position.set(work.x - work.width / 2 + 0.8, 2.75 - work.height / 2 - 0.32, -7.48);
    gallery.add(label);
    const light = new THREE.SpotLight(0xffe4bb, 35, 10, 0.62, 0.8, 2);
    light.position.set(work.x, 5.6, -4.8);
    light.target.position.set(work.x, 2.5, -7.8);
    exhibitLights.push(light);
    gallery.add(light, light.target);
  }
  box(-4.85, 0.39, 0.6, 3.6, 0.22, 0.85, limestone, true);
  box(-6.2, 0.15, 0.6, 0.15, 0.3, 0.6, bronze, true);
  box(-3.5, 0.15, 0.6, 0.15, 0.3, 0.6, bronze, true);
  gallery.add(createLightInstallation());
  const coarse = matchMedia("(pointer: coarse)").matches;
  const mirrorSize = reflectionSize ?? (coarse ? 512 : 1024);
  const poolShader = {
    ...Reflector.ReflectorShader,
    uniforms: {
      ...THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms),
      texelSize: { value: new THREE.Vector2(1 / mirrorSize, 1 / mirrorSize) },
    },
    vertexShader: Reflector.ReflectorShader.vertexShader
      .replace("varying vec4 vUv;", "varying vec4 vUv; varying vec3 vWorldPosition;")
      .replace("vUv = textureMatrix", "vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz; vUv = textureMatrix"),
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec3 color;
      uniform vec2 texelSize;
      varying vec4 vUv;
      varying vec3 vWorldPosition;
      #include <common>
      #include <logdepthbuf_pars_fragment>
      void main() {
        #include <logdepthbuf_fragment>
        vec2 uv = vUv.xy / vUv.w;
        vec2 offset = texelSize * 1.7;
        vec3 reflected = texture2D(tDiffuse, uv).rgb * 0.28;
        reflected += texture2D(tDiffuse, uv + vec2(offset.x, 0.0)).rgb * 0.12;
        reflected += texture2D(tDiffuse, uv - vec2(offset.x, 0.0)).rgb * 0.12;
        reflected += texture2D(tDiffuse, uv + vec2(0.0, offset.y)).rgb * 0.12;
        reflected += texture2D(tDiffuse, uv - vec2(0.0, offset.y)).rgb * 0.12;
        reflected += texture2D(tDiffuse, uv + offset).rgb * 0.06;
        reflected += texture2D(tDiffuse, uv - offset).rgb * 0.06;
        reflected += texture2D(tDiffuse, uv + vec2(offset.x, -offset.y)).rgb * 0.06;
        reflected += texture2D(tDiffuse, uv + vec2(-offset.x, offset.y)).rgb * 0.06;
        float fresnel = pow(1.0 - abs(normalize(cameraPosition - vWorldPosition).y), 2.0);
        gl_FragColor = vec4(mix(color, reflected, 0.38 + 0.48 * fresnel), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  };
  const pool = new Reflector(new THREE.CircleGeometry(3.65, 128), {
    color: 0x0d1b1b, textureWidth: mirrorSize, textureHeight: mirrorSize,
    clipBias: 0.003, multisample: reflectionSamples ?? (coarse ? 2 : 4), shader: poolShader,
  });
  pool.name = "still-water";
  pool.camera.layers.enable(2);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(2.2, 0.014, 0);
  // Spark may request a second stationary frame while sorting. Reuse the
  // mirror until its camera, lighting, or photographed assets change.
  const renderReflection = pool.onBeforeRender;
  const lastView = new THREE.Matrix4(), lastProjection = new THREE.Matrix4();
  let reflectionReady = false, reflectedLevel = -1, reflectedAssets = -1;
  pool.onBeforeRender = (...args) => {
    const camera = args[2];
    const level = gallery.userData.lightLevel ?? 0;
    const assets = gallery.parent?.userData.reflectionVersion ?? 0;
    if (reflectionReady && lastView.equals(camera.matrixWorldInverse) &&
        lastProjection.equals(camera.projectionMatrix) && reflectedLevel === level && reflectedAssets === assets)
      return;
    renderReflection.apply(pool, args);
    lastView.copy(camera.matrixWorldInverse);
    lastProjection.copy(camera.projectionMatrix);
    reflectedLevel = level;
    reflectedAssets = assets;
    reflectionReady = true;
  };
  gallery.add(pool);
  const edge = new THREE.Mesh(new THREE.TorusGeometry(3.69, 0.018, 6, 144), bronze);
  edge.rotation.x = Math.PI / 2;
  edge.position.copy(pool.position);
  gallery.add(edge);
  const caption = labelMesh("CONTINUUM / 001", "A STUDY IN LIGHT AND REMEMBRANCE", "#d2c6a6");
  caption.position.set(2.2, 0.018, 4.1);
  caption.rotation.x = -Math.PI / 2;
  caption.scale.setScalar(1.8);
  gallery.add(caption);
  const ambient = new THREE.HemisphereLight(0xc7dfdf, 0x302b20, 0.55);
  const sun = new THREE.DirectionalLight(0xffdfac, 3.5);
  sun.position.set(-3, 12, 6);
  sun.target.position.set(0, 0, -4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 0.5, far: 35 });
  sun.shadow.normalBias = 0.05;
  sun.shadow.bias = -0.00003;
  const fill = balancedLighting
    ? new THREE.DirectionalLight(0xc2deed, 0.85)
    : new THREE.RectAreaLight(0xc2deed, 3.2, 5, 6);
  fill.position.set(6.5, 5, 4);
  if (fill.isDirectionalLight) {
    fill.target.position.set(2.2, 3, 0);
    gallery.add(fill.target);
  } else fill.lookAt(2.2, 3, 0);
  const sculptureLight = new THREE.PointLight(0xffc874, 24, 8, 1.7);
  sculptureLight.position.set(2.2, 3.2, 0.2);
  gallery.add(ambient, sun, sun.target, fill, sculptureLight);
  const daySky = new THREE.Color(0xffffff), nightSky = new THREE.Color(0x344b61);
  const dayCeiling = coolLight.color.clone(), nightCeiling = new THREE.Color(0x284b68).multiplyScalar(0.8);
  gallery.userData.setLighting = (level) => {
    const blend = Number(level);
    gallery.userData.lightLevel = blend;
    ambient.intensity = THREE.MathUtils.lerp(0.55, 0.17, blend);
    sun.intensity = THREE.MathUtils.lerp(3.5, 0.35, blend);
    fill.intensity = THREE.MathUtils.lerp(balancedLighting ? 0.85 : 3.2, balancedLighting ? 0.25 : 1.1, blend);
    sculptureLight.intensity = THREE.MathUtils.lerp(24, 36, blend);
    horizon.material.color.lerpColors(daySky, nightSky, blend);
    coolLight.color.lerpColors(dayCeiling, nightCeiling, blend);
    exhibitLights.forEach((light) => (light.intensity = THREE.MathUtils.lerp(35, 42, blend)));
  };
  return gallery;
}

function skyTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 32; canvas.height = 512;
  const context = canvas.getContext("2d"), gradient = context.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, "#71909b"); gradient.addColorStop(0.55, "#b7c4bf");
  gradient.addColorStop(0.83, "#ddd2ae"); gradient.addColorStop(1, "#929b86");
  context.fillStyle = gradient; context.fillRect(0, 0, 32, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
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
