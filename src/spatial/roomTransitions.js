import * as THREE from "three";
import { Pass, FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { rooms } from "./rooms";

const identities = {
  pavilion: { effect: "afterimage", index: 0, color: "#e9e9bb" },
  orbit: { effect: "orbital", index: 1, color: "#edbd7b" },
  garden: { effect: "silk", index: 2, color: "#b9e7d7" },
  prism: { effect: "spectral", index: 3, color: "#ceb8f0" },
};

export const roomTransitions = Object.fromEntries(rooms.flatMap((from, i) =>
  rooms.filter((to) => to.id !== from.id).map((to) => {
    const j = rooms.indexOf(to);
    return [`${from.id}:${to.id}`, {
      from: from.id, to: to.id, ...identities[to.id],
      sourceColor: identities[from.id].color, direction: i < j ? 1 : -1,
      seed: (i * 4 + j + 1) * 0.173, duration: 2450 + Math.abs(i - j) % 2 * 160,
    }];
  }),
));

export const smoothTravel = (t) => t * t * t * (t * (t * 6 - 15) + 10);

// Projective mapping from an arbitrary convex screen quadrilateral to a unit
// square. A tiny 8x8 solve avoids per-fragment iterative inversion.
export function apertureMatrix(corners) {
  const target = [[0, 0], [1, 0], [1, 1], [0, 1]], rows = [];
  corners.forEach(([x, y], i) => {
    const [u, v] = target[i];
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  });
  for (let column = 0; column < 8; column++) {
    let pivot = column;
    for (let row = column + 1; row < 8; row++)
      if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    const divisor = rows[column][column];
    if (Math.abs(divisor) < 1e-9) return new THREE.Matrix3();
    for (let j = column; j <= 8; j++) rows[column][j] /= divisor;
    for (let row = 0; row < 8; row++) if (row !== column) {
      const factor = rows[row][column];
      for (let j = column; j <= 8; j++) rows[row][j] -= factor * rows[column][j];
    }
  }
  const h = rows.map((row) => row[8]);
  return new THREE.Matrix3().set(h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1);
}

const vertexShader = `varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;

export class RoomTransitionPass extends Pass {
  constructor({ balanced = false } = {}) {
    super();
    this.needsSwap = false;
    this.active = false;
    this.hasHistory = false;
    this.maxHistoryEdge = balanced ? 1024 : 1536;
    this.targets = [0, 1].map(() => new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false,
    }));
    this.history = this.targets[0];
    this.source = this.targets[1];
    this.copy = new THREE.ShaderMaterial({
      uniforms: { image: { value: null } }, toneMapped: false, depthTest: false, depthWrite: false,
      vertexShader, fragmentShader: "uniform sampler2D image; varying vec2 vUv; void main(){gl_FragColor=texture2D(image,vUv);}",
    });
    this.material = new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false, toneMapped: false,
      uniforms: {
        outgoing: { value: null }, incoming: { value: null }, progress: { value: 0 },
        screenToWindow: { value: new THREE.Matrix3() }, sourceWarp: { value: new THREE.Matrix3() },
        crop: { value: 1 }, effect: { value: 0 }, seed: { value: 0 }, direction: { value: 1 },
        fromColor: { value: new THREE.Color() }, toColor: { value: new THREE.Color() },
      },
      vertexShader,
      fragmentShader: `
        uniform sampler2D outgoing, incoming;
        uniform mat3 screenToWindow, sourceWarp;
        uniform float progress, crop, effect, seed, direction;
        uniform vec3 fromColor, toColor;
        varying vec2 vUv;
        vec2 project(mat3 m, vec2 uv){vec3 p=m*vec3(uv,1.0);return p.xy/max(p.z,0.00001);}
        vec3 spectral(float t){return 0.55+0.45*cos(6.28318*(vec3(0.0,0.33,0.67)+t));}
        void main(){
          float p=progress, envelope=sin(3.14159265*p);
          vec2 windowUv=project(screenToWindow,vUv);
          vec2 q=windowUv-0.5;
          float rounding=0.035+0.13*envelope;
          vec2 d=abs(q)-vec2(0.5-rounding);
          float distanceToEdge=length(max(d,0.0))+min(max(d.x,d.y),0.0)-rounding;
          float angle=dot(q,q)>0.0000001?atan(q.y,q.x):0.0;
          float weave=sin(angle*8.0+seed*9.0+p*4.0)*0.004;
          if(effect>1.5&&effect<2.5) distanceToEdge+=weave*envelope;
          float edgeWidth=max(fwidth(distanceToEdge)*1.5,0.0025);
          float mask=1.0-smoothstep(-edgeWidth,edgeWidth,distanceToEdge);
          mask*=smoothstep(0.0,0.045,p);
          mask=mix(mask,1.0,smoothstep(0.87,1.0,p));
          vec2 oldUv=clamp(project(sourceWarp,vUv),vec2(0.001),vec2(0.999));
          vec2 newUv=vec2(0.5+q.x*crop,windowUv.y);
          float edge=exp(-abs(distanceToEdge)*115.0)*envelope;
          vec2 bend=normalize(q+vec2(0.0001))*edge*0.008;
          newUv+=bend*(effect>2.5?1.4:0.4);
          newUv=clamp(newUv,vec2(0.001),vec2(0.999));
          vec3 nextColor=texture2D(incoming,newUv).rgb;
          if(effect>2.5){
            float split=edge*0.006*direction;
            nextColor.r=texture2D(incoming,clamp(newUv+vec2(split,0.0),0.001,0.999)).r;
            nextColor.b=texture2D(incoming,clamp(newUv-vec2(split,0.0),0.001,0.999)).b;
          }
          vec3 result=mix(texture2D(outgoing,oldUv).rgb,nextColor,mask);
          vec3 tint=mix(fromColor,toColor,smoothstep(0.1,0.8,p));
          if(effect>2.5)tint=mix(tint,spectral(angle/6.28318+p*0.2),0.75);
          float filaments=0.0;
          if(effect>0.5&&effect<1.5){
            filaments=pow(max(0.0,cos(distanceToEdge*420.0+p*2.0)),12.0)*exp(-abs(distanceToEdge)*40.0)*0.12;
          }else if(effect<0.5){
            filaments=pow(max(0.0,sin(angle*24.0+seed)),16.0)*exp(-abs(distanceToEdge)*45.0)*0.1;
          }
          result+=tint*(edge*0.6+filaments*envelope);
          gl_FragColor=vec4(result,1.0);
        }`,
    });
    this.quad = new FullScreenQuad(this.copy);
    this.corners = null;
    this.sourceFromWindow = new THREE.Matrix3();
  }

  setSize(width, height) {
    // Keep history storage stable during DPR changes, rotation and resizing.
    // Normalized UV copies retain the current framing at a bounded resolution.
    // The composer's 1px bootstrap target may arrive multiplied by device DPR.
    if (!this.allocated && width >= 2 && height >= 2) {
      const scale = Math.min(1, this.maxHistoryEdge / Math.max(width, height));
      this.targets.forEach((target) => target.setSize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))));
      this.allocated = true;
    }
    this.aspect = width / height;
  }

  begin(profile, corners) {
    if (!this.hasHistory) return false;
    [this.history, this.source] = [this.source, this.history];
    this.material.uniforms.outgoing.value = this.source.texture;
    this.material.uniforms.fromColor.value.set(profile.sourceColor);
    this.material.uniforms.toColor.value.set(profile.color);
    this.material.uniforms.effect.value = profile.index;
    this.material.uniforms.seed.value = profile.seed;
    this.material.uniforms.direction.value = profile.direction;
    this.corners = corners;
    this.sourceFromWindow.copy(apertureMatrix(corners)).invert();
    const width = Math.hypot(corners[1][0] - corners[0][0], corners[1][1] - corners[0][1]);
    const height = Math.hypot(corners[3][0] - corners[0][0], corners[3][1] - corners[0][1]);
    this.initialCrop = THREE.MathUtils.clamp(width / height, 0.12, 1.4);
    this.active = true;
    this.needsSwap = true;
    this.setProgress(0);
    return true;
  }

  setProgress(value) {
    const p = THREE.MathUtils.clamp(value, 0, 1), eased = smoothTravel(p);
    const full = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const corners = this.corners.map((point, i) => [
      THREE.MathUtils.lerp(point[0], full[i][0], eased),
      THREE.MathUtils.lerp(point[1], full[i][1], eased),
    ]);
    this.material.uniforms.screenToWindow.value.copy(apertureMatrix(corners));
    this.material.uniforms.sourceWarp.value.multiplyMatrices(this.sourceFromWindow, this.material.uniforms.screenToWindow.value);
    this.material.uniforms.progress.value = p;
    this.material.uniforms.crop.value = THREE.MathUtils.lerp(this.initialCrop, 1, eased);
  }

  finish() { this.active = false; this.needsSwap = false; }

  render(renderer, writeBuffer, readBuffer) {
    const previous = renderer.getRenderTarget();
    let image = readBuffer.texture;
    if (this.active) {
      this.quad.material = this.material;
      this.material.uniforms.incoming.value = readBuffer.texture;
      renderer.setRenderTarget(writeBuffer);
      this.quad.render(renderer);
      image = writeBuffer.texture;
    }
    this.quad.material = this.copy;
    this.copy.uniforms.image.value = image;
    renderer.setRenderTarget(this.history);
    this.quad.render(renderer);
    renderer.setRenderTarget(previous);
    this.hasHistory = true;
  }

  dispose() {
    this.targets.forEach((target) => target.dispose());
    this.material.dispose(); this.copy.dispose(); this.quad.dispose();
  }
}
