import * as THREE from "three/webgpu";
import { attribute, cross, dFdx, dFdy, float, frontFacing, mix, positionView, texture, uniform, uv, vec2, vec3 } from "three/tsl";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const PI = Math.PI;
export const studies = [
  { id: "continuum", number: "01", title: "Continuum", subtitle: "The room becomes the sculpture.", description: "One continuous surface gathers into an ivory Möbius ribbon, turns in space, and opens as the next room.", recommended: true },
  { id: "lamina", number: "02", title: "Lamina", subtitle: "A passage made of light and paper.", description: "Forty-eight curved planes move as a single field. Their changing depth and orientation reveal the room between them." },
];
const base = import.meta.env.BASE_URL;

function geometry(kind) {
  if (kind === "continuum") {
    const plane = new THREE.PlaneGeometry(2, 2, 128, 64);
    plane.setAttribute("aCenter", new THREE.Float32BufferAttribute(new Float32Array(plane.attributes.position.count).fill(.5), 1));
    return plane;
  }
  const parts = [];
  for (let i = 0; i < 48; i++) {
    const plane = new THREE.PlaneGeometry(2 / 48, 2, 2, 48), uvs = plane.attributes.uv;
    for (let v = 0; v < uvs.count; v++) uvs.setX(v, (i + uvs.getX(v)) / 48);
    plane.setAttribute("aCenter", new THREE.Float32BufferAttribute(new Float32Array(plane.attributes.position.count).fill((i + .5) / 48), 1));
    parts.push(plane);
  }
  const combined = mergeGeometries(parts); parts.forEach(part => part.dispose()); return combined;
}

