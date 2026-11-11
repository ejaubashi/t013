import * as THREE from "three";

export function createGalleryAtmosphere() {
  const atmosphere = new THREE.Group();
  atmosphere.name = "luminous-canopy";
  const frame = new THREE.MeshStandardMaterial({ color: 0x91a69c, metalness: 0.85, roughness: 0.27 });
  const light = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xb5fff0).multiplyScalar(2.6) });
  const segments = 160, bands = 8, positions = [], uv = [], indices = [];
  const canopyPoint = (angle, band) => new THREE.Vector3(
    2.2 + (4.55 + band * 1.85) * Math.cos(angle),
    7.35 + Math.sin(angle * 2) * 0.62 + band * 0.6,
    -0.4 + (3.75 + band * 1.5) * Math.sin(angle),
  );
  for (let i = 0; i <= segments; i++) {
    for (let j = 0; j <= bands; j++) {
      canopyPoint((i / segments) * Math.PI * 2, j / bands).toArray(positions, positions.length);
      uv.push(i / segments, j / bands);
      if (i < segments && j < bands) {
        const a = i * (bands + 1) + j, b = a + bands + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const canopyGeometry = new THREE.BufferGeometry();
  canopyGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  canopyGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  canopyGeometry.setIndex(indices); canopyGeometry.computeVertexNormals();
  const porcelain = new THREE.MeshStandardMaterial({ color: 0xd9e3df, roughness: 0.37, metalness: 0.24, side: THREE.DoubleSide });
  atmosphere.add(new THREE.Mesh(canopyGeometry, porcelain));
  for (const [band, radius, material] of [[0, 0.024, light], [1, 0.045, frame]]) {
    const points = Array.from({ length: 160 }, (_, i) => canopyPoint((i / 160) * Math.PI * 2, band));
    atmosphere.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 192, radius, 6, true), material));
  }
  // A transparent light volume with soft view-dependent edges. This is an
  // authored shaft effect, not an expensive full-scene ray-marching pass.
  const shaftMaterial = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0.024 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 vShaftUv;
      varying vec3 vShaftNormal;
      varying vec3 vShaftView;
      void main() {
        vShaftUv = uv;
        vShaftNormal = normalize(normalMatrix * normal);
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        vShaftView = -view.xyz;
        gl_Position = projectionMatrix * view;
      }`,
    fragmentShader: `
      uniform float uOpacity;
      varying vec2 vShaftUv;
      varying vec3 vShaftNormal;
      varying vec3 vShaftView;
      void main() {
        float edge = pow(abs(dot(normalize(vShaftNormal), normalize(vShaftView))), 1.5);
        float endFade = smoothstep(0.0, 0.18, vShaftUv.y) * (1.0 - smoothstep(0.8, 1.0, vShaftUv.y));
        float rays = 0.78 + 0.22 * sin(vShaftUv.x * 160.0 + vShaftUv.y * 4.0);
        gl_FragColor = vec4(0.7, 1.0, 0.91, edge * endFade * rays * uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 3.6, 7.3, 48, 1, true), shaftMaterial);
  shaft.position.set(2.2, 3.7, -0.4);
  shaft.renderOrder = 1;
  atmosphere.add(shaft);
  atmosphere.userData.setLighting = (level) => {
    shaftMaterial.uniforms.uOpacity.value = THREE.MathUtils.lerp(0.024, 0.065, level);
  };
  return atmosphere;
}
