import * as THREE from "three";
import { rooms } from "./rooms";
import { viewpoints } from "./viewpoints";

export class PortalPreviews {
  constructor({ renderer, scene, room, balanced, onDirty }) {
    Object.assign(this, { renderer, scene, room, balanced, onDirty });
    this.records = new Map();
    this.frustum = new THREE.Frustum();
    this.projection = new THREE.Matrix4();
    this.lastUpdate = -Infinity;
    this.lastKey = "";
    this.count = 0;
    this.previewCamera = new THREE.PerspectiveCamera(68, 2.65 / 5.4, 0.05, 100);
    // Spark keeps one main-camera sort. Small portal views use the native
    // archive image planes also used by the existing reflection camera.
    this.previewCamera.layers.enable(2);
    this.timer = null;
  }

  viewFor(to, sourceCamera, portal) {
    const view = viewpoints.find((item) => item.id === rooms.find((item) => item.id === to).entry);
    const dx = portal ? sourceCamera.position.x - portal.position[0] : 0;
    const dy = sourceCamera.position.y - 2.7;
    return {
      position: [view.position[0] + THREE.MathUtils.clamp(dx, -12, 12) * 0.085,
        view.position[1] + THREE.MathUtils.clamp(dy, -3, 5) * 0.06,
        view.position[2] + 3.3],
      target: [...view.target], fov: 68,
    };
  }

  getView(from, to, sourceCamera) {
    const record = this.records.get(`${from}:${to}`);
    if (record?.view) return { position: [...record.view.position], target: [...record.view.target], fov: record.view.fov };
    return this.viewFor(to, sourceCamera, rooms.find((item) => item.id === from).portals.find((item) => item.to === to));
  }

  corners(from, to, camera, aspect, preferDoor = true) {
    if (preferDoor) {
      const portal = rooms.find((item) => item.id === from).portals.find((item) => item.to === to);
      if (portal && camera.position.z > portal.position[2] + 0.2) {
        const [x, y, z] = portal.position;
        const corners = [[-1.325, -2.7], [1.325, -2.7], [1.325, 2.7], [-1.325, 2.7]].map(([dx, dy]) => {
          const p = new THREE.Vector3(x + dx, y + dy, z + 0.02).project(camera);
          if (p.z <= -1 || p.z >= 1) return [NaN, NaN];
          return [(p.x + 1) / 2, (p.y + 1) / 2];
        });
        const area = Math.abs(corners.reduce((sum, point, i) => {
          const next = corners[(i + 1) % 4]; return sum + point[0] * next[1] - next[0] * point[1];
        }, 0)) / 2;
        if (area > 0.001 && corners.every(([u, v]) => Number.isFinite(u) && Number.isFinite(v) && u > -0.1 && u < 1.1 && v > -0.1 && v < 1.1)) return corners;
      }
    }
    const height = 0.44, width = height * 0.54 / aspect;
    return [[0.5 - width / 2, 0.5 - height / 2], [0.5 + width / 2, 0.5 - height / 2], [0.5 + width / 2, 0.5 + height / 2], [0.5 - width / 2, 0.5 + height / 2]];
  }

  renderRecord(record, view) {
    const { renderer, room, scene } = this;
    const visibility = Object.values(room.userData.roomGroups).map((group) => [group, group.visible]);
    const hidden = [];
    const oldTarget = renderer.getRenderTarget(), oldXr = renderer.xr.enabled;
    const shadowAuto = renderer.shadowMap.autoUpdate, shadowNeeds = renderer.shadowMap.needsUpdate;
    try {
      for (const [id, group] of Object.entries(room.userData.roomGroups)) group.visible = id === record.to;
      const destination = room.userData.roomGroups[record.to];
      destination.traverse((object) => {
        if (object.isReflector) { hidden.push([object, object.visible]); object.visible = false; }
      });
      for (const target of room.userData.portals[record.to]) {
        const surface = target.userData.surface;
        hidden.push([surface, surface.visible]); surface.visible = false;
      }
      this.previewCamera.position.set(...view.position);
      this.previewCamera.fov = view.fov;
      this.previewCamera.lookAt(...view.target);
      this.previewCamera.updateProjectionMatrix();
      renderer.xr.enabled = false;
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = false;
      renderer.setRenderTarget(record.target);
      renderer.clear();
      renderer.render(scene, this.previewCamera);
      record.view = view;
      record.surface.material.map = record.target.texture;
      record.surface.material.needsUpdate = !record.ready;
      record.ready = true;
    } finally {
      hidden.forEach(([object, visible]) => { object.visible = visible; });
      visibility.forEach(([object, visible]) => { object.visible = visible; });
      renderer.xr.enabled = oldXr;
      renderer.shadowMap.autoUpdate = shadowAuto;
      renderer.shadowMap.needsUpdate = shadowNeeds;
      renderer.setRenderTarget(oldTarget);
    }
  }

  update(camera, activeRoom, visualKey, time, force = false) {
    const key = `${activeRoom}:${camera.aspect.toFixed(3)}:${camera.fov.toFixed(1)}:${camera.position.toArray().map((n) => n.toFixed(3))}:${camera.quaternion.toArray().map((n) => n.toFixed(3))}:${visualKey}`;
    if (!force && key === this.lastKey) return;
    const interval = this.balanced ? 240 : 90;
    if (!force && time - this.lastUpdate < interval) {
      if (!this.timer) this.timer = setTimeout(() => { this.timer = null; this.onDirty(); }, interval);
      return;
    }
    this.lastUpdate = time; this.lastKey = key;
    this.room.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    this.projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projection);
    let count = 0;
    const portals = rooms.find((item) => item.id === activeRoom).portals;
    for (let i = 0; i < portals.length; i++) {
      const portal = portals[i], hit = this.room.userData.portals[activeRoom][i], surface = hit.userData.surface;
      if (camera.position.z <= portal.position[2] || !this.frustum.intersectsObject(surface)) continue;
      const id = `${activeRoom}:${portal.to}`;
      let record = this.records.get(id);
      if (!record) {
        const width = this.balanced ? 160 : 256;
        record = { to: portal.to, surface, fallback: surface.material.map,
          target: new THREE.WebGLRenderTarget(width, width * 2, { type: THREE.HalfFloatType, depthBuffer: true, samples: 0 }) };
        this.records.set(id, record);
      }
      this.renderRecord(record, this.viewFor(portal.to, camera, portal));
      count++;
    }
    this.count = count;
    if (count) this.room.userData.invalidateReflections();
  }

  dispose() {
    clearTimeout(this.timer);
    this.records.forEach((record) => { record.surface.material.map = record.fallback; record.target.dispose(); });
    this.records.clear();
  }
}
