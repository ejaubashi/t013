import * as THREE from "three";
import { Pass, FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { rooms } from "./rooms.js";

export const roomTransitions = Object.fromEntries(rooms.flatMap((from, i) =>
  rooms.filter((to) => to.id !== from.id).map((to) => [`${from.id}:${to.id}`, {
    from: from.id, to: to.id, effect: "depth-portal",
    duration: 1420 + Math.abs(i - rooms.indexOf(to)) % 2 * 80,
  }]),
));

export const smoothTravel = (t) => t * t * t * (t * (t * 6 - 15) + 10);

// Map a unit square onto a projected doorway. Keeping the full homography
// preserves oblique door edges; a bounding rectangle loses that perspective.
export function portalMatrix(corners) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = corners;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const determinant = dx1 * dy2 - dx2 * dy1;
  const g = Math.abs(determinant) > 1e-10 ? (dx3 * dy2 - dx2 * dy3) / determinant : 0;
  const h = Math.abs(determinant) > 1e-10 ? (dx1 * dy3 - dx3 * dy1) / determinant : 0;
  return new THREE.Matrix3().set(x1 - x0 + g * x1, x3 - x0 + h * x3, x0,
    y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1);
}

const vertexShader = `varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;

// Capture HDR colour and linear scene depth, then expand the projected door.
// The motion path needs one compositing draw, with no repeated scene sorting.
export class RoomTransitionPass extends Pass {
  constructor({ balanced = false, camera } = {}) {
    super();
    this.needsSwap = false;
    this.active = false;
    this.prepared = false;
    this.hasHistory = false;
    this.frames = 0;
    this.captures = 0;
    this.maxHistoryEdge = balanced ? 1024 : 1536;
    this.targets = [0, 1, 2].map(() => new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false,
    }));
    [this.history, this.source, this.arrival] = this.targets;
    this.copy = new THREE.ShaderMaterial({
      uniforms: { image: { value: null }, depth: { value: null }, captureDepth: { value: false },
        near: { value: camera?.near ?? 0.03 }, far: { value: camera?.far ?? 100 } }, toneMapped: false, depthTest: false, depthWrite: false,
      vertexShader, fragmentShader: `
        #include <packing>
        uniform sampler2D image, depth;
        uniform bool captureDepth;
        uniform float near, far;
        varying vec2 vUv;
        void main(){
          vec4 color=texture2D(image,vUv);
          if(captureDepth) color.a=-perspectiveDepthToViewZ(texture2D(depth,vUv).x,near,far);
          gl_FragColor=color;
        }`,
    });
    this.material = new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false, toneMapped: false,
      uniforms: {
        outgoing: { value: null }, incoming: { value: null }, progress: { value: 0 },
        focus: { value: new THREE.Vector2(0.5, 0.5) },
        portalInverse: { value: new THREE.Matrix3() }, sourceProjection: { value: new THREE.Matrix3() },
        depthAvailable: { value: false },
      },
      vertexShader,
      fragmentShader: `
        uniform sampler2D outgoing, incoming;
        uniform float progress;
        uniform bool depthAvailable;
        uniform vec2 focus;
        uniform mat3 portalInverse, sourceProjection;
        varying vec2 vUv;
        vec2 safeUv(vec2 uv){return clamp(uv,vec2(0.001),vec2(0.999));}
        vec2 project(mat3 matrix,vec2 uv){
          vec3 p=matrix*vec3(uv,1.0);
          return p.xy/(abs(p.z)<0.0001?0.0001:p.z);
        }
        void main(){
          float p=progress;
          float speed=16.0*p*p*(1.0-p)*(1.0-p);
          vec2 doorUv=project(portalInverse,vUv);
          vec2 oldUv=project(sourceProjection,doorUv);
          // A small, bounded depth correction lets near architecture move
          // against the doorway plane. It is image reprojection, not a new
          // rendering of unseen geometry; limiting it avoids torn edges.
          if(depthAvailable){
            float z=texture2D(outgoing,safeUv(oldUv)).a;
            float planeZ=texture2D(outgoing,focus).a;
            float relative=clamp(planeZ/max(z,0.5)-1.0,-0.6,1.0);
            oldUv+=(oldUv-focus)*relative*speed*0.035;
          }
          vec3 previous=texture2D(outgoing,safeUv(oldUv)).rgb;
          float settle=clamp((p-0.38)/0.62,0.0,1.0);
          settle=settle*settle*settle*(settle*(settle*6.0-15.0)+10.0);
          vec2 newUv=mix(doorUv,vUv,settle);
          if(depthAvailable){
            float z=texture2D(incoming,safeUv(newUv)).a;
            newUv+=(newUv-0.5)*clamp(4.0/max(z,0.5)-1.0,-0.5,0.8)*speed*0.012;
          }
          vec3 next=texture2D(incoming,safeUv(newUv)).rgb;
          float edge=min(min(doorUv.x,doorUv.y),min(1.0-doorUv.x,1.0-doorUv.y));
          float pixel=max(fwidth(doorUv.x),fwidth(doorUv.y));
          float aperture=smoothstep(-pixel,pixel,edge)*smoothstep(0.0,0.12,p);
          vec3 color=mix(previous,next,aperture);
          // An optical edge only a few screen pixels wide, never a flash.
          float rim=(1.0-smoothstep(pixel,pixel*3.0,abs(edge)))*speed;
          color=mix(color,vec3(0.94,0.92,0.87),rim*0.16);
          gl_FragColor=vec4(color,1.0);
        }`,
    });
    // Software graphics do the blend and output conversion in one draw. The
    // detail tier keeps its normal bloom/output/AA composer on physical GPUs.
    this.displayMaterial = balanced ? new THREE.ShaderMaterial({
      uniforms: this.material.uniforms, depthTest: false, depthWrite: false,
      toneMapped: true, vertexShader,
      fragmentShader: this.material.fragmentShader.replace("gl_FragColor=vec4(color,1.0);",
        "gl_FragColor=vec4(color,1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>"),
    }) : null;
    this.quad = new FullScreenQuad(this.copy);
  }

  setSize(width, height) {
    // Ignore the composer's DPR-scaled 1px bootstrap target. Keep image
    // storage stable when motion quality changes the drawing resolution.
    if (!this.allocated && width >= 2 && height >= 2) {
      const scale = Math.min(1, this.maxHistoryEdge / Math.max(width, height));
      this.targets.forEach((target) => target.setSize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))));
      this.allocated = true;
    }
  }

  begin(corners) {
    if (!this.hasHistory) return false;
    [this.history, this.source] = [this.source, this.history];
    const uniforms = this.material.uniforms;
    uniforms.outgoing.value = this.source.texture;
    uniforms.incoming.value = this.arrival.texture;
    this.corners = corners;
    uniforms.sourceProjection.value.copy(portalMatrix(corners));
    const center = corners.reduce((point, [x, y]) => point.add(new THREE.Vector2(x, y)), new THREE.Vector2()).multiplyScalar(0.25);
    uniforms.focus.value.copy(center).clampScalar(0.001, 0.999);
    uniforms.depthAvailable.value = Boolean(this.depthReady);
    this.active = true;
    this.prepared = false;
    this.needsSwap = true;
    this.frames = 0;
    this.captures = 0;
    this.setProgress(0);
    return true;
  }

  setProgress(value) {
    const p = THREE.MathUtils.clamp(value, 0, 1);
    this.material.uniforms.progress.value = p;
    if (!this.corners) return;
    // Slight overscan covers every corner before the live scene resumes.
    // Quintic timing has zero velocity and acceleration at both endpoints.
    const ease = smoothTravel(p), screen = [[-0.06, -0.06], [1.06, -0.06], [1.06, 1.06], [-0.06, 1.06]];
    const corners = this.corners.map((point, i) => point.map((v, axis) => THREE.MathUtils.lerp(v, screen[i][axis], ease)));
    this.material.uniforms.portalInverse.value.copy(portalMatrix(corners)).invert();
  }

  finish(renderer) {
    // Save the displayed composition only at hand-off or interruption. A
    // full-size HDR history copy on every animation frame wastes bandwidth.
    if (this.active) {
      const previousTarget = renderer.getRenderTarget();
      try {
        if (this.prepared) {
          this.quad.material = this.material;
          renderer.setRenderTarget(this.history);
          this.quad.render(renderer);
        } else {
          // A second destination can be chosen before the arrival capture.
          // Preserve the source actually on screen, not the stale swap target.
          this.copyImage(renderer, this.source.texture, this.history);
        }
      } finally { renderer.setRenderTarget(previousTarget); }
    }
    this.depthReady = false; // Interrupted compositions have no single geometric depth.
    this.active = false; this.prepared = false; this.needsSwap = false;
  }

  copyImage(renderer, texture, target, depth = null) {
    this.quad.material = this.copy;
    this.copy.uniforms.image.value = texture;
    this.copy.uniforms.depth.value = depth || texture;
    this.copy.uniforms.captureDepth.value = Boolean(depth);
    if (target === this.history) this.depthReady = Boolean(depth);
    renderer.setRenderTarget(target);
    this.quad.render(renderer);
  }

  renderToDisplay(renderer) {
    const previousTarget = renderer.getRenderTarget();
    try {
      this.quad.material = this.displayMaterial;
      renderer.setRenderTarget(null);
      this.quad.render(renderer);
      this.frames++;
    } finally { renderer.setRenderTarget(previousTarget); }
  }

  render(renderer, writeBuffer, readBuffer) {
    const previousTarget = renderer.getRenderTarget();
    try {
      let image = readBuffer.texture;
      if (this.active) {
        if (!this.prepared) {
          this.copyImage(renderer, readBuffer.texture, this.arrival, readBuffer.depthTexture);
          this.prepared = true;
          this.captures++;
        }
        this.quad.material = this.material;
        renderer.setRenderTarget(writeBuffer);
        this.quad.render(renderer);
        image = writeBuffer.texture;
        this.frames++;
      } else if (!this.warmed) {
        // Compile and allocate before the first click, not at peak movement.
        this.material.uniforms.outgoing.value = this.material.uniforms.incoming.value = readBuffer.texture;
        this.quad.material = this.material;
        renderer.setRenderTarget(this.arrival);
        this.quad.render(renderer);
        this.copyImage(renderer, image, this.source);
        if (this.displayMaterial) {
          this.quad.material = this.displayMaterial;
          renderer.setRenderTarget(null);
          this.quad.render(renderer);
        }
        this.warmed = true;
      }
      if (!this.active) this.copyImage(renderer, image, this.history, readBuffer.depthTexture);
      this.hasHistory = true;
    } finally { renderer.setRenderTarget(previousTarget); }
  }

  dispose() {
    this.targets.forEach((target) => target.dispose());
    this.material.dispose(); this.displayMaterial?.dispose(); this.copy.dispose(); this.quad.dispose();
  }
}
