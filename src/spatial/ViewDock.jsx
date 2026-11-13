import { useLayoutEffect, useRef } from "react";

export default function ViewDock({ views, active, ready, onSelect, reducedMotion }) {
  const ref = useRef(null);
  const selected = Math.max(0, views.findIndex((view) => view.id === active));
  useLayoutEffect(() => {
    const nav = ref.current, rail = nav.firstElementChild;
    let live = true;
    const measure = () => {
      if (!live) return;
      const button = rail.querySelector('[aria-pressed="true"]');
      if (!button) return;
      rail.style.setProperty("--dock-x", `${button.offsetLeft}px`);
      rail.style.setProperty("--dock-width", `${button.offsetWidth}px`);
      if (button.offsetLeft < nav.scrollLeft || button.offsetLeft + button.offsetWidth > nav.scrollLeft + nav.clientWidth - 12) nav.scrollTo({
        left: button.offsetLeft - (nav.clientWidth - button.offsetWidth) / 2,
        behavior: reducedMotion ? "instant" : "smooth",
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    observer.observe(nav);
    document.fonts?.ready.then(measure);
    return () => { live = false; observer.disconnect(); };
  }, [active, views.length, reducedMotion]);

  const keydown = (event, index) => {
    const next = { ArrowLeft: (index + views.length - 1) % views.length,
      ArrowRight: (index + 1) % views.length, Home: 0, End: views.length - 1 }[event.key];
    if (next === undefined || !ready) return;
    event.preventDefault();
    ref.current.querySelectorAll("button")[next].focus({ preventScroll: true });
    onSelect(views[next].id);
  };
  return <nav ref={ref} className="room-viewpoints gallery-view-dock" aria-label="Room viewpoints">
    <div className="view-dock-rail" role="toolbar" aria-label="Choose a viewpoint" aria-orientation="horizontal">
      <span className="view-dock-indicator" aria-hidden="true" />
      {views.map((view, index) => <button key={view.id} aria-label={`${String(index + 1).padStart(2, "0")} ${view.label}`}
        aria-pressed={active === view.id} tabIndex={selected === index ? 0 : -1} disabled={!ready}
        onClick={() => onSelect(view.id)} onKeyDown={(event) => keydown(event, index)}>
        <span className="view-dock-index">{String(index + 1).padStart(2, "0")}</span><span>{view.label}</span>
      </button>)}
    </div>
  </nav>;
}
