import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { WalkController, eyeHeight, findWalkPath, isWalkable, walkPosition, walkSegment } from "../src/spatial/walkNavigation.js";
import { batchArchitecture } from "../src/spatial/batchArchitecture.js";

const rig = (room = "pavilion") => {
  const camera = new THREE.PerspectiveCamera(), target = new THREE.Vector3(-8, eyeHeight, -4);
  camera.position.set(-8, eyeHeight, 8); camera.lookAt(target);
  return { camera, controller: new WalkController(camera, target, () => room) };
};

test("routes around actual pools, installations, benches, and archive panels in all four rooms", () => {
  for (const room of ["pavilion", "orbit", "garden", "prism"]) {
    const start = new THREE.Vector3(-8, eyeHeight, 7), goal = new THREE.Vector3(8, eyeHeight, -8.8);
    assert.equal(walkSegment(start, goal, room), false);
    const path = findWalkPath(start, goal, room); assert(path.length > 1);
    let previous = start;
    for (const waypoint of path) { assert(walkSegment(previous, waypoint, room)); previous = waypoint; }
    const { camera, controller } = rig(room); controller.go(goal);
    let frames = 0;
    while (controller.moving && frames++ < 2000) {
      controller.update(1 / 60); assert(isWalkable(camera.position, room)); assert.equal(camera.position.y, eyeHeight);
    }
    assert(frames < 2000); assert(camera.position.distanceTo(goal) < 0.15);
    assert.equal(findWalkPath(start, new THREE.Vector3(0, 0, -0.8), room).length, 0);
  }
});

test("keeps movement independent of frame rate, then eases to a stable stop", () => {
  const positions = [];
  for (const fps of [30, 60, 120]) {
    const { camera, controller } = rig();
    for (let frame = 0; frame < fps; frame++) controller.update(1 / fps, 0, 1);
    positions.push(camera.position.clone());
    assert(controller.velocity.length() > 2);
    for (let frame = 0; frame < fps; frame++) controller.update(1 / fps);
    assert.equal(controller.moving, false);
    const stopped = camera.position.clone(); controller.update(1 / fps); assert(camera.position.equals(stopped));
  }
  assert(positions[0].distanceTo(positions[2]) < 0.00001);
});

test("turns the head without orbiting, and clamps walking to the floor and room boundaries", () => {
  const { camera, controller } = rig(); const start = camera.position.clone(), rotation = camera.quaternion.clone();
  controller.look(180, -800);
  for (let frame = 0; frame < 90; frame++) controller.update(1 / 60);
  assert(camera.position.equals(start)); assert(!camera.quaternion.equals(rotation)); assert(controller.pitch <= 1.05);
  const clamped = walkPosition(new THREE.Vector3(-100, 30, 100), "pavilion"); assert(isWalkable(clamped, "pavilion")); assert.equal(clamped.y, eyeHeight);
  for (let frame = 0; frame < 1000; frame++) { controller.update(0.045, 1, 1); assert(isWalkable(camera.position, "pavilion")); }
  controller.halt(); assert.equal(controller.moving, false);
});

test("batches architecture without changing world bounds or merging glass and instances", () => {
  const root = new THREE.Group(), nested = new THREE.Group(), material = new THREE.MeshStandardMaterial();
  root.position.set(2, 3, -1); nested.rotation.y = 0.4; root.add(nested);
  for (const x of [-3, 4]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 2), material); mesh.position.set(x, 2, -4); nested.add(mesh);
  }
  const before = new THREE.Box3().setFromObject(root), result = batchArchitecture(root), after = new THREE.Box3().setFromObject(root);
  assert.deepEqual(result, { before: 2, after: 1 }); assert(before.min.distanceTo(after.min) < 0.00001); assert(before.max.distanceTo(after.max) < 0.00001);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.2 }));
  const instance = new THREE.InstancedMesh(new THREE.BoxGeometry(), material, 2); root.add(glass, instance); batchArchitecture(root);
  assert(glass.parent === root); assert(instance.parent === root);
});
