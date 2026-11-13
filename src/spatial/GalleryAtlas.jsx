import { useRef } from "react";
import { rooms } from "./rooms";
import { useDialogMotion } from "./useDialogMotion";

export function RoomIllustration({ room, className = "" }) {
  return <svg className={`room-illustration ${className}`} viewBox="0 0 200 150" fill="none" aria-hidden="true">
    {room === "pavilion" && <g stroke="currentColor" strokeWidth="0.8">
      {Array.from({ length: 12 }, (_, i) => <ellipse key={i} cx="100" cy="75" rx="62" ry="22" transform={`rotate(${i * 15} 100 75)`} />)}
      <circle cx="100" cy="75" r="5" fill="currentColor" />
    </g>}
    {room === "orbit" && <g stroke="currentColor" strokeWidth="1.1">
      {Array.from({ length: 7 }, (_, i) => <ellipse key={i} cx="100" cy="75" rx="57" ry={12 + i * 6} transform={`rotate(${i * 24} 100 75)`} />)}
    </g>}
    {room === "garden" && <g fill="currentColor">
      {Array.from({ length: 64 }, (_, i) => {
        const t = i / 63, a = t * Math.PI * 6, r = 19 + Math.sin(t * Math.PI) * 40;
        const x = 100 + Math.cos(a) * r, y = 128 - t * 106;
        return <ellipse key={i} cx={x} cy={y} rx="5" ry="2" opacity={0.45 + (i % 5) * 0.12} transform={`rotate(${i * 23} ${x} ${y})`} />;
      })}
    </g>}
    {room === "prism" && <g stroke="currentColor" strokeWidth="1">
      <path d="m100 12 30 70-30 56-30-56Z M100 12v126M70 82h60M100 12l-12 70 12 56 12-56Z" />
      <path d="m57 43 14 45-21 39-17-42Z M57 43l-7 84-17-42 38 3M145 36l22 46-16 43-24-41Z M145 36l6 89 16-43-40 2" />
    </g>}
  </svg>;
}

const mapPositions = [{ x: 8, y: 8 }, { x: 55, y: 8 }, { x: 8, y: 55 }, { x: 55, y: 55 }];

export default function GalleryAtlas({ activeRoom, visited, onSelect, onClose, onJourney }) {
  const ref = useRef(null);
  const { close, dragProps } = useDialogMotion(ref, onClose);
  const select = (id) => close(() => onSelect(id));
  const startJourney = () => close(onJourney);
  return <dialog ref={ref} className="gallery-atlas" aria-labelledby="atlas-title" onCancel={(event) => { event.preventDefault(); close(); }}
    onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <header className="atlas-header" {...dragProps}>
      <div><span className="atlas-eyebrow">Benno’s Light / Exhibition guide</span><h2 id="atlas-title">An atlas <em>of light.</em></h2></div>
      <button className="atlas-close" autoFocus aria-label="Close gallery atlas" onClick={() => close()}>×</button>
    </header>
    <div className="atlas-body">
      <section className="atlas-plan-section" aria-label="Exhibition floor plan">
        <div className="atlas-plan-heading"><span>Four spaces. One story.</span><span>{visited.length} / {rooms.length} explored</span></div>
        <div className="atlas-plan">
          <svg className="atlas-corridors" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M29 29H74V74H29V29M29 74 74 29" /></svg>
          {rooms.map((room, index) => <button key={room.id} className={`atlas-map-room ${activeRoom === room.id ? "is-current" : ""}`}
            style={{ left: `${mapPositions[index].x}%`, top: `${mapPositions[index].y}%` }} aria-label={`Map: enter ${room.name}`} onClick={() => select(room.id)}>
            <span className="atlas-map-number">{room.number}</span><RoomIllustration room={room.id} /><span>{room.short}</span>
          </button>)}
          <span className="atlas-north" aria-hidden="true">N ↑</span>
        </div>
        <p className="atlas-plan-note">Choose a room. Follow your curiosity.<br />You can return to Benno’s story at any time.</p>
      </section>
      <nav className="atlas-room-list" aria-label="Gallery rooms">
        {rooms.map((room) => <button key={room.id} className={`atlas-room-card atlas-${room.id}`} aria-label={`Enter ${room.name}`}
          aria-pressed={activeRoom === room.id} onClick={() => select(room.id)}>
          <div className="atlas-card-art"><RoomIllustration room={room.id} /></div>
          <div className="atlas-card-copy"><span className="atlas-card-number">Room {room.number} <i>{activeRoom === room.id ? "You are here" : visited.includes(room.id) ? "Explored" : "Discover"}</i></span>
            <h3>{room.name}</h3><p>{room.description}</p></div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" /></svg>
        </button>)}
      </nav>
    </div>
    <footer className="atlas-footer"><span>Take your time.<br /><small>An imagined gallery for a life remembered.</small></span><button onClick={startJourney}>Follow the guided journey <span aria-hidden="true">→</span></button></footer>
  </dialog>;
}
