import * as THREE from "three";
import { rooms } from "./rooms.js";

export const eyeHeight = 1.72;
const bounds = { left: -8.95, right: 8.95, back: -9.1, front: 12.2 };
const clamp = THREE.MathUtils.clamp;

export function walkView(room = "pavilion", entrance = false) {
  return { id: rooms.find((item) => item.id === room).entry, room, walk: true,
    position: entrance ? [7.3, eyeHeight, 11.8] : [7.1, eyeHeight, 7.4],
    target: room === "pavilion" ? [-1.6, 3.1, -0.8] : [0, 3.3, -0.8] };
}

// Ground footprints include visitor clearance. The display scale is authored,
// so a small navigation surface is more predictable than colliding with every
// decorative fin, light ray, and splat in the rendered scene.
const obstacles = {
  pavilion: { circles: [[2.2, 0, 4.75]], rectangles: [[-7.1, -2.6, -0.25, 1.45], [-6.7, 6.7, -8.35, -6.9]] },
  orbit: { circles: [[0, -0.8, 3.8]], rectangles: [] },
  garden: { circles: [[0, -0.8, 4.95]], rectangles: [[-7.55, -5.65, -3.55, 3.55], [5.65, 7.55, -3.55, 3.55]] },
  prism: { circles: [[0, -0.8, 5.05]], rectangles: [] },
};

export function isWalkable(point, room) {
  if (point.x < bounds.left || point.x > bounds.right || point.z < bounds.back || point.z > bounds.front) return false;
  const shape = obstacles[room];
  if (shape.circles.some(([x, z, r]) => Math.hypot(point.x - x, point.z - z) < r)) return false;
  return !shape.rectangles.some(([left, right, back, front]) => point.x > left && point.x < right && point.z > back && point.z < front);
}

export function walkPosition(point, room) {
  const result = new THREE.Vector3(clamp(point.x, bounds.left, bounds.right), eyeHeight, clamp(point.z, bounds.back, bounds.front));
  for (let pass = 0; pass < 5; pass++) {
    for (const [x, z, radius] of obstacles[room].circles) {
      const dx = result.x - x, dz = result.z - z, distance = Math.hypot(dx, dz);
      if (distance < radius + 0.002) {
        result.x = x + (distance > 0.0001 ? dx / distance : -1) * (radius + 0.003);
        result.z = z + (distance > 0.0001 ? dz / distance : 0) * (radius + 0.003);
      }
    }
    for (const [left, right, back, front] of obstacles[room].rectangles) {
      if (result.x <= left || result.x >= right || result.z <= back || result.z >= front) continue;
      const distances = [result.x - left, right - result.x, result.z - back, front - result.z];
      const side = distances.indexOf(Math.min(...distances));
      if (side === 0) result.x = left - 0.003;
      if (side === 1) result.x = right + 0.003;
      if (side === 2) result.z = back - 0.003;
      if (side === 3) result.z = front + 0.003;
    }
    result.x = clamp(result.x, bounds.left, bounds.right); result.z = clamp(result.z, bounds.back, bounds.front);
  }
  return result;
}

export function walkSegment(from, to, room) {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.15));
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    if (!isWalkable({ x: THREE.MathUtils.lerp(from.x, to.x, t), z: THREE.MathUtils.lerp(from.z, to.z, t) }, room)) return false;
  }
  return true;
}

// Eight-neighbour A*, followed by visibility pruning. Paths go around the
// pools and benches, rather than easing the visitor through their geometry.
export function findWalkPath(from, to, room) {
  if (!isWalkable(to, room)) return [];
  const goal = new THREE.Vector3(to.x, eyeHeight, to.z);
  if (walkSegment(from, goal, room)) return [goal];
  const spacing = 0.62, nodes = [], grid = new Map();
  for (let ix = 0; ix <= 28; ix++) for (let iz = 0; iz <= 34; iz++) {
    const point = new THREE.Vector3(-8.68 + ix * spacing, eyeHeight, -8.9 + iz * spacing);
    if (!isWalkable(point, room)) continue;
    const node = { point, ix, iz, cost: Infinity, estimate: Infinity, parent: null, visited: false };
    nodes.push(node); grid.set(`${ix}:${iz}`, node);
  }
  const nearest = (point) => nodes.slice().sort((a, b) => a.point.distanceToSquared(point) - b.point.distanceToSquared(point))
    .find((node) => walkSegment(point, node.point, room));
  const start = nearest(from), end = nearest(goal);
  if (!start || !end) return [];
  start.cost = 0; start.estimate = start.point.distanceTo(end.point);
  const open = [start];
  while (open.length) {
    open.sort((a, b) => a.estimate - b.estimate);
    const node = open.shift();
    if (node.visited) continue;
    if (node === end) {
      const path = [goal]; let cursor = node;
      while (cursor) { path.unshift(cursor.point); cursor = cursor.parent; }
      const compact = []; let current = from, index = 0;
      while (index < path.length) {
        let furthest = index;
        for (let next = index; next < path.length; next++) if (walkSegment(current, path[next], room)) furthest = next;
        compact.push(path[furthest].clone()); current = path[furthest]; index = furthest + 1;
      }
      return compact;
    }
    node.visited = true;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz) continue;
      const next = grid.get(`${node.ix + dx}:${node.iz + dz}`);
      if (!next || next.visited || !walkSegment(node.point, next.point, room)) continue;
      const cost = node.cost + node.point.distanceTo(next.point);
      if (cost >= next.cost) continue;
      next.cost = cost; next.estimate = cost + next.point.distanceTo(end.point); next.parent = node; open.push(next);
    }
  }
  return [];
}

