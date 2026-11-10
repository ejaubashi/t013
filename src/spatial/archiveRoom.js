import * as THREE from "three";
import { SplatMesh } from "@sparkjsdev/spark";

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
      reject(new Error("The archive photographs could not be loaded."));
    image.src = asset(name);
  });
}

// An authored Gaussian-splat study, not a scan of a historical location.
// All visible surfaces and photographs are ellipsoidal Gaussians, not meshes.
export function createArchiveRoom({ onProgress } = {}) {
  return new SplatMesh({
    lod: false,
    constructSplats: async (splats) => {
      const images = await Promise.all([
        imagePixels("benno-family.webp", 112, 86),
        imagePixels("benno-interview.webp", 140, 80),
        imagePixels("vienna-panorama.webp", 140, 76),
      ]);
      const p = new THREE.Vector3(),
        scale = new THREE.Vector3(),
        color = new THREE.Color();
      const rotations = {
        front: new THREE.Quaternion(),
        floor: new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          -Math.PI / 2,
        ),
        side: new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          Math.PI / 2,
        ),
      };
      let seed = 8721;
      const random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      const dot = (
        x,
        y,
        z,
        sx,
        sy,
        sz,
        r,
        g,
        b,
        opacity = 1,
        rotation = rotations.front,
      ) => {
        p.set(x, y, z);
        scale.set(sx, sy, sz);
        color.setRGB(r, g, b);
        splats.pushSplat(p, scale, rotation, opacity, color);
      };
      const plane = ({
        x = 0,
        y = 0,
        z = 0,
        width,
        height,
        step = 0.12,
        rgb,
        orientation = "front",
        grain = 0.035,
        opacity = 1,
      }) => {
        const rotation = rotations[orientation];
        for (let a = -width / 2; a <= width / 2; a += step) {
          for (let b = -height / 2; b <= height / 2; b += step) {
            const noise = (random() - 0.5) * grain;
            const px = orientation === "side" ? x : x + a;
            const py = orientation === "floor" ? y : y + b;
            const pz =
              orientation === "side"
                ? z + a
                : orientation === "floor"
                  ? z + b
                  : z;
            const light = 0.78 + 0.22 * Math.max(0, (px + 6) / 12);
            dot(
              px,
              py,
              pz,
              step * 0.61,
              step * 0.61,
              0.008,
              ...rgb.map((v) => Math.max(0.005, v * light + noise)),
              opacity,
              rotation,
            );
          }
        }
      };
      // Warm plaster, plum alcoves, and an aged timber floor.
      plane({
        y: 2.15,
        z: -5,
        width: 12,
        height: 4.3,
        rgb: [0.22, 0.185, 0.14],
        grain: 0.045,
      });
      plane({
        x: -6,
        y: 2.15,
        z: -0.1,
        width: 10,
        height: 4.3,
        orientation: "side",
        rgb: [0.135, 0.098, 0.105],
      });
      plane({
        x: 6,
        y: 2.15,
        z: -0.1,
        width: 10,
        height: 4.3,
        orientation: "side",
        rgb: [0.21, 0.185, 0.14],
      });
      plane({
        y: 0,
        z: -0.1,
        width: 12,
        height: 10,
        orientation: "floor",
        rgb: [0.16, 0.115, 0.07],
        step: 0.14,
        grain: 0.07,
      });
      plane({
        y: 4.3,
        z: -0.1,
        width: 12,
        height: 10,
        orientation: "floor",
        rgb: [0.1, 0.085, 0.07],
        step: 0.19,
      });
      // Fine floorboards and warm reflected light beneath each display.
      for (let x = -5.75; x < 6; x += 0.55) {
        plane({
          x,
          y: 0.008,
          z: -0.1,
          width: 0.016,
          height: 10,
          orientation: "floor",
          step: 0.14,
          rgb: [0.07, 0.046, 0.026],
          grain: 0,
        });
      }
      for (const x of [-3.15, 0, 3.15]) {
        plane({
          x,
          y: 2.12,
          z: -4.96,
          width: 2.85,
          height: 3.3,
          rgb: [0.045, 0.029, 0.042],
          step: 0.085,
          grain: 0.012,
        });
        plane({
          x,
          y: 0.025,
          z: -3.85,
          width: 2.8,
          height: 1.5,
          orientation: "floor",
          rgb: [0.39, 0.245, 0.09],
          opacity: 0.12,
          step: 0.14,
        });
        plane({
          x,
          y: 3.96,
          z: -4.91,
          width: 2.55,
          height: 0.04,
          rgb: [0.96, 0.73, 0.35],
          step: 0.035,
          grain: 0,
        });
      }
      onProgress?.(55);
      const picture = (pixels, columns, rows, x, width, height) => {
        const y = 2.13,
          z = -4.84;
        plane({
          x,
          y,
          z: z - 0.045,
          width: width + 0.14,
          height: height + 0.14,
          step: 0.055,
          rgb: [0.59, 0.42, 0.21],
          grain: 0.03,
        });
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < columns; col++) {
            const i = (row * columns + col) * 4;
            dot(
              x + (col / (columns - 1) - 0.5) * width,
              y + (0.5 - row / (rows - 1)) * height,
              z,
              (width / columns) * 0.61,
              (height / rows) * 0.61,
              0.0025,
              (pixels[i] / 255) * 0.87,
              (pixels[i + 1] / 255) * 0.82,
              (pixels[i + 2] / 255) * 0.74,
            );
          }
        }
      };
      picture(images[0], 112, 86, -3.15, 2.35, 1.8);
      picture(images[1], 140, 80, 0, 2.4, 1.37);
      picture(images[2], 140, 76, 3.15, 2.42, 1.31);
      // A table anchors the space, assembled from Gaussian surfaces.
      plane({
        x: 0,
        y: 0.82,
        z: 0.2,
        width: 3.6,
        height: 1.5,
        orientation: "floor",
        rgb: [0.265, 0.158, 0.075],
        step: 0.065,
        grain: 0.065,
      });
      plane({
        x: 0,
        y: 0.75,
        z: 0.96,
        width: 3.6,
        height: 0.13,
        rgb: [0.17, 0.09, 0.04],
        step: 0.05,
      });
      for (const x of [-1.55, 1.55]) {
        for (const z of [-0.37, 0.78])
          plane({
            x,
            y: 0.38,
            z,
            width: 0.13,
            height: 0.76,
            rgb: [0.12, 0.065, 0.033],
            step: 0.055,
          });
      }
      // A small stack of paper on the table.
      for (let n = 0; n < 4; n++)
        plane({
          x: -0.55 + n * 0.02,
          y: 0.84 + n * 0.015,
          z: 0.12 - n * 0.015,
          width: 0.62,
          height: 0.85,
          orientation: "floor",
          rgb: [0.73, 0.66, 0.5],
          step: 0.045,
          grain: 0.02,
        });
      // Abstract dust catches a narrow beam; the room remains still at rest.
      for (let i = 0; i < 450; i++) {
        const x = 1.4 + random() * 3.8,
          y = 0.3 + random() * 3.6,
          z = -4 + random() * 7;
        dot(
          x,
          y,
          z,
          0.009,
          0.009,
          0.009,
          0.85,
          0.69,
          0.42,
          0.14 + random() * 0.14,
        );
      }
      onProgress?.(95);
    },
  });
}
