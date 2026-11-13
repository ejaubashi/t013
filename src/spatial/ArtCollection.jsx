import { useEffect, useRef, useState } from "react";
import { artworks } from "./artworks";
import { rooms } from "./rooms";
import { useDialogMotion } from "./useDialogMotion";

const asset = (name) => `${import.meta.env.BASE_URL}assets/${name}`;
const roomName = (id) => rooms.find((room) => room.id === id).name;

export default function ArtCollection({ initialArtwork, onClose, onViewOnWall }) {
  const ref = useRef(null), titleRef = useRef(null), mediaRef = useRef(null), lastArtwork = useRef(initialArtwork);
  const [selected, setSelected] = useState(initialArtwork), [filter, setFilter] = useState("all");
  const [zoomed, setZoomed] = useState(false), [loaded, setLoaded] = useState("");
  const drag = useRef(null);
  const { close } = useDialogMotion(ref, onClose);
  const visible = artworks.filter((art) => filter === "all" || art.room === filter);
  const artwork = artworks.find((art) => art.id === selected);
  const index = artwork ? visible.findIndex((art) => art.id === artwork.id) : -1;
  const select = (id) => { setZoomed(false); setSelected(id); };
  const next = (direction) => select(visible[(index + direction + visible.length) % visible.length].id);

  useEffect(() => {
    if (selected) {
      lastArtwork.current = selected;
      titleRef.current?.focus({ preventScroll: true });
      mediaRef.current?.scrollTo(0, 0);
    } else if (lastArtwork.current) {
      ref.current.querySelector(`[data-artwork="${lastArtwork.current}"]`)?.focus({ preventScroll: true });
    }
  }, [selected]);

  const zoom = () => {
    setZoomed((value) => !value);
    requestAnimationFrame(() => mediaRef.current?.focus({ preventScroll: true }));
  };
  return <dialog ref={ref} className={`art-collection-dialog ${artwork ? "is-detail" : ""}`} aria-labelledby="art-collection-title"
    onCancel={(event) => { event.preventDefault(); close(); }}
    onClick={(event) => { if (event.target === event.currentTarget) close(); }}
    onKeyDown={(event) => {
      if (!artwork || zoomed || event.target.matches("input,textarea,select")) return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); next(event.key === "ArrowRight" ? 1 : -1); }
    }}>
    <header className="art-collection-header">
      <div>
        {artwork && <button className="art-back" aria-label="Back to art collection" onClick={() => select(null)}>← All artworks</button>}
        <span className="art-eyebrow">{artwork ? `On view in ${roomName(artwork.room)}` : "Light, colour & landscape"}</span>
        <h2 id="art-collection-title" ref={titleRef} tabIndex={-1}>{artwork ? artwork.title : "The art collection."}</h2>
      </div>
      <button autoFocus className="art-collection-close" aria-label="Close art collection" onClick={() => close()}>×</button>
    </header>
    {artwork ? <div className="artwork-detail">
      <div className="artwork-image-column">
        <div ref={mediaRef} className={`artwork-media ${zoomed ? "is-zoomed" : ""}`} tabIndex={zoomed ? 0 : -1}
          aria-label={zoomed ? "Enlarged artwork. Scroll or drag to explore." : artwork.title}
          onPointerDown={(event) => {
            if (!zoomed || event.pointerType !== "mouse") return;
            event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop };
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            event.currentTarget.scrollLeft = drag.current.left + drag.current.x - event.clientX;
            event.currentTarget.scrollTop = drag.current.top + drag.current.y - event.clientY;
          }}
          onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
          {loaded !== artwork.id && <span className="art-image-loading" role="status">Loading artwork</span>}
          <img key={artwork.id} src={asset(artwork.image)} alt={`${artwork.title}, ${artwork.artist}, ${artwork.date}`}
            className={loaded === artwork.id ? "is-loaded" : ""} onLoad={() => setLoaded(artwork.id)} draggable="false" />
        </div>
        <div className="artwork-image-tools">
          <button aria-label="Previous artwork" onClick={() => next(-1)}>←</button>
          <span>{String(index + 1).padStart(2, "0")} / {String(visible.length).padStart(2, "0")}</span>
          <button className="artwork-zoom" aria-label={zoomed ? "Fit artwork" : "Zoom artwork"} aria-pressed={zoomed} onClick={zoom}>{zoomed ? "− Fit image" : "+ Look closer"}</button>
          <button aria-label="Next artwork" onClick={() => next(1)}>→</button>
        </div>
      </div>
      <section className="artwork-label" aria-label="Artwork information">
        <p className="artwork-artist">{artwork.artist}</p>
        <dl><div><dt>Date</dt><dd>{artwork.date}</dd></div><div><dt>Medium</dt><dd>{artwork.medium}</dd></div><div><dt>Original collection</dt><dd>{artwork.collection}</dd></div></dl>
        <p className="artwork-description">{artwork.description}</p>
        <button className="art-view-on-wall" onClick={() => close(() => onViewOnWall(artwork.id))}>View on the wall <span aria-hidden="true">↗</span></button>
        <p className="artwork-rights">{artwork.reproduction}</p>
        <div className="artwork-sources"><a href={artwork.source} target="_blank" rel="noreferrer">Source image ↗</a><a href={asset("artworks/CC0-1.0.txt")} target="_blank" rel="noreferrer">Image license ↗</a></div>
      </section>
    </div> : <>
      <div className="art-collection-filters" role="group" aria-label="Filter artworks by room">
        {[{ id: "all", short: "All rooms" }, ...rooms].map((room) => <button key={room.id} aria-pressed={filter === room.id} onClick={() => setFilter(room.id)}>{room.short}</button>)}
      </div>
      <div className="art-collection-grid">
        {visible.map((art) => <button key={art.id} data-artwork={art.id} className="art-collection-card" aria-label={`Inspect ${art.title} by ${art.artist}`} onClick={() => select(art.id)}>
          <div><img src={asset(art.wallImage)} alt="" loading="lazy" /></div>
          <span className="art-card-location">{roomName(art.room)} <span>{art.number}</span></span>
          <h3>{art.title}</h3><p>{art.artist} <span>· {art.date}</span></p>
        </button>)}
      </div>
      <footer className="art-collection-footer"><span>{visible.length} works on the walls</span><span>Digital reproductions of public-domain paintings.</span></footer>
    </>}
  </dialog>;
}
