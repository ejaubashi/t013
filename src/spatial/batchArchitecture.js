import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Decorative boxes share materials but used to require one draw call each.
// Bake only static opaque boxes. Interactive planes, glass, animated crystals,
// splats, and the instanced light installation retain their own scene objects.
export function batchArchitecture(root) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert(), batches = new Map(), originals = new Set();
  let before = 0, after = 0;
  root.traverse((object) => {
    if (!object.isMesh || object.isInstancedMesh || object.children.length || object.geometry.type !== "BoxGeometry" ||
      Array.isArray(object.material) || object.material.transparent || object.userData.dynamic || object.layers.mask !== 1) return;
    const key = `${object.material.uuid}:${object.castShadow}:${object.receiveShadow}`;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(object); before++;
  });
  for (const meshes of batches.values()) {
    if (meshes.length < 2) { after++; continue; }
    const geometries = meshes.map((mesh) => mesh.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld)));
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach((item) => item.dispose());
    if (!geometry) { after += meshes.length; continue; }
    const reference = meshes[0], batch = new THREE.Mesh(geometry, reference.material);
    batch.name = "static-gallery-architecture"; batch.castShadow = reference.castShadow; batch.receiveShadow = reference.receiveShadow;
    root.add(batch); after++;
    for (const mesh of meshes) { originals.add(mesh.geometry); mesh.removeFromParent(); }
  }
  const retained = new Set(); root.traverse((object) => { if (object.geometry) retained.add(object.geometry); });
  originals.forEach((geometry) => { if (!retained.has(geometry)) geometry.dispose(); });
  return { before, after };
}
