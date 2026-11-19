import { rooms } from "./rooms";
import { RoomIllustration } from "./GalleryAtlas";

export default function RoomNavigator({ active, ready, travelling, onSelect, onAtlas }) {
  const current = rooms.find((room) => room.id === active);

  return (
    <nav className="room-navigator" aria-label="Move between rooms" data-travelling={Boolean(travelling)}>
      <div className="room-navigator-heading">
        <div>
          <p>{travelling ? "Entering room" : "Current room"} <span>{current.number} / {String(rooms.length).padStart(2, "0")}</span></p>
          <h2 key={current.id}>{current.name}</h2>
        </div>
        <button className="atlas-launcher" aria-label="Open gallery atlas" aria-haspopup="dialog" disabled={!ready} onClick={onAtlas}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
            <path d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z" />
          </svg>
          <span>Rooms</span>
        </button>
      </div>
      <div className="room-navigator-island">
        <div className="room-navigator-rail" role="group" aria-label="Exhibition rooms">
          {rooms.map((room) => (
            <button
              key={room.id}
              className="room-destination"
              disabled={!ready}
              aria-label={`Go to ${room.name}`}
              aria-current={active === room.id ? "location" : undefined}
              onClick={() => { if (active !== room.id) onSelect(room.id); }}
            >
              <RoomIllustration room={room.id} />
              <span className="room-destination-name">{room.short}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