export async function createStudyRenderer(host, onReady) {
  const renderer = new THREE.WebGPURenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  await renderer.init();
  const canvas = renderer.domElement; canvas.setAttribute("aria-label", "Live three-dimensional room transition study"); canvas.setAttribute("role", "img"); host.append(canvas);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 1, .03, 40);
  const distance = 1 / Math.tan(THREE.MathUtils.degToRad(25)); camera.position.z = distance; scene.add(camera);
  scene.background = new THREE.Color("#eeebe3");
  const loader = new THREE.TextureLoader();
  const images = Object.fromEntries(await Promise.all(["pavilion", "orbit", "garden", "prism"].map(async id => {
    const image = await loader.loadAsync(`${base}motion/${id}.jpg`); image.colorSpace = THREE.SRGBColorSpace; image.anisotropy = 4; return [id, image];
  })));
  const progress = uniform(0), aspect = uniform(1), cover = uniform(new THREE.Vector2(1, 1));
  const paper = vec3(.89, .875, .84), materials = [], meshes = [], textureNodes = [];
  const e = progress.mul(progress).mul(progress).mul(progress.mul(progress.mul(6).sub(15)).add(10));
  const pulse = e.mul(PI).sin().clamp(0, 1);
  const coverUv = coordinate => coordinate.sub(.5).mul(cover).add(.5);
  for (const study of studies) {
    const coordinate = uv(), center = attribute("aCenter", "float"), x = coordinate.x.sub(.5).mul(2).mul(aspect), y = coordinate.y.sub(.5).mul(2);
    let position, arrivalUv;
    if (study.id === "continuum") {
      // A rectangular image surface changes continuously into a Möbius band.
      // The return to a plane is exact; the back face carries the arrival.
      const angle = coordinate.x.mul(2 * PI), width = coordinate.y.sub(.5).mul(.88);
      const radius = width.mul(angle.mul(.5).cos()).add(.88);
      const ribbon = vec3(radius.mul(angle.cos()), radius.mul(angle.sin()), width.mul(angle.mul(.5).sin()));
      const surface = mix(vec3(x, y, 0), ribbon, pulse.pow(2));
      const turn = e.mul(PI).sub(pulse.mul(1.18)), roll = pulse.mul(-.28);
      const rx = surface.x.mul(turn.cos()).add(surface.z.mul(turn.sin()));
      position = vec3(rx.mul(roll.cos()).sub(surface.y.mul(roll.sin())), rx.mul(roll.sin()).add(surface.y.mul(roll.cos())), surface.z.mul(turn.cos()).sub(surface.x.mul(turn.sin())));
      arrivalUv = vec2(coordinate.x.oneMinus(), coordinate.y);
    } else {
      const c = center.sub(.5).mul(2).mul(aspect), localX = x.sub(c);
      const turn = e.mul(PI).add(pulse.mul(center.mul(2 * PI).sin().mul(.65).add(y.mul(.5))));
      const fieldX = c.mul(float(1).sub(pulse.mul(.24))).add(pulse.mul(y.mul(1.6).add(center.mul(5)).sin()).mul(.11));
      const z = localX.mul(turn.sin()).negate().add(pulse.mul(center.mul(2 * PI).sin()).mul(.65));
      position = vec3(fieldX.add(localX.mul(turn.cos())), y.mul(float(1).sub(pulse.mul(.16))).add(pulse.mul(center.mul(PI).sin()).mul(.08)), z);
      arrivalUv = vec2(center.mul(2).sub(coordinate.x), coordinate.y);
    }
    const outgoing = texture(images.pavilion, coverUv(coordinate)), incoming = texture(images.orbit, coverUv(arrivalUv));
    textureNodes.push([outgoing, incoming]);
    const normal = cross(dFdx(positionView), dFdy(positionView)).normalize();
    const light = normal.dot(vec3(.24, .42, .87)).abs().mul(.4).add(.6);
    const photograph = frontFacing.select(outgoing.rgb, incoming.rgb);
    const ivory = mix(photograph, paper, pulse.pow(3).mul(.97));
    const material = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide });
    material.positionNode = position;
    material.colorNode = ivory.mul(mix(float(1), light, pulse)).add(normal.z.abs().pow(12).mul(pulse).mul(.06));
    material.toneMapped = false;
    const mesh = new THREE.Mesh(geometry(study.id), material); mesh.frustumCulled = false; scene.add(mesh); materials.push(material); meshes.push(mesh);
  }
  const backgroundTexture = texture(images.orbit, coverUv(uv()));
  const backMaterial = new THREE.MeshBasicNodeMaterial({ depthWrite: false, depthTest: false }); backMaterial.colorNode = backgroundTexture.rgb;
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), backMaterial); backdrop.position.z = -10; backdrop.renderOrder = -1; backdrop.frustumCulled = false; camera.add(backdrop);
  let current = "continuum", disposed = false;
  const resize = (width = host.clientWidth, height = host.clientHeight) => {
    if (!width || !height || disposed) return;
    camera.aspect = width / height; camera.updateProjectionMatrix(); aspect.value = camera.aspect;
    cover.value.set(Math.min(1, camera.aspect / 1.6), Math.min(1, 1.6 / camera.aspect));
    const h = 20 * Math.tan(THREE.MathUtils.degToRad(25)); backdrop.scale.set(h * camera.aspect, h, 1);
    renderer.setSize(width, height, false);
  };
  const draw = value => {
    if (disposed) return;
    progress.value = Math.max(0, Math.min(1, value));
    camera.position.z = distance + Math.sin(PI * (progress.value ** 3 * (progress.value * (progress.value * 6 - 15) + 10))) * .7;
    meshes.forEach((mesh, i) => { mesh.visible = studies[i].id === current; });
    renderer.render(scene, camera);
    canvas.dataset.study = current; canvas.dataset.progress = progress.value.toFixed(4);
    canvas.dataset.backend = renderer.backend.isWebGPUBackend ? "webgpu" : "webgl2";
  };
  resize();
  await renderer.compileAsync(scene, camera); draw(0); onReady?.();
  const observer = new ResizeObserver(() => { resize(); draw(progress.value); }); observer.observe(host);
  return {
    canvas, draw,
    setStudy(id) { current = id; draw(0); },
    setRooms(from, to) { textureNodes.forEach(([a, b]) => { a.value = images[from]; b.value = images[to]; }); backgroundTexture.value = images[to]; draw(0); },
    capture(value) { const before = progress.value; draw(value); const data = canvas.toDataURL("image/jpeg", .87); draw(before); return data; },
    dispose() { disposed = true; observer.disconnect(); meshes.forEach(mesh => mesh.geometry.dispose()); materials.forEach(material => material.dispose()); backdrop.geometry.dispose(); backMaterial.dispose(); Object.values(images).forEach(image => image.dispose()); renderer.dispose(); canvas.remove(); },
  };
}
