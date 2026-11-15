import { useState } from "react";
import { rooms } from "./rooms";
import { RoomIllustration } from "./GalleryAtlas";

export default function RoomNavigator({ active, visited, ready, travelling, onSelect, onAtlas }) {
  const [preview, setPreview] = useState(null);
  const current = rooms.find((room) => room.id === (preview || active));
  return <nav className="room-navigator" aria-label="Move between rooms" data-travelling={Boolean(travelling)}>
    <div className="room-navigator-caption" aria-hidden="true"><span>Exhibition <i>/</i> Four spaces</span><span>{visited.length} of 4 explored</span></div>
    <div className="room-navigator-island">
      <div className="room-navigator-rail" role="group" aria-label="Exhibition rooms" onPointerLeave={() => setPreview(null)}>
        {rooms.map((room) => <button key={room.id} disabled={!ready} aria-label={`Go to ${room.name}`} aria-current={active === room.id ? "location" : undefined}
          className={`room-destination ${visited.includes(room.id) ? "was-visited" : ""}`}
          onPointerEnter={() => setPreview(room.id)} onFocus={() => setPreview(room.id)} onBlur={() => setPreview(null)}
          onClick={() => { setPreview(null); if (active !== room.id) onSelect(room.id); }}>
          <RoomIllustration room={room.id} /><span className="room-destination-number">{room.number}</span><span className="room-destination-name">{room.short}</span>
          <i aria-hidden="true" />
        </button>)}
      </div>
      <button className="atlas-launcher" title="Exhibition guide" aria-label="Open gallery atlas" aria-haspopup="dialog" disabled={!ready} onClick={onAtlas}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></svg>
      </button>
    </div>
    <div className="room-navigator-context" aria-hidden="true"><span key={current.id}>{current.number}<i>/</i>{current.name}<small>{current.description}</small></span></div>
  </nav>;
}
