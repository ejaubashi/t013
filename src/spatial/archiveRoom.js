import * as THREE from "three";
import { SplatMesh } from "@sparkjsdev/spark";
import { createGalleryArchitecture } from "./galleryArchitecture";
import { exhibits } from "./exhibits";
import { addRoomPortals, createOrbitHall, createSkyGarden } from "./galleryRooms";
import { createPrismChamber } from "./prismChamber";
import { addWallArt } from "./wallArt";
import { batchArchitecture } from "./batchArchitecture";

const asset = (name) => `${import.meta.env.BASE_URL}assets/${name}`;

function imagePixels(name, width, height) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0, width, height);
      resolve(context.getImageData(0, 0, width, height).data);
    };
    image.onerror = () =>
      reject(new Error("The gallery photographs could not be loaded."));
    image.src = asset(name);
  });
}

// An imagined gallery: sharp architecture with genuine Gaussian-splat exhibits.
export function createArchiveRoom({ onProgress, reflectionSize, reflectionSamples, balancedLighting } = {}) {
  const room = new THREE.Group();
  room.name = "contemporary-memory-gallery";
  const pavilion = new THREE.Group();
  room.add(pavilion);
  const architecture = createGalleryArchitecture({ reflectionSize, reflectionSamples, balancedLighting });
  pavilion.add(architecture);
  const orbit = createOrbitHall({ reflectionSize, reflectionSamples });
  const garden = createSkyGarden();
  const prism = createPrismChamber();
  room.add(orbit, garden, prism);
  orbit.visible = false;
  garden.visible = false;
  prism.visible = false;
  const roomGroups = { pavilion, orbit, garden, prism };
  const wallArt = Object.fromEntries(Object.entries(roomGroups).map(([id, group]) => [id, addWallArt(group, id)]));
  const pavilionPortals = addRoomPortals(pavilion, "pavilion");
  room.userData.roomGroups = roomGroups;
  room.userData.portals = {
    pavilion: pavilionPortals,
    orbit: orbit.userData.portalTargets,
    garden: garden.userData.portalTargets,
    prism: prism.userData.portalTargets,
  };
  room.userData.invalidateReflections = () => {
    pavilion.userData.reflectionVersion = (pavilion.userData.reflectionVersion || 0) + 1;
    orbit.userData.previewVersion = (orbit.userData.previewVersion || 0) + 1;
  };
  room.userData.setLighting = (night) => {
    architecture.userData.setLighting(night);
    orbit.userData.setLighting(night);
    garden.userData.setLighting(night);
    prism.userData.setLighting(night);
  };
  room.userData.setSpectrum = (value) => prism.userData.setSpectrum(value);
  room.userData.crystalCount = prism.userData.crystalCount;
  room.userData.setArtPhase = (value) => architecture.userData.setArtPhase(value);
  room.userData.mirrorCount = architecture.userData.mirrorCount;
  const reflections = new THREE.Group();
  reflections.name = "reflection-artworks";
  pavilion.add(reflections);
  const hitMaterial = new THREE.MeshBasicMaterial({ side: THREE.FrontSide });
  const exhibitTargets = exhibits.map((exhibit) => {
    const target = new THREE.Mesh(new THREE.PlaneGeometry(exhibit.width, exhibit.height), hitMaterial);
    target.position.set(exhibit.x, 2.75, -7.445);
    target.layers.set(3);
    target.userData.exhibit = exhibit.id;
    pavilion.add(target);
    return target;
  });
  room.userData.setRoom = (id) => {
    if (!roomGroups[id]) return;
    for (const [key, group] of Object.entries(roomGroups)) group.visible = key === id;
    room.userData.activeRoom = id;
    room.userData.hitTargets = [...(id === "pavilion" ? [...exhibitTargets, ...pavilionPortals] : roomGroups[id].userData.portalTargets), ...wallArt[id].targets];
    // The pavilion's cached water reflection also depends on which scene is visible.
    pavilion.userData.reflectionVersion = (pavilion.userData.reflectionVersion || 0) + 1;
  };
  room.userData.setRoom("pavilion");
  room.userData.petalCount = garden.userData.petalCount;
  const artwork = new SplatMesh({
    lod: false,
    constructSplats: async (splats) => {
      const works = exhibits;
      const images = await Promise.all(
        works.map((work) => imagePixels(work.name, work.columns, work.rows)),
      );
      onProgress?.(55);
      const center = new THREE.Vector3(),
        scales = new THREE.Vector3(),
        quaternion = new THREE.Quaternion(),
        color = new THREE.Color();
      for (let n = 0; n < works.length; n++) {
        const work = works[n],
          pixels = images[n];
        const reflectionCanvas = document.createElement("canvas");
        reflectionCanvas.width = work.columns;
        reflectionCanvas.height = work.rows;
        reflectionCanvas
          .getContext("2d")
          .putImageData(new ImageData(pixels, work.columns, work.rows), 0, 0);
        const reflectionTexture = new THREE.CanvasTexture(reflectionCanvas);
        reflectionTexture.colorSpace = THREE.SRGBColorSpace;
        const reflectedArtwork = new THREE.Mesh(
          new THREE.PlaneGeometry(work.width, work.height),
          new THREE.MeshBasicMaterial({
            map: reflectionTexture,
            toneMapped: false,
          }),
        );
        reflectedArtwork.position.set(work.x, 2.75, -7.455);
        reflectedArtwork.layers.set(2);
        reflections.add(reflectedArtwork);
        for (let row = 0; row < work.rows; row++) {
          for (let col = 0; col < work.columns; col++) {
            const i = (row * work.columns + col) * 4;
            center.set(
              work.x + (col / (work.columns - 1) - 0.5) * work.width,
              2.75 + (0.5 - row / (work.rows - 1)) * work.height,
              -7.455,
            );
            scales.set(
              (work.width / work.columns) * 0.6,
              (work.height / work.rows) * 0.6,
              0.0018,
            );
            color.setRGB(
              pixels[i] / 255,
              pixels[i + 1] / 255,
              pixels[i + 2] / 255,
            );
            splats.pushSplat(center, scales, quaternion, 1, color);
          }
        }
      }
      onProgress?.(95);
    },
  });
  pavilion.add(artwork);
  room.userData.staticBatches = Object.fromEntries(Object.entries(roomGroups).map(([id, group]) => [id, batchArchitecture(group)]));
  room.initialized = Promise.all([artwork.initialized, ...Object.values(wallArt).map((art) => art.initialized)]).then(() => {
    room.splats = artwork.splats;
    room.userData.assetVersion = 1;
    pavilion.userData.reflectionVersion = (pavilion.userData.reflectionVersion || 0) + 1;
    return room;
  });
  let disposed = false;
  room.dispose = () => {
    if (disposed) return;
    disposed = true;
    artwork.dispose();
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set();
    room.traverse((object) => {
      if (object.isReflector) object.dispose();
      if (object.geometry) geometries.add(object.geometry);
      for (const material of object.material
        ? Array.isArray(object.material)
          ? object.material
          : [object.material]
        : []) {
        materials.add(material);
        for (const value of Object.values(material))
          if (value?.isTexture) textures.add(value);
      }
      if (object.isLight) object.dispose?.();
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    if (!artwork.isInitialized)
      artwork.initialized.then(() => artwork.dispose()).catch(() => {});
  };
  return room;
}
