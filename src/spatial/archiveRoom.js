import * as THREE from "three";
import { SplatMesh } from "@sparkjsdev/spark";
import { createGalleryArchitecture } from "./galleryArchitecture";

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
export function createArchiveRoom({ onProgress } = {}) {
  const room = new THREE.Group();
  room.name = "contemporary-memory-gallery";
  room.add(createGalleryArchitecture());
  const artwork = new SplatMesh({
    lod: false,
    constructSplats: async (splats) => {
      const works = [
        {
          name: "benno-family.webp",
          columns: 176,
          rows: 132,
          x: -3.15,
          width: 2.35,
          height: 1.8,
        },
        {
          name: "benno-interview.webp",
          columns: 200,
          rows: 114,
          x: 0,
          width: 2.4,
          height: 1.37,
        },
        {
          name: "vienna-panorama.webp",
          columns: 208,
          rows: 114,
          x: 3.15,
          width: 2.42,
          height: 1.31,
        },
      ];
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
        for (let row = 0; row < work.rows; row++) {
          for (let col = 0; col < work.columns; col++) {
            const i = (row * work.columns + col) * 4;
            center.set(
              work.x + (col / (work.columns - 1) - 0.5) * work.width,
              2.13 + (0.5 - row / (work.rows - 1)) * work.height,
              -4.835,
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
  room.add(artwork);
  room.initialized = artwork.initialized.then(() => {
    room.splats = artwork.splats;
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
