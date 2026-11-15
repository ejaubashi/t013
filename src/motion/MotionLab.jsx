import { useEffect, useRef, useState } from "react";
import { createStudyRenderer, studies } from "./studyRenderer";
import "./motion-lab.css";

const rooms = [{ id: "pavilion", name: "Lumen Pavilion" }, { id: "orbit", name: "Orbit Hall" }, { id: "garden", name: "Sky Garden" }, { id: "prism", name: "Prism Chamber" }];
const base = import.meta.env.BASE_URL;
const escape = text => text.replace(/[<>&"]/g, char => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[char]));

function Symbol({ name = "arrow" }) {
  const paths = { arrow: "M5 19 19 5M5 5h14v14", down: "M12 3v17m-6-6 6 6 6-6", reset: "M4 9a8 8 0 1 1 0 6M4 3v6h6", play: "m8 4 12 8-12 8Z", pause: "M8 5v14M16 5v14" };
  return <svg className="motion-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export default function MotionLab() {
  const initial = new URLSearchParams(location.search).get("study");
  const [selected, setSelected] = useState(studies.some(study => study.id === initial) ? initial : "continuum");
  const [from, setFrom] = useState("pavilion"), [to, setTo] = useState("orbit");
  const [ready, setReady] = useState(false), [error, setError] = useState("");
  const [playing, setPlaying] = useState(false), [exporting, setExporting] = useState(false);
  const [reduced, setReduced] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [backend, setBackend] = useState("");
  const host = useRef(null), engine = useRef(null), position = useRef(0), timeline = useRef(null), output = useRef(null), autoPlayed = useRef(false);
  const study = studies.find(item => item.id === selected);
  const draw = p => {
    position.current = p; engine.current?.draw(p);
    if (timeline.current) timeline.current.value = String(Math.round(p * 1000));
    if (output.current) output.current.textContent = `${Math.round(p * 100)}%`;
  };
  useEffect(() => {
    document.title = "Motion studies — Benno’s Light";
    let alive = true;
    createStudyRenderer(host.current).then(value => {
      if (!alive) { value.dispose(); return; }
      engine.current = value; setBackend(value.canvas.dataset.backend); setReady(true);
    }).catch(reason => { if (alive) setError(reason.message || "The motion study could not be opened."); });
    const preference = matchMedia("(prefers-reduced-motion: reduce)"), sync = event => setReduced(event.matches);
    preference.addEventListener("change", sync);
    return () => { alive = false; engine.current?.dispose(); engine.current = null; preference.removeEventListener("change", sync); };
  }, []);
  useEffect(() => {
    if (!ready) return;
    setPlaying(false); engine.current.setStudy(selected); engine.current.setRooms(from, to); draw(0);
  }, [selected, from, to, ready]);
  useEffect(() => {
    if (!ready || reduced || autoPlayed.current || new URLSearchParams(location.search).get("autoplay") === "0") return;
    autoPlayed.current = true; const timer = setTimeout(() => setPlaying(true), 500); return () => clearTimeout(timer);
  }, [ready, reduced]);
  useEffect(() => {
    if (!playing || !ready) return;
    if (reduced) { draw(1); setPlaying(false); return; }
    let frame, last = null;
    const tick = time => {
      if (last === null) last = time;
      const p = Math.min(1, position.current + Math.min(.12, Math.max(0, (time - last) / 1000)) / 3.2); last = time;
      draw(p);
      if (p < 1) frame = requestAnimationFrame(tick); else setPlaying(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, ready, reduced]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", hidden); return () => document.removeEventListener("visibilitychange", hidden);
  }, []);
  const play = () => { if (playing) { setPlaying(false); return; } if (position.current > .999) draw(0); setPlaying(true); };
  const chooseRoom = (id, origin) => {
    if (origin) { setFrom(id); if (id === to) setTo(rooms[(rooms.findIndex(room => room.id === id) + 1) % 4].id); }
    else { setTo(id); if (id === from) setFrom(rooms[(rooms.findIndex(room => room.id === id) + 1) % 4].id); }
  };
  const exportStoryboard = async () => {
    setPlaying(false); setExporting(true);
    try {
      await new Promise(resolve => requestAnimationFrame(resolve));
      const before = position.current;
      const images = [0, .23, .5, .77, 1].map(p => engine.current.capture(p));
      draw(before);
      const captions = ["The room", "Gather", "Become sculpture", "Unfold", "The next room"];
      const frames = images.map((image, i) => `<g transform="translate(${40 + i * 296} 184)"><rect width="280" height="210" rx="8" fill="#e6e1d7"/><image href="${image}" width="280" height="210" preserveAspectRatio="xMidYMid meet"/><text x="0" y="242" font-size="11" fill="#777267">0${i + 1} / ${captions[i]}</text><text x="0" y="264" font-size="10" fill="#777267">${[0, .23, .5, .77, 1][i] * 100}% of 3.2 seconds</text></g>`).join("");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1520" height="574" viewBox="0 0 1520 574"><rect width="1520" height="574" fill="#f7f5f0"/><g font-family="Arial, sans-serif"><text x="40" y="44" font-size="11" letter-spacing="2" fill="#777267">BENNO’S LIGHT / MOTION STUDY ${study.number}</text><text x="40" y="104" font-size="46" fill="#30312c">${escape(study.title)}</text><text x="40" y="139" font-size="15" fill="#777267">${escape(study.subtitle)} — ${escape(rooms.find(room => room.id === from).name)} to ${escape(rooms.find(room => room.id === to).name)}</text>${frames}<path d="M40 492H1480" stroke="#c9c2b5"/><text x="40" y="524" font-size="11" fill="#777267">Ivory / stone / charcoal · continuous 3D geometry · quintic timing · exact still endpoints</text><text x="40" y="548" font-size="10" fill="#777267">Figma import: drag this SVG onto the canvas. The storyboard contains embedded study frames and editable vector labels.</text></g></svg>`;
      const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })), link = document.createElement("a");
      link.href = url; link.download = `bennos-light-${selected}-storyboard.svg`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally { setExporting(false); }
  };
  return <main className="motion-lab">
    <header className="motion-header"><a className="motion-brand" href={`${base}?view=spatial`}>Benno’s Light <span>/ Motion studies</span></a><a href={`${base}?view=spatial`}>Back to the gallery <span aria-hidden="true"><Symbol /></span></a></header>
    <section className="motion-intro"><div><span className="motion-eyebrow">An exploration in movement</span><h1>Make the passage <em>an artwork.</em></h1></div><p>Two studies, composed for the gallery.<br />The same quiet palette. A different sense of space.</p></section>
    <div className="motion-workspace">
      <aside className="motion-directions">
        <div role="tablist" aria-label="Motion studies" aria-orientation="vertical">{studies.map(item => <button key={item.id} role="tab" id={`tab-${item.id}`} aria-selected={selected === item.id} aria-controls="motion-viewport" tabIndex={selected === item.id ? 0 : -1} onClick={() => setSelected(item.id)} onKeyDown={event => {
          if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault(); const next = event.key === "Home" ? studies[0] : event.key === "End" ? studies.at(-1) : studies.find(candidate => candidate.id !== selected);
          setSelected(next.id); document.getElementById(`tab-${next.id}`)?.focus();
        }}><span className="motion-study-number">{item.number}{item.recommended && <small>Recommended</small>}</span><strong>{item.title}</strong><span className="motion-study-subtitle">{item.subtitle}</span><span aria-hidden="true" className="motion-choice-arrow"><Symbol /></span></button>)}</div>
        <div className="motion-study-copy"><span className="motion-eyebrow">The idea</span><p>{study.description}</p><small>This study uses captured views of the current gallery on live 3D surfaces.</small></div>
        <button className="motion-export" disabled={!ready || exporting} onClick={exportStoryboard}>{exporting ? "Preparing storyboard…" : "Download Figma storyboard"}<span aria-hidden="true"><Symbol name="down" /></span></button>
      </aside>
      <section className="motion-player" aria-label={`${study.title} motion preview`}>
        <div className="motion-route"><label>From <select disabled={!ready} aria-label="Starting room" value={from} onChange={event => chooseRoom(event.target.value, true)}>{rooms.map(room => <option value={room.id} key={room.id}>{room.name}</option>)}</select></label><span aria-hidden="true">→</span><label>To <select disabled={!ready} aria-label="Destination room" value={to} onChange={event => chooseRoom(event.target.value, false)}>{rooms.map(room => <option value={room.id} key={room.id}>{room.name}</option>)}</select></label></div>
        <div id="motion-viewport" role="tabpanel" aria-labelledby={`tab-${selected}`} className="motion-viewport" ref={host}>
          {!ready && !error && <div className="motion-loading" role="status"><i />Preparing the study</div>}
          {error && <div className="motion-error" role="alert"><p>The live study could not open.</p><small>{error}</small><a href={`${base}?view=spatial`}>Return to the gallery <Symbol /></a></div>}
          {ready && <span className="motion-frame-label" aria-hidden="true">{study.number} / {study.title}</span>}
        </div>
        <div className="motion-transport"><button disabled={!ready} aria-label={playing ? "Pause motion study" : "Play motion study"} onClick={play}><span aria-hidden="true"><Symbol name={playing ? "pause" : "play"} /></span>{playing ? "Pause" : "Play study"}</button><input ref={timeline} type="range" min="0" max="1000" defaultValue="0" aria-label="Transition progress" disabled={!ready} onInput={event => { setPlaying(false); draw(Number(event.target.value) / 1000); }} /><output ref={output} aria-live="off">0%</output><button disabled={!ready} aria-label="Restart motion study" onClick={() => { setPlaying(false); draw(0); }}><Symbol name="reset" /></button></div>
        <p className="motion-scrub-hint">{reduced ? "Reduced motion is on. Use the timeline to inspect still frames." : "Drag the timeline to inspect any moment. One passage takes 3.2 seconds."}</p>
      </section>
    </div>
    <details className="motion-research"><summary>Sources, language & design notes <span aria-hidden="true">+</span></summary><div>
      <section><h2>A material language</h2><p>The proposal takes its character from the gallery’s satin sculpture and paper forms. The passage becomes a small installation with an identifiable shape.</p><p>Continuum is the recommended direction. Lamina is a more architectural alternative.</p></section>
      <section><h2>A working GPU study</h2><p>These prototypes use Three.js Shading Language (TSL), compiled to the available renderer: {backend === "webgpu" ? "WebGPU / WGSL" : backend === "webgl2" ? "WebGL 2 / GLSL" : "loading"}. They run separately from the published gallery renderer.</p><p>Figma is useful for the storyboard, timing and layout. The live geometry is evaluated here in the browser.</p></section>
      <section><h2>Primary references</h2><a href="https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language" target="_blank" rel="noreferrer">Three.js TSL specification <Symbol /></a><a href="https://github.com/codrops/CinemaSeatPreview" target="_blank" rel="noreferrer">Codrops: WebGPU cinema study <Symbol /></a><a href="https://github.com/codrops/interlude" target="_blank" rel="noreferrer">Interlude: current transition architecture <Symbol /></a><a href="https://github.com/mrdoob/three.js/blob/master/examples/jsm/geometries/ParametricFunctions.js" target="_blank" rel="noreferrer">Parametric surface reference <Symbol /></a></section>
    </div></details>
    <footer className="motion-footer"><span>Benno’s Light / Design research, November 2026</span><span>Two proposals. One visual language.</span></footer>
  </main>;
}
