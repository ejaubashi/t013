const chords = { pavilion: [130.81, 196, 261.63], orbit: [103.83, 155.56, 207.65], garden: [87.31, 130.81, 174.61], prism: [77.78, 116.54, 155.56] };

// Original procedural sound, with no recordings or third-party music.
export function createAmbientGraph(context, room = "pavilion") {
  const master = context.createGain(); master.gain.value = 0;
  const limiter = context.createDynamicsCompressor(); limiter.threshold.value = -16; limiter.ratio.value = 5; limiter.attack.value = .03; limiter.release.value = .5;
  master.connect(limiter); limiter.connect(context.destination);
  const space = context.createConvolver(), impulse = context.createBuffer(2, context.sampleRate * 1.8, context.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = impulse.getChannelData(c);
    for (let i = 0; i < data.length; i++) data[i] = (Math.sin(i * (12.9898 + c * .37)) * 43758.5453 % 1) * Math.exp(-i / context.sampleRate * 4.6) * .35;
  }
  space.buffer = impulse; const wet = context.createGain(); wet.gain.value = .16; space.connect(wet); wet.connect(master);
  const panner = context.createPanner(); panner.panningModel = "HRTF"; panner.distanceModel = "inverse"; panner.refDistance = 5; panner.maxDistance = 40; panner.rolloffFactor = .65;
  panner.positionX.value = 2.2; panner.positionY.value = 2.6; panner.positionZ.value = -.8;
  const dry = context.createGain(); dry.gain.value = .84; panner.connect(dry); dry.connect(master); panner.connect(space);
  const filter = context.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 840; filter.Q.value = .45; filter.connect(panner);
  const sources = [], tones = [];
  chords[room].forEach((frequency, index) => {
    const tone = context.createOscillator(), gain = context.createGain(), lfo = context.createOscillator(), depth = context.createGain();
    tone.type = index === 1 ? "triangle" : "sine"; tone.frequency.value = frequency; tone.detune.value = [0, 2.4, -2.4][index];
    gain.gain.value = [.13, .045, .045][index]; lfo.frequency.value = .043 + index * .017; depth.gain.value = .012;
    lfo.connect(depth); depth.connect(gain.gain); tone.connect(gain); gain.connect(filter); tone.start(); lfo.start(); sources.push(tone, lfo); tones.push(tone);
  });
  const noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate), samples = noise.getChannelData(0);
  let seed = 347821;
  for (let i = 0; i < samples.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; samples[i] = seed / 2147483648 - 1; }
  const air = context.createBufferSource(), airFilter = context.createBiquadFilter(), airGain = context.createGain();
  air.buffer = noise; air.loop = true; airFilter.type = "lowpass"; airFilter.frequency.value = 650; airGain.gain.value = .012;
  air.connect(airFilter); airFilter.connect(airGain); airGain.connect(panner); air.start(); sources.push(air);
  const automate = (parameter, value, duration = 1) => {
    const now = context.currentTime; parameter.cancelScheduledValues(now); parameter.setValueAtTime(parameter.value, now); parameter.linearRampToValueAtTime(value, now + duration);
  };
  return {
    master,
    setVolume(value, seconds = .7) { automate(master.gain, value, seconds); },
    setRoom(id) {
      chords[id].forEach((frequency, i) => automate(tones[i].frequency, frequency, 2.4));
      automate(panner.positionX, id === "pavilion" ? 2.2 : 0); automate(panner.positionY, id === "garden" ? 3.8 : 2.6);
    },
    pose({ position, direction }) {
      const listener = context.listener, now = context.currentTime;
      if (listener.positionX) {
        [listener.positionX, listener.positionY, listener.positionZ].forEach((param, i) => { param.cancelScheduledValues(now); param.linearRampToValueAtTime(position[i], now + .11); });
        [listener.forwardX, listener.forwardY, listener.forwardZ].forEach((param, i) => { param.cancelScheduledValues(now); param.linearRampToValueAtTime(direction[i], now + .11); });
        listener.upY.setValueAtTime(1, now);
      } else { listener.setPosition(...position); listener.setOrientation(...direction, 0, 1, 0); }
    },
    footstep() {
      const source = context.createBufferSource(), band = context.createBiquadFilter(), envelope = context.createGain(), now = context.currentTime;
      source.buffer = noise; band.type = "bandpass"; band.frequency.value = 230; band.Q.value = .6;
      envelope.gain.setValueAtTime(.0001, now); envelope.gain.exponentialRampToValueAtTime(.07, now + .008); envelope.gain.exponentialRampToValueAtTime(.0001, now + .13);
      source.connect(band); band.connect(envelope); envelope.connect(master); envelope.connect(space); source.start(now, .4, .15);
      source.onended = () => { source.disconnect(); band.disconnect(); envelope.disconnect(); };
    },
    passage() {
      const source = context.createBufferSource(), band = context.createBiquadFilter(), envelope = context.createGain(), now = context.currentTime;
      source.buffer = noise; band.type = "lowpass"; band.frequency.setValueAtTime(220, now); band.frequency.linearRampToValueAtTime(1400, now + .65); band.frequency.linearRampToValueAtTime(220, now + 1.5);
      envelope.gain.setValueAtTime(.0001, now); envelope.gain.linearRampToValueAtTime(.026, now + .65); envelope.gain.linearRampToValueAtTime(0, now + 1.5);
      source.connect(band); band.connect(envelope); envelope.connect(master); source.start(now, 0, 1.6); source.onended = () => { source.disconnect(); band.disconnect(); envelope.disconnect(); };
    },
    dispose() { sources.forEach(source => { try { source.stop(); } catch {} source.disconnect(); }); master.disconnect(); limiter.disconnect(); space.disconnect(); panner.disconnect(); },
  };
}

export class GallerySoundscape {
  constructor() { this.context = null; this.graph = null; this.enabled = false; this.room = "pavilion"; this.lastStep = 0; }
  async setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) { this.graph?.setVolume(0, .35); return false; }
    if (!this.context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) { this.enabled = false; return false; }
      this.context = new Audio(); this.graph = createAmbientGraph(this.context, this.room);
      this.visibility = () => { if (document.hidden) this.context.suspend().catch(() => {}); else if (this.enabled) this.context.resume().catch(() => {}); };
      document.addEventListener("visibilitychange", this.visibility);
    }
    await this.context.resume(); this.graph.setVolume(this.enabled ? .24 : 0, 1.4); return this.enabled;
  }
  setRoom(id) { this.room = id; this.graph?.setRoom(id); }
  passage() { if (this.enabled) this.graph?.passage(); }
  pose(pose) {
    if (!this.enabled || !this.graph || this.context.state !== "running") return;
    this.graph.pose(pose); const now = this.context.currentTime;
    if (pose.speed > .4 && now - this.lastStep > .48) { this.graph.footstep(); this.lastStep = now; }
  }
  dispose() { if (this.visibility) document.removeEventListener("visibilitychange", this.visibility); this.graph?.dispose(); this.context?.close().catch(() => {}); this.enabled = false; }
}
