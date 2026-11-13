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
      seed: (i * 4 + j + 1) * 0.173, duration: 1250 + Math.abs(i - j) % 2 * 80,
    }];
  }),
));

export const smoothTravel = (t) => t * t * t * (t * (t * 6 - 15) + 10);

const vertexShader = `varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;

// Capture the arrival once, then animate two HDR images on a full-screen
// triangle. Mirrors, transmission and Spark sorting stay off the motion path.
export class RoomTransitionPass extends Pass {
  constructor({ balanced = false } = {}) {
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
      uniforms: { image: { value: null } }, toneMapped: false, depthTest: false, depthWrite: false,
      vertexShader, fragmentShader: "uniform sampler2D image; varying vec2 vUv; void main(){gl_FragColor=texture2D(image,vUv);}",
    });
    this.material = new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false, toneMapped: false,
      uniforms: {
        outgoing: { value: null }, incoming: { value: null }, progress: { value: 0 },
        focus: { value: new THREE.Vector2(0.5, 0.5) }, axis: { value: new THREE.Vector2(1, 0) },
        aspect: { value: 1 }, effect: { value: 0 }, seed: { value: 0 },
        fromColor: { value: new THREE.Color() }, toColor: { value: new THREE.Color() },
      },
      vertexShader,
      fragmentShader: `
        uniform sampler2D outgoing, incoming;
        uniform float progress, aspect, effect, seed;
        uniform vec2 focus, axis;
        uniform vec3 fromColor, toColor;
        varying vec2 vUv;
        vec2 safeUv(vec2 uv){return clamp(uv,vec2(0.001),vec2(0.999));}
        vec3 glide(sampler2D image,vec2 uv,vec2 velocity){
          vec3 color=texture2D(image,safeUv(uv)).rgb*0.5;
          color+=texture2D(image,safeUv(uv-velocity)).rgb*0.25;
          color+=texture2D(image,safeUv(uv+velocity)).rgb*0.25;
          return color;
        }
        void main(){
          float p=progress;
          float ease=p*p*p*(p*(p*6.0-15.0)+10.0);
          // Normalized derivative of the timing curve: no blur at either end.
          float speed=16.0*p*p*(1.0-p)*(1.0-p);
          vec2 q=(vUv-0.5)*vec2(aspect,1.0);
          vec2 flow=vec2(sin(q.y*2.8+seed+p*1.8),cos(q.x*2.2-seed-p*1.2));
          if(effect>0.5&&effect<1.5)flow+=vec2(-q.y,q.x)*0.28;
          if(effect>1.5&&effect<2.5)flow.y+=sin(q.x*3.2+p*2.0)*0.35;
          flow.x/=aspect;
          vec2 oldUv=vUv-(vUv-focus)*ease*0.12+axis*speed*0.012+flow*speed*0.006;
          vec2 newUv=vUv+(vUv-0.5)*(1.0-ease)*0.035-axis*(1.0-ease)*0.018-flow*speed*0.004;
          vec2 velocity=((vUv-focus)*0.018+axis*0.009)*speed;
          vec3 previous=glide(outgoing,oldUv,velocity);
          vec3 next=glide(incoming,newUv,velocity*0.65);
          if(effect>2.5){
            vec2 dispersion=vec2(0.0015*speed,0.0);
            next.r=mix(next.r,texture2D(incoming,safeUv(newUv+dispersion)).r,0.45);
            next.b=mix(next.b,texture2D(incoming,safeUv(newUv-dispersion)).b,0.45);
          }
          float luminance=dot(previous,vec3(0.2126,0.7152,0.0722));
          float spatial=dot(vUv-0.5,axis)*0.09+flow.x*0.025+(luminance-0.5)*0.025;
          float blend=smoothstep(0.07,0.93,ease+spatial*speed);
          vec3 color=mix(previous,next,blend);
          color+=mix(fromColor,toColor,ease)*speed*0.012;
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
    this.material.uniforms.aspect.value = width / height;
  }

  begin(profile, corners) {
    if (!this.hasHistory) return false;
    [this.history, this.source] = [this.source, this.history];
    const uniforms = this.material.uniforms;
    uniforms.outgoing.value = this.source.texture;
    uniforms.incoming.value = this.arrival.texture;
    uniforms.fromColor.value.set(profile.sourceColor);
    uniforms.toColor.value.set(profile.color);
    uniforms.effect.value = profile.index;
    uniforms.seed.value = profile.seed;
    const center = corners.reduce((point, [x, y]) => point.add(new THREE.Vector2(x, y)), new THREE.Vector2()).multiplyScalar(0.25);
    uniforms.focus.value.set(THREE.MathUtils.clamp(center.x, 0.15, 0.85), THREE.MathUtils.clamp(center.y, 0.2, 0.8));
    uniforms.axis.value.set(profile.direction, 0.14).normalize();
    this.active = true;
    this.prepared = false;
    this.needsSwap = true;
    this.frames = 0;
    this.captures = 0;
    this.setProgress(0);
    return true;
  }

  setProgress(value) { this.material.uniforms.progress.value = THREE.MathUtils.clamp(value, 0, 1); }

  finish(renderer) {
    // Save the displayed composition only at hand-off or interruption. A
    // full-size HDR history copy on every animation frame wastes bandwidth.
    if (this.active && this.prepared) {
      const previousTarget = renderer.getRenderTarget();
      try {
        this.quad.material = this.material;
        renderer.setRenderTarget(this.history);
        this.quad.render(renderer);
      } finally { renderer.setRenderTarget(previousTarget); }
    }
    this.active = false; this.prepared = false; this.needsSwap = false;
  }

  copyImage(renderer, texture, target) {
    this.quad.material = this.copy;
    this.copy.uniforms.image.value = texture;
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
          this.copyImage(renderer, readBuffer.texture, this.arrival);
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
      if (!this.active) this.copyImage(renderer, image, this.history);
      this.hasHistory = true;
    } finally { renderer.setRenderTarget(previousTarget); }
  }

  dispose() {
    this.targets.forEach((target) => target.dispose());
    this.material.dispose(); this.displayMaterial?.dispose(); this.copy.dispose(); this.quad.dispose();
  }
}