export class WalkController {
  constructor(camera, target, getRoom) {
    this.camera = camera; this.target = target; this.getRoom = getRoom;
    this.velocity = new THREE.Vector3(); this.euler = new THREE.Euler(0, 0, 0, "YXZ");
    this.route = []; this.wheelInput = 0; this.sync();
  }
  sync() {
    this.euler.setFromQuaternion(this.camera.quaternion, "YXZ");
    this.yaw = this.aimYaw = this.euler.y; this.pitch = this.aimPitch = this.euler.x;
    this.halt();
  }
  halt() { this.velocity.set(0, 0, 0); this.wheelInput = 0; this.route = []; this.aimYaw = this.yaw; this.aimPitch = this.pitch; }
  look(dx, dy, touch = false) {
    const sensitivity = touch ? 0.004 : 0.003;
    this.aimYaw -= dx * sensitivity; this.aimPitch = clamp(this.aimPitch - dy * sensitivity, -1.12, 1.05);
  }
  wheel(delta) { this.route = []; this.wheelInput = clamp(this.wheelInput + delta * 0.012, -2, 2); }
  go(point, immediate = false) {
    const route = findWalkPath(this.camera.position, point, this.getRoom());
    if (!route.length) return false;
    this.halt(); this.route = route;
    if (immediate) { this.camera.position.copy(route.at(-1)); this.route = []; this.orient(); }
    return true;
  }
  orient() {
    this.euler.set(this.pitch, this.yaw, 0, "YXZ"); this.camera.quaternion.setFromEuler(this.euler);
    this.target.set(0, 0, -6).applyQuaternion(this.camera.quaternion).add(this.camera.position);
  }
  get moving() {
    return this.velocity.lengthSq() > 0.00002 || this.route.length > 0 || Math.abs(this.wheelInput) > 0.005 ||
      Math.abs(this.aimYaw - this.yaw) > 0.0001 || Math.abs(this.aimPitch - this.pitch) > 0.0001;
  }
  update(dt, x = 0, z = 0, turn = 0, reduced = false) {
    if (x || z || turn) this.route = [];
    this.aimYaw += turn * dt * 1.4;
    const desired = new THREE.Vector3();
    if (this.route.length) {
      const goal = this.route[0], distance = this.camera.position.distanceTo(goal);
      if (distance < 0.1) this.route.shift();
      else {
        desired.subVectors(goal, this.camera.position).normalize().multiplyScalar(Math.min(2.4, distance * 3.2));
        const angle = Math.atan2(-desired.x, -desired.z);
        this.aimYaw += Math.atan2(Math.sin(angle - this.aimYaw), Math.cos(angle - this.aimYaw));
      }
    } else {
      const amount = Math.hypot(x, z), scale = amount > 1 ? 1 / amount : 1;
      desired.set(Math.cos(this.yaw) * x - Math.sin(this.yaw) * (z + this.wheelInput), 0,
        -Math.sin(this.yaw) * x - Math.cos(this.yaw) * (z + this.wheelInput)).multiplyScalar(scale * 2.25);
    }
    desired.clampLength(0, 2.5);
    const before = this.camera.position.clone(), oldYaw = this.yaw, oldPitch = this.pitch;
    const lookRate = this.route.length ? 6 : 24;
    this.yaw = reduced ? this.aimYaw : THREE.MathUtils.damp(this.yaw, this.aimYaw, lookRate, dt);
    this.pitch = reduced ? this.aimPitch : THREE.MathUtils.damp(this.pitch, this.aimPitch, 24, dt);
    if (Math.abs(this.aimYaw - this.yaw) < 0.0001) this.yaw = this.aimYaw;
    if (Math.abs(this.aimPitch - this.pitch) < 0.0001) this.pitch = this.aimPitch;
    const rate = desired.lengthSq() ? 9 : 13, decay = Math.exp(-rate * dt);
    const displacement = reduced ? desired.clone().multiplyScalar(dt) : desired.clone().multiplyScalar(dt)
      .addScaledVector(this.velocity.clone().sub(desired), (1 - decay) / rate);
    this.velocity.sub(desired).multiplyScalar(decay).add(desired);
    if (reduced) this.velocity.copy(desired);
    if (this.velocity.lengthSq() < 0.00002) this.velocity.set(0, 0, 0);
    // Small swept steps prevent a large frame or wheel event crossing a bench.
    const steps = Math.max(1, Math.ceil(displacement.length() / 0.12));
    for (let step = 0; step < steps; step++) this.camera.position.copy(walkPosition(this.camera.position.clone().addScaledVector(displacement, 1 / steps), this.getRoom()));
    this.wheelInput *= Math.exp(-6 * dt);
    if (Math.abs(this.wheelInput) < 0.005) this.wheelInput = 0;
    this.orient();
    return before.distanceToSquared(this.camera.position) > 1e-10 || oldYaw !== this.yaw || oldPitch !== this.pitch;
  }
}
