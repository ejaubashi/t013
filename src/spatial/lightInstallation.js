import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Individually modeled bronze filaments form an uneven, open toroidal shell.
export function createLightInstallation() {
  const installation = new THREE.Group();
  installation.name = "the-continuum";
  const filaments = [];
  for (let i = 0; i < 176; i++) {
    const u = (i / 176) * Math.PI * 2;
    const major = 1.85 + 0.16 * Math.sin(u * 3);
    const minor = 0.43 + 0.1 * Math.sin(u * 2 + 0.8);
    const points = [];
    for (let j = 0; j < 48; j++) {
      const v = (j / 48) * Math.PI * 2, wave = minor * Math.cos(v);
      points.push(new THREE.Vector3(
        (major + wave) * Math.cos(u),
        (major + wave) * Math.sin(u) * 1.12,
        minor * Math.sin(v) + 0.24 * Math.sin(2 * u),
      ));
    }
    filaments.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 40, 0.018, 5, true));
  }
  const geometry = mergeGeometries(filaments);
  filaments.forEach((part) => part.dispose());
  const bronze = new THREE.MeshPhysicalMaterial({
    color: 0xc99d52, metalness: 0.96, roughness: 0.24,
    clearcoat: 0.35, clearcoatRoughness: 0.3, envMapIntensity: 0.85,
  });
  installation.add(new THREE.Mesh(geometry, bronze));
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffce78).multiplyScalar(3.2) });
  const path = [];
  for (let i = 0; i < 144; i++) {
    const u = (i / 144) * Math.PI * 2, radius = 1.85 + 0.16 * Math.sin(3 * u);
    path.push(new THREE.Vector3(radius * Math.cos(u), radius * Math.sin(u) * 1.12, 0.24 * Math.sin(u * 2)));
  }
  installation.add(new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path, true), 144, 0.022, 6, true), glow,
  ));
  installation.position.set(2.2, 3.05, -0.1);
  installation.rotation.set(0.1, 0.3, -0.18);
  return installation;
}
