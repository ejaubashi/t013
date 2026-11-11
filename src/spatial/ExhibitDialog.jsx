import { useEffect, useRef } from "react";

function ActionArrow() {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" /></svg>;
}

export default function ExhibitDialog({ exhibit, onClose, onNavigate, onEnter }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="exhibit-dialog"
      aria-labelledby="exhibit-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="exhibit-dialog-controls"><button autoFocus className="exhibit-close" aria-label="Close photograph" onClick={onClose}>×</button></div>
      <div className="exhibit-dialog-body">
        <div className="exhibit-media">
          <img src={`${import.meta.env.BASE_URL}assets/${exhibit.name}`} alt={exhibit.title} />
        </div>
        <div className="exhibit-copy">
          <span className="spatial-kicker">Benno’s Light · The photographic archive</span>
          <h2 id="exhibit-title">{exhibit.title}</h2>
          <p>{exhibit.description}</p>
          <button className="exhibit-action" onClick={onNavigate}>View in the room <ActionArrow /></button>
          {exhibit.id === "testimony" && <button className="exhibit-action" onClick={onEnter}>Listen to Benno <ActionArrow /></button>}
          <span className="exhibit-footnote">A life remembered. A voice still here.</span>
        </div>
      </div>
    </dialog>
  );
}
