import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { portalMatrix, RoomTransitionPass, roomTransitions } from "../src/spatial/roomTransitions.js";

import { PortalPreviews } from "../src/spatial/portalPreviews.js";

const project = (matrix, [x, y]) => {
  const p = new THREE.Vector3(x, y, 1).applyMatrix3(matrix);
  return [p.x / p.z, p.y / p.z];
};
const near = (a, b) => a.forEach((v, i) => assert(Math.abs(v - b[i]) < 1e-9));
const square = [[0, 0], [1, 0], [1, 1], [0, 1]];

test("preserves oblique doorway corners and round-trips interior and exterior points", () => {
  for (const corners of [square, [[.12, .2], [.38, .31], [.43, .79], [.14, .88]], [[-.05, .1], [.9, .05], [1.05, .9], [.03, .8]]]) {
    const matrix = portalMatrix(corners), inverse = matrix.clone().invert();
    square.forEach((p, i) => near(project(matrix, p), corners[i]));
    for (const point of [[-.2, .5], [.1, .9], [.5, .5], [1.2, -.1]]) near(project(inverse, project(matrix, point)), point);
  }
});

test("moves every room pair through an invertible aperture with an exact first frame and full final coverage", () => {
  assert.equal(Object.keys(roomTransitions).length, 12);
  const pass = new RoomTransitionPass(), corners = [[.1, .2], [.3, .28], [.35, .85], [.13, .9]];
  pass.hasHistory = true; assert.equal(pass.begin(corners), true);
  const uniforms = pass.material.uniforms;
  for (const p of square) near(project(uniforms.sourceProjection.value, project(uniforms.portalInverse.value, p)), p);
  for (let i = 0; i <= 100; i++) {
    pass.setProgress(i / 100); assert(Math.abs(uniforms.portalInverse.value.determinant()) > .01);
    for (const p of square) assert(project(uniforms.portalInverse.value, p).every(Number.isFinite));
  }
  for (const p of square) assert(project(uniforms.portalInverse.value, p).every(v => v > 0 && v < 1));
  pass.dispose();
});


test("keeps the real doorway projection at walking distance and previews at eye level", () => {
  const camera = new THREE.PerspectiveCamera(64, 16 / 9, .03, 100);
  camera.position.set(-8.4, 1.72, -8.7); camera.lookAt(-8.4, 1.72, -9.76); camera.updateMatrixWorld();
  const corners = PortalPreviews.prototype.corners("pavilion", "orbit", camera, camera.aspect);
  assert(corners.some(([u, v]) => u < 0 || u > 1 || v < 0 || v > 1));
  const inverse = portalMatrix(corners).invert();
  corners.forEach((point, i) => near(project(inverse, point), square[i]));
  const preview = PortalPreviews.prototype.viewFor("orbit", camera);
  assert.equal(preview.position[1], 1.72);
});
