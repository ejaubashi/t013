import { useEffect, useRef } from "react";

const Steps = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" aria-hidden="true"><path d="m8 3 2 5-3 2-2-5Zm8 7 2 5-3 2-2-5ZM6 13l2 5-3 2-2-5Zm10 6 1 3" /></svg>;

export function WalkModeSwitch({ mode, ready, onChange }) {
  return <div className={`walk-mode-switch mode-${mode}`} role="group" aria-label="Gallery navigation mode">
    <button disabled={!ready} aria-label="Walk in first person" aria-pressed={mode === "walk"} onClick={() => onChange("walk")}>
      <Steps /><span>Walk</span>
    </button>
    <button disabled={!ready} aria-label="Switch to composed views" aria-pressed={mode === "views"} onClick={() => onChange("views")}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" aria-hidden="true"><path d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z" /></svg><span>Views</span>
    </button>
  </div>;
}

export default function WalkControls({ arriving, learned, room, onMove, onSkip }) {
  const stick = useRef(null), pointer = useRef(null);
  const move = useRef(onMove); move.current = onMove;
  const reset = () => {
    pointer.current = null; move.current(0, 0);
    stick.current?.style.setProperty("--thumb-x", "0px"); stick.current?.style.setProperty("--thumb-y", "0px");
  };
  useEffect(() => {
    window.addEventListener("blur", reset);
    return () => { window.removeEventListener("blur", reset); move.current(0, 0); };
  }, []);
  const position = (event) => {
    const rect = stick.current.getBoundingClientRect(), dx = event.clientX - rect.x - rect.width / 2, dy = event.clientY - rect.y - rect.height / 2;
    const length = Math.hypot(dx, dy), scale = length > 26 ? 26 / length : 1;
    stick.current.style.setProperty("--thumb-x", `${dx * scale}px`); stick.current.style.setProperty("--thumb-y", `${dy * scale}px`);
    move.current(dx * scale / 26, -dy * scale / 26);
  };
  return <>
    <div className={`walk-invitation ${arriving ? "is-arriving" : ""} ${learned && !arriving ? "is-learned" : ""}`}>
      <span className="walk-location">{room.number} / {room.name}</span>
      {arriving ? <><p>Walk into the light.</p><button onClick={onSkip}>Explore now <span aria-hidden="true">↗</span></button></> :
        <><p>Make the space your own.</p><span className="walk-desktop-hint">Drag to look · Scroll or click the floor to walk</span><span className="walk-touch-hint">Drag to look · Use the thumbstick to walk</span></>}
    </div>
    <button ref={stick} className="walk-thumbstick" aria-label="Walking thumbstick. Drag to move." aria-describedby="walk-thumb-hint"
      onPointerDown={(event) => {
        event.preventDefault(); if (pointer.current !== null) return;
        pointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); position(event);
      }}
      onPointerMove={(event) => { if (pointer.current === event.pointerId) position(event); }}
      onPointerUp={(event) => { if (pointer.current === event.pointerId) reset(); }}
      onPointerCancel={(event) => { if (pointer.current === event.pointerId) reset(); }}
      onLostPointerCapture={(event) => { if (pointer.current === event.pointerId) reset(); }}
      onKeyDown={(event) => {
        const direction = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[event.key];
        if (direction) { event.preventDefault(); move.current(...direction); }
      }} onKeyUp={reset} onBlur={reset}>
      <span className="walk-thumb-guides" aria-hidden="true">+<i /><i /></span><span className="walk-thumb-knob" aria-hidden="true"><Steps /></span>
    </button>
    <span id="walk-thumb-hint" className="sr-only">Move the thumbstick while dragging the gallery with your other hand to look around. Arrow keys also move.</span>
  </>;
}
