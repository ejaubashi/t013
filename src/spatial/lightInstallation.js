import * as THREE from "three";

const columns = 110;
const rows = 22;
const count = columns * rows;

function ribbonPosition(u, v) {
  const angle = u * Math.PI * 2.05 - Math.PI;
  return new THREE.Vector3(
    2.05 * Math.sin(angle) + v * 1.14 * Math.cos(angle),
    (u - 0.5) * 5.25 + 0.23 * Math.sin(v * Math.PI + angle),
    0.9 * Math.cos(angle) - v * 0.9 * Math.sin(angle),
  );
}

function bloomPosition(u, v) {
  const angle = u * Math.PI * 2;
  const radius = (0.7 + (v + 1) * 1.14) * (1 + 0.16 * Math.cos(angle * 6));
  return new THREE.Vector3(
    radius * Math.cos(angle) * 1.05,
    radius * Math.sin(angle) * 0.95,
    0.5 * Math.sin(angle * 3) + 0.62 * Math.cos(radius * 1.3 + angle * 6),
  );
}

// The GPU transforms each mirror, including its normals, between two authored
// arrangements. Both cameras see the same pose without rebuilding geometry.
function addMorph(material, phase) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uArtPhase = phase;
    shader.vertexShader = `
      uniform float uArtPhase;
      attribute vec3 aRibbon;
      attribute vec3 aConstellation;
      attribute vec4 aRibbonRotation;
      attribute vec4 aConstellationRotation;
      attribute vec3 aBloom;
      attribute vec4 aBloomRotation;
      vec4 mirrorRotation() {
        float segment = step(1.0, uArtPhase);
        vec4 origin = mix(aRibbonRotation, aConstellationRotation, segment);
        vec4 target = mix(aConstellationRotation, aBloomRotation, segment);
        if (dot(origin, target) < 0.0) target = -target;
        return normalize(mix(origin, target, clamp(uArtPhase - segment, 0.0, 1.0)));
      }
      vec3 mirrorPosition() {
        float segment = step(1.0, uArtPhase);
        return mix(mix(aRibbon, aConstellation, segment), mix(aConstellation, aBloom, segment), clamp(uArtPhase - segment, 0.0, 1.0));
      }
      vec3 rotateMirror(vec4 q, vec3 point) {
        return point + 2.0 * cross(q.xyz, cross(q.xyz, point) + q.w * point);
      }
    ` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <beginnormal_vertex>",
      "#include <beginnormal_vertex>\nobjectNormal = rotateMirror(mirrorRotation(), objectNormal);",
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "vec3 transformed = rotateMirror(mirrorRotation(), position) + mirrorPosition();",
    );
  };
  material.customProgramCacheKey = () => "kinetic-mirrors-v2";
}

