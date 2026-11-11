import * as THREE from "three";

export function createGalleryAtmosphere() {
  const atmosphere = new THREE.Group();
  atmosphere.name = "luminous-canopy";
  const frame = new THREE.MeshStandardMaterial({ color: 0x91a69c, metalness: 0.85, roughness: 0.27 });
  const light = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xb5fff0).multiplyScalar(2.6) });
  for (const [radius, thickness, y, material] of [
    [4.72, 0.07, 7.5, frame],
    [4.65, 0.024, 7.43, light],
  ]) {
    const halo = new THREE.Mesh(new THREE.TorusGeometry(radius, thickness, 8, 192), material);
    halo.rotation.x = Math.PI / 2;
    halo.scale.x = 1.18;
    halo.position.set(2.2, y, -0.4);
    atmosphere.add(halo);
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