export function createLightInstallation() {
  const installation = new THREE.Group();
  installation.name = "the-kinetic-archive";
  const phase = { value: 0 };
  const positionA = new Float32Array(count * 3);
  const positionB = new Float32Array(count * 3);
  const rotationA = new Float32Array(count * 4);
  const rotationB = new Float32Array(count * 4);
  const positionC = new Float32Array(count * 3);
  const rotationC = new Float32Array(count * 4);
  const right = new THREE.Vector3(), up = new THREE.Vector3(), normal = new THREE.Vector3();
  const basis = new THREE.Matrix4(), quaternion = new THREE.Quaternion();
  const identity = new THREE.Matrix4();
  const top = new THREE.Color(0xe8c58a), bottom = new THREE.Color(0x9de8de);
  const colors = [];
  for (let column = 0; column < columns; column++) {
    const u = column / (columns - 1);
    for (let row = 0; row < rows; row++) {
      const i = column * rows + row;
      const v = (row / (rows - 1) - 0.5) * 2;
      const point = ribbonPosition(u, v);
      point.toArray(positionA, i * 3);
      right.copy(ribbonPosition(u, v + 0.001)).sub(ribbonPosition(u, v - 0.001)).normalize();
      up.copy(ribbonPosition(u + 0.001, v)).sub(ribbonPosition(u - 0.001, v)).normalize();
      normal.crossVectors(right, up).normalize();
      up.crossVectors(normal, right).normalize();
      basis.makeBasis(right, up, normal);
      quaternion.setFromRotationMatrix(basis).toArray(rotationA, i * 4);
      const latitude = Math.acos(1 - (2 * (i + 0.5)) / count);
      const longitude = i * Math.PI * (3 - Math.sqrt(5));
      const radius = 2.2 + 0.15 * Math.sin(latitude * 5 + longitude * 2);
      point.set(
        radius * Math.sin(latitude) * Math.cos(longitude),
        radius * Math.cos(latitude) * 1.13,
        radius * Math.sin(latitude) * Math.sin(longitude),
      );
      point.toArray(positionB, i * 3);
      normal.copy(point).normalize();
      right.crossVectors(new THREE.Vector3(0, 1, 0), normal).normalize();
      up.crossVectors(normal, right).normalize();
      basis.makeBasis(right, up, normal);
      quaternion.setFromRotationMatrix(basis).toArray(rotationB, i * 4);
      bloomPosition(u, v).toArray(positionC, i * 3);
      right.copy(bloomPosition(u, v + 0.001)).sub(bloomPosition(u, v - 0.001)).normalize();
      up.copy(bloomPosition(u + 0.001, v)).sub(bloomPosition(u - 0.001, v)).normalize();
      normal.crossVectors(right, up).normalize();
      up.crossVectors(normal, right).normalize();
      basis.makeBasis(right, up, normal);
      quaternion.setFromRotationMatrix(basis).toArray(rotationC, i * 4);
      colors.push(bottom.clone().lerp(top, u * u));
    }
  }
  const attributes = {
    aRibbon: new THREE.InstancedBufferAttribute(positionA, 3),
    aConstellation: new THREE.InstancedBufferAttribute(positionB, 3),
    aRibbonRotation: new THREE.InstancedBufferAttribute(rotationA, 4),
    aConstellationRotation: new THREE.InstancedBufferAttribute(rotationB, 4),
    aBloom: new THREE.InstancedBufferAttribute(positionC, 3),
    aBloomRotation: new THREE.InstancedBufferAttribute(rotationC, 4),
  };
  const mirrors = new THREE.MeshStandardMaterial({
    color: 0xffffff, metalness: 0.88, roughness: 0.24,
    envMapIntensity: 1.05, emissive: 0x09262a, emissiveIntensity: 0.24,
  });
  const light = new THREE.MeshBasicMaterial({ color: 0xffffff });
  addMorph(mirrors, phase);
  addMorph(light, phase);
  const plateGeometry = new THREE.BoxGeometry(0.071, 0.091, 0.018);
  const edgeGeometry = new THREE.BoxGeometry(0.007, 0.081, 0.022);
  edgeGeometry.translate(0.034, 0, 0.008);
  for (const geometry of [plateGeometry, edgeGeometry]) {
    for (const [key, attribute] of Object.entries(attributes)) geometry.setAttribute(key, attribute);
  }
  const plates = new THREE.InstancedMesh(plateGeometry, mirrors, count);
  const edges = new THREE.InstancedMesh(edgeGeometry, light, count);
  for (let i = 0; i < count; i++) {
    plates.setMatrixAt(i, identity);
    edges.setMatrixAt(i, identity);
    plates.setColorAt(i, colors[i]);
    edges.setColorAt(i, colors[i].clone().multiplyScalar(2.8));
  }
  for (const mesh of [plates, edges]) {
    mesh.frustumCulled = false;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    installation.add(mesh);
  }
  const dust = new Float32Array(420 * 3);
  for (let i = 0; i < 420; i++) {
    const angle = i * 2.399963;
    const radius = 1.5 + ((i * 71) % 191) / 100;
    dust.set([Math.cos(angle) * radius, ((i * 37) % 100) / 17 - 2.8, Math.sin(angle) * radius], i * 3);
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dust, 3));
  const dustMaterial = new THREE.ShaderMaterial({
    uniforms: { uArtPhase: phase }, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uArtPhase;
      void main() {
        vec3 point = position;
        point.x += sin(point.y * 1.6 + uArtPhase * 5.0) * 0.16;
        point.z += cos(point.y * 1.3 + uArtPhase * 4.0) * 0.16;
        vec4 view = modelViewMatrix * vec4(point, 1.0);
        gl_Position = projectionMatrix * view;
        gl_PointSize = clamp(24.0 / max(-view.z, 0.1), 1.0, 3.0);
      }`,
    fragmentShader: `
      void main() {
        vec2 uv = gl_PointCoord * 2.0 - 1.0;
        float glow = exp(-dot(uv, uv) * 4.0) * 0.45;
        gl_FragColor = vec4(0.7, 1.0, 0.91, glow);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  installation.add(new THREE.Points(dustGeometry, dustMaterial));
  installation.position.set(2.2, 3.25, -0.4);
  installation.rotation.y = 0.16;
  installation.userData.setPhase = (value) => { phase.value = value; };
  installation.userData.mirrorCount = count;
  return installation;
}
