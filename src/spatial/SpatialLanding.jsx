import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { viewpoints } from "./viewpoints";
import { journey, artForms } from "./journey";
import { exhibits } from "./exhibits";
import { artworks } from "./artworks";
import ArtCollection from "./ArtCollection";
import WalkControls, { WalkModeSwitch } from "./WalkControls";
import ExhibitDialog from "./ExhibitDialog";
import GalleryAtlas from "./GalleryAtlas";
import ViewDock from "./ViewDock";
import RoomNavigator from "./RoomNavigator";
import { useControlsMotion } from "./useControlsMotion";
import { useDockMorph } from "./useDockMorph";
import { useGalleryAudio } from "./useGalleryAudio";
import { rooms, roomForView } from "./rooms";
import "./spatial.css";
import "./atrium.css";
import "./journey.css";
import "./rooms.css";
import "./exhibition.css";
import "./transitions.css";
import "./navigation.css";
import "./artworks.css";
import "./walking.css";
import "./minimal.css";
import "./spatial-interface.css";
import "./nocturne.css";
import "./gallery-visit.css";

const RoomCanvas = lazy(() => import("./RoomCanvas"));

function Arrow({ direction = "up-right" }) {
  const path = {
    "up-right": "M5 19 19 5M5 5h14v14",
    up: "M12 20V4m-6 6 6-6 6 6",
    down: "M12 4v16m-6-6 6 6 6-6",
    left: "M20 12H4m6-6-6 6 6 6",
    right: "M4 12h16m-6-6 6 6-6 6",
  }[direction];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

export default function SpatialLanding({
  onEnter,
  onChapters,
  onOriginal,
  reducedMotion,
  soundControlRef,
  onSoundChange,
}) {
  const controls = useRef(null), dockLayer = useRef(null);
  const morphDock = useDockMorph(dockLayer, reducedMotion);
  const [ready, setReady] = useState(false),
    [progress, setProgress] = useState(0);
  const [error, setError] = useState(""),
    [active, setActive] = useState("arrival");
  const [help, setHelp] = useState(false),
    [capture, setCapture] = useState("");
  const [loadingCapture, setLoadingCapture] = useState(false),
    [captureError, setCaptureError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [night, setNight] = useState(true);
  const [artForm, setArtForm] = useState(2);
  const [journeyStep, setJourneyStep] = useState(null);
  const [selectedExhibit, setSelectedExhibit] = useState(null);
  const [exhibitPositions, setExhibitPositions] = useState([]);
  const [activeRoom, setActiveRoom] = useState("pavilion");
  const currentRoom = rooms.find((room) => room.id === activeRoom);
  const roomViews = viewpoints.filter((view) => roomForView(view) === activeRoom);
  const inputRef = useRef(null);
  const toolboxRef = useRef(null), focusTriggerRef = useRef(null);
  const restoreArtFocus = useRef(false);
  const [atlas, setAtlas] = useState(false), [focused, setFocused] = useState(false);
  const [visited, setVisited] = useState(["pavilion"]);
  const [spectrum, setSpectrum] = useState(0.5);
  const [travel, setTravel] = useState(null), [travelNotice, setTravelNotice] = useState("");
  const [interacting, setInteracting] = useState(false);
  const [collection, setCollection] = useState(null);
  const [navigation, setNavigation] = useState({ mode: "walk", arriving: false });
  const [walkLearned, setWalkLearned] = useState(false);
  const [entranceLeaving, setEntranceLeaving] = useState(false);
  const [entered, setEntered] = useState(() => {
    try { return sessionStorage.getItem("benno-nocturne-entered") === "1" || rooms.some(room => room.id === new URLSearchParams(location.search).get("room")); }
    catch { return false; }
  });
  const audio = useGalleryAudio(soundControlRef, onSoundChange);
  const enterGallery = withSound => {
    audio.enable(withSound);
    try { sessionStorage.setItem("benno-nocturne-entered", "1"); } catch {}
    setEntranceLeaving(true); setEntered(true); controls.current?.beginVisit();
    requestAnimationFrame(() => controls.current?.focus());
  };
  const controlsMotion = useControlsMotion(toolboxRef, () => controls.current?.stopJourney());
  const closeFocus = () => { restoreArtFocus.current = true; setFocused(false); };
  useEffect(() => {
    if (!focused && restoreArtFocus.current) {
      // The same visible toggle is retained in both modes; return to it when
      // Escape is used after the visitor has focused the canvas.
      const frame = requestAnimationFrame(() => {
        restoreArtFocus.current = false;
        focusTriggerRef.current?.focus({ preventScroll: true });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [focused]);
  useEffect(() => {
    if (!focused) return;
    const escape = (event) => { if (event.key === "Escape") { event.preventDefault(); closeFocus(); } };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [focused]);
  const openAtlas = () => { controls.current?.stopJourney(); if (toolboxRef.current) toolboxRef.current.open = false; setAtlas(true); };
  const selectRoom = (id) => { setAtlas(false); controls.current?.enterRoom(id); };
  const choose = (id) => {
    controls.current?.navigate(id);
    setActive(id);
  };
  const enterStory = () => {
    controls.current?.stopJourney();
    setSelectedExhibit(null);
    onEnter();
  };
  const openExhibit = (id) => {
    controls.current?.stopJourney();
    setFocused(false);
    setSelectedExhibit(exhibits.find((exhibit) => exhibit.id === id));
  };
  const openCollection = (id = "all") => {
    controls.current?.stopJourney();
    setFocused(false);
    if (toolboxRef.current) toolboxRef.current.open = false;
    setCollection(id);
  };
  const step = (x, y) => (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    controls.current?.move(x, y);
  };
  const movementProps = (x, z) => ({
    onPointerDown: step(x, z),
    onPointerUp: () => controls.current?.move(0, 0),
    onPointerCancel: () => controls.current?.move(0, 0),
    onLostPointerCapture: () => controls.current?.move(0, 0),
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        controls.current?.move(x, z);
      }
    },
    onKeyUp: () => controls.current?.move(0, 0),
    onBlur: () => controls.current?.move(0, 0),
  });
  const importCapture = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCaptureError("");
    if (!/\.(spz|splat|ply)$/i.test(file.name)) {
      setCaptureError("Choose a .spz, .splat, or .ply scene.");
      return;
    }
    if (file.size > 90 * 1024 * 1024) {
      setCaptureError("Choose a scene smaller than 90 MB for this preview.");
      return;
    }
    setLoadingCapture(true);
    try {
      await controls.current.loadCapture(file);
      setCapture(file.name);
      setActive("arrival");
    } catch {
      setCaptureError(
        "That file could not be opened. The archive room is still available.",
      );
    } finally {
      setLoadingCapture(false);
    }
  };
  const retry = () => {
    setError("");
    setReady(false);
    setProgress(0);
    setCapture("");
    setNight(true);
    setArtForm(2);
    setJourneyStep(null);
    setSelectedExhibit(null);
    setExhibitPositions([]);
    setActiveRoom("pavilion");
    setActive("arrival");
    setVisited(["pavilion"]); setAtlas(false); setFocused(false); setSpectrum(0.5);
    setTravel(null); setTravelNotice("");
    setInteracting(false);
    setCollection(null);
    setNavigation({ mode: "walk", arriving: false }); setWalkLearned(false);
    setAttempt((n) => n + 1);
  };
  return (
    <main data-sound={audio.enabled ? "on" : "off"} className={`spatial-stage ${entered ? "has-entered" : "is-before-entry"} gallery-${activeRoom} ${navigation.mode === "walk" && !capture ? "is-walking" : ""} ${focused ? "is-focus" : ""} ${interacting ? "is-interacting" : ""} ${travel ? "is-travelling" : ""} ${ready ? "room-ready" : ""} ${night ? "after-hours" : ""} ${journeyStep !== null ? "is-journey" : ""}`}>
      <div className="spatial-fallback" aria-hidden="true" />
      <Suspense fallback={null}>
        <RoomCanvas
          key={attempt}
          controlRef={controls}
          reducedMotion={reducedMotion}
          entered={entered}
          audioControl={audio}
          onReady={() => {
            setReady(true);
            const destination = new URLSearchParams(location.search).get("room");
            if (rooms.some((room) => room.id === destination)) {
              setVisited([destination]);
              controls.current?.enterRoom(destination, { instant: true });
            }
          }}
          onProgress={setProgress}
          onError={(message) => { setError(message); setFocused(false); setAtlas(false); setTravel(null); setInteracting(false); }}
          onInteractionChange={setInteracting}
          onNavigationChange={setNavigation}
          onWalkInput={() => setWalkLearned(true)}
          onExhibitSelect={openExhibit}
          onArtworkSelect={openCollection}
          onRoomChange={({ id, view }) => {
            setActiveRoom(id); setActive(view); setHelp(false); audio.setRoom(id);
            if (toolboxRef.current) toolboxRef.current.open = false;
            setVisited((previous) => previous.includes(id) ? previous : [...previous, id]);
          }}
          onRoomTransition={(event) => {
            setTravel(event.active ? event : null); if (event.active) audio.passage();
            const destination = rooms.find((room) => room.id === event.to);
            setTravelNotice(event.active ? `Entering ${destination.name}. Press Escape to skip the transition.` : `You are now in ${destination.name}.`);
          }}
          onExhibitPositions={(next) => setExhibitPositions((previous) => {
            if (previous.length === next.length && previous.every((point, index) =>
              point.id === next[index].id && point.visible === next[index].visible &&
              Math.abs(point.x - next[index].x) < 0.75 && Math.abs(point.y - next[index].y) < 0.75)) return previous;
            return next;
          })}
          onJourneyChange={(step) => {
            setJourneyStep(step?.index ?? null);
            if (step) { setActive(step.view); setNight(step.night); setArtForm(step.form); }
          }}
        />
      </Suspense>
      <div className="spatial-vignette" aria-hidden="true" />
      {(!entered || entranceLeaving) && !error && (
        <section
          className={`nocturne-entrance ${entranceLeaving ? "is-leaving" : ""}`}
          aria-labelledby="nocturne-title"
          inert={entered ? true : undefined}
          aria-hidden={entered || undefined}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget && entranceLeaving) setEntranceLeaving(false);
          }}
        >
          <div className="nocturne-entry-copy">
            <p className="nocturne-entry-index">Nocturne exhibition</p>
            <h1 id="nocturne-title">After <em>hours.</em></h1>
            <p className="nocturne-entry-description">Walk through four rooms of art and light, and hear Benno Kern’s story in his own words.</p>
            <div className="nocturne-entry-actions">
              <button className="entry-primary" disabled={!ready} onClick={() => enterGallery(false)}>Enter quietly <Arrow direction="right" /></button>
              <button className="entry-sound" disabled={!ready} onClick={() => enterGallery(true)}>Enter with sound <Arrow direction="right" /></button>
            </div>
            <div className="nocturne-entry-status" role="status">
              {ready ? "Sound can be changed during your visit." : "Preparing the gallery…"}
            </div>
            <div className="nocturne-entry-progress" aria-hidden="true" hidden={ready}>
              <span style={{ "--load-progress": `${Math.max(4, progress)}%` }} />
            </div>
          </div>
        </section>
      )}
      {audio.message && <span className="nocturne-audio-notice" role="status">{audio.message}</span>}

      <span className="sr-only" role="status" aria-live="polite">{travelNotice}</span>
      {travel && <aside className="room-transit-hud" aria-label="Room transition">
        <div><span className="transit-label">Moving through light</span><span className="transit-origin">{rooms.find((room) => room.id === travel.from).short}</span>
          <span className="transit-direction" aria-hidden="true"><Arrow direction="right" /></span>
          <strong>{rooms.find((room) => room.id === travel.to).name}</strong></div>
        <button aria-label="Skip room transition" onClick={() => controls.current?.skipRoomTransition()}>Skip <Arrow /></button>
      </aside>}
      {!error && !capture && ready && (
        <div className="room-exhibit-hotspots" aria-label="Explore the gallery">
          {exhibitPositions.filter((point) => point.visible).map((point) => {
            if (point.room) {
              const destination = rooms.find((room) => room.id === point.room);
              return <button key={point.id} className="room-portal-hotspot" style={{ left: point.x, top: point.y }}
                aria-label={`Door to ${destination.name}`} onClick={() => controls.current?.approachDoor(point.room)}>
                <span aria-hidden="true"><Arrow /></span><span>{destination.name}</span>
              </button>;
            }
            if (point.artwork) {
              const artwork = artworks.find((item) => item.id === point.artwork);
              return <button key={point.id} className="room-exhibit-hotspot room-artwork-hotspot" style={{ left: point.x, top: point.y }}
                aria-label={`View ${artwork.title} by ${artwork.artist}`} onClick={() => openCollection(artwork.id)}>
                <span aria-hidden="true"><Arrow /></span><span className="hotspot-title">{artwork.artist} · {artwork.title}</span>
              </button>;
            }
            const exhibit = exhibits.find((item) => item.id === point.id);
            return <button key={point.id} className="room-exhibit-hotspot" style={{ left: point.x, top: point.y }}
              aria-label={exhibit.label} onClick={() => openExhibit(point.id)}>
              <span aria-hidden="true">+</span><span className="hotspot-title">{exhibit.title}</span>
            </button>;
          })}
        </div>
      )}
      {!error && !capture && <RoomNavigator active={activeRoom} ready={ready} travelling={travel}
        onSelect={(id) => controls.current?.enterRoom(id)} onAtlas={openAtlas} />}
      {!error && (
        <nav className="gallery-story-links" aria-label="Benno’s story">
          <button className="room-listen" aria-label="Open Benno’s memories" onClick={enterStory}>Testimony <Arrow /></button>
          <button className="spatial-chapters" aria-label="Explore all chapters" onClick={() => { controls.current?.stopJourney(); onChapters(); }}>Chapters <Arrow /></button>
          <button className="spatial-original" onClick={onOriginal}>Original view <Arrow /></button>
        </nav>
      )}
      {!error && <button ref={focusTriggerRef} className={`gallery-focus-toggle ${focused ? "gallery-focus-exit" : ""}`}
          title={focused ? "Return to gallery interface" : "Just the art"}
          aria-label={focused ? "Return to gallery interface" : "View artwork without interface"} aria-pressed={focused} disabled={!ready}
          onClick={() => {
            if (focused) { closeFocus(); return; }
            controls.current?.stopJourney(); if (toolboxRef.current) toolboxRef.current.open = false; setFocused(true);
          }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" /></svg><span>Just the art</span>
          {focused && <span className="focus-exit-label">Exit art view ×</span>}
        </button>}
      {!error && entered && !ready && (
        <div className="room-loader" role="status">
          <span className="room-loader-mark" />
          <span>Opening the gallery</span>
          <span className="room-load-progress">{progress}%</span>
        </div>
      )}
      {error && (
        <div className="room-error" role="alert">
          <span className="spatial-kicker">A different way in</span>
          <h2>
            The story is
            <br />
            still here.
          </h2>
          <p>{error}</p>
          <div>
            <button onClick={retry}>
              Try 3D again <Arrow />
            </button>
            <button onClick={onOriginal}>
              Open original view <Arrow />
            </button>
          </div>
        </div>
      )}
      {!error && (
        <>
          {capture && <div className="room-view-label capture-view-label" aria-live="polite">
            <span>Your capture</span>
            <strong>{capture}</strong>
          </div>}
          {journeyStep !== null && (
            <aside className="room-journey-card" aria-label="Guided journey" aria-live="polite">
              <span className="spatial-kicker">Guided tour · {journeyStep + 1} / {journey.length}</span>
              <div className="journey-stops" style={{ "--journey-count": journey.length }} aria-hidden="true">{journey.map((_, index) => <i key={index} className={index <= journeyStep ? "visited" : ""} />)}</div>
              <h2 key={journeyStep}>{journey[journeyStep].title}</h2>
              <p>{journey[journeyStep].text}</p>
              <div className="journey-actions">
                <button disabled={journeyStep === 0} aria-label="Previous journey stop" onClick={() => controls.current?.advanceJourney(-1)}>←</button>
                <button aria-label="Stop guided journey" onClick={() => controls.current?.stopJourney()}>Stop journey</button>
                <button aria-label="Next journey stop" onClick={() => controls.current?.advanceJourney(1)}>→</button>
              </div>
            </aside>
          )}
          <div ref={dockLayer} className="gallery-navigation-layer">
          <div className={`gallery-navigation ${capture ? "is-capture" : ""}`}>
          {!capture && <button className="gallery-collection-launch" disabled={!ready} aria-label="Browse wall artworks" onClick={() => openCollection()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M3 5h18v14H3zM6 8h12v8H6z" /></svg>
            <span className="collection-dock-label">Artworks</span>
          </button>}
          {!capture && <WalkModeSwitch mode={navigation.mode} ready={ready} touring={journeyStep !== null} onChange={() => morphDock(() => controls.current?.setNavigation("walk"))} onTour={() => morphDock(() => journeyStep !== null ? controls.current?.stopJourney() : controls.current?.startJourney())} />}
          {!capture && navigation.mode === "views" && <ViewDock views={roomViews} active={active} ready={ready} onSelect={choose} reducedMotion={reducedMotion} />}
          <details className="gallery-toolbox" ref={toolboxRef} onToggle={controlsMotion.onToggle} onKeyDown={controlsMotion.onKeyDown}>
            <summary aria-label="Gallery controls" onClick={controlsMotion.onSummaryClick}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M4 7h16M4 17h16M9 4v6m6 4v6" /></svg><span className="controls-label">Controls</span><span className="controls-symbol" aria-hidden="true">+</span></summary>
            <div className="gallery-controls-panel">
              <p className="controls-eyebrow">Gallery controls</p>
          {!capture && (
            <>
              <button
                className="room-lighting"
                aria-label="After-hours lighting"
                aria-pressed={night}
                disabled={!ready}
                onClick={() => {
                  controls.current?.setLighting(!night);
                  setNight(!night);
                }}
              >
                <span className="lighting-symbol" aria-hidden="true">{night ? "☾" : "☼"}</span>
                {night ? "Nocturne lighting" : "Exhibition lighting"}
                <span className="lighting-switch" aria-hidden="true" />
              </button>
              {activeRoom === "pavilion" && <button
                className="room-art-form"
                aria-label="Transform the installation"
                data-form={artForms[artForm].toLowerCase()}
                aria-describedby="art-form-description"
                disabled={!ready}
                onClick={() => {
                  const next = (artForm + 1) % artForms.length;
                  controls.current?.setArtForm(next);
                  setArtForm(next);
                }}
              >
                <span className="art-form-symbol" aria-hidden="true">✧</span>
                Light installation
                <span className="art-form-state">{artForms[artForm]}</span>
                <span id="art-form-description" className="sr-only">Current form: {artForms[artForm]}</span>
              </button>}
            </>
          )}
              {!capture && activeRoom === "prism" && <label className="spectrum-control">Light spectrum <span>{Math.round(spectrum * 100)}%</span>
                <input type="range" min="0" max="100" value={Math.round(spectrum * 100)} aria-label="Spectrum position" onChange={(event) => {
                  const value = Number(event.target.value) / 100; setSpectrum(value); controls.current?.setSpectrum(value);
                }} />
                <small>Crimson, violet and a quieter light.</small>
              </label>}
          <div className="room-tools">
            <button
              onClick={() => {
                controls.current?.reset();
                setActive(currentRoom.entry);
              }}
              disabled={!ready}
              aria-label="Reset room view"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M4 9a8 8 0 1 1 0 6M4 3v6h6" />
              </svg>
            </button>
            <button
              aria-label="Room navigation help"
              aria-expanded={help}
              onClick={() => { controls.current?.stopJourney(); setHelp(!help); }}
            >
              ?
            </button>
            <button
              aria-label="Open a captured 3D scene"
              disabled={!ready || loadingCapture}
              onClick={() => { controls.current?.stopJourney(); inputRef.current?.click(); }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M12 15V3m-4 4 4-4 4 4M4 14v6h16v-6" />
              </svg>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".spz,.splat,.ply"
              onChange={importCapture}
              className="sr-only"
              aria-label="Captured scene file"
            />
            {capture && (
              <button
                onClick={() => controls.current?.flip()}
                aria-label="Flip capture orientation"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="M7 21V3m-4 4 4-4 4 4m6-4v18m-4-4 4 4 4-4" />
                </svg>
              </button>
            )}
          </div>
          {help && (
            <aside className="room-help">
              <button
                className="room-help-close"
                onClick={() => setHelp(false)}
                aria-label="Close navigation help"
              >
                ×
              </button>
              <span className="spatial-kicker">Find your way</span>
              <h2>Take your time.</h2>
              <p>
                Drag to turn your head at eye level. Scroll or select the floor to
                walk, or use W A S D to move and Q E to turn. On a phone, move
                the thumbstick while dragging with your other hand to look.
                Pools, benches, and installations stay outside your walking route.
              </p>
              <p>
                Choose Tour to follow the guided route or Walk to explore at your own pace.
                Open Rooms to see all four spaces. Select a doorway to walk through it, or
                select a photograph or painting to look closer. Reset view returns you to the room entrance.
              </p>
              <p className="room-provenance">
                The bundled scene is an imagined gallery with four rooms and
                Gaussian-splat exhibits. It is not a capture of a historical
                location. You can open your own .spz, .splat, or .ply file; it
                stays on your device.
              </p>
            </aside>
          )}
          <div className="room-movement" aria-label="Move through the room">
            <button
              {...movementProps(0, 1)}
              aria-label="Move forward"
              disabled={!ready}
            >
              <Arrow direction="up" />
            </button>
            <div>
              <button
                {...movementProps(-1, 0)}
                aria-label="Move left"
                disabled={!ready}
              >
                <Arrow direction="left" />
              </button>
              <button
                {...movementProps(0, -1)}
                aria-label="Move backward"
                disabled={!ready}
              >
                <Arrow direction="down" />
              </button>
              <button
                {...movementProps(1, 0)}
                aria-label="Move right"
                disabled={!ready}
              >
                <Arrow direction="right" />
              </button>
            </div>
          </div>
            </div>
          </details>
          </div>
          </div>
          {capture && <p className="room-caption">Drag to look around · Scroll or pinch to move closer</p>}
          {loadingCapture && (
            <div className="capture-status" role="status">
              Opening your capture…
            </div>
          )}
          {captureError && (
            <p className="capture-status" role="alert">
              {captureError}
            </p>
          )}
        </>
      )}
      {!error && !capture && navigation.mode === "walk" && <WalkControls arriving={navigation.arriving} learned={walkLearned}
        onMove={(x, z) => controls.current?.move(x, z)} onSkip={() => { controls.current?.stopJourney(); controls.current?.focus(); }} />}
      {atlas && <GalleryAtlas activeRoom={activeRoom} visited={visited} onClose={() => setAtlas(false)} onSelect={selectRoom}
        onJourney={() => { setAtlas(false); controls.current?.startJourney(); }} />}
      {selectedExhibit && <ExhibitDialog exhibit={selectedExhibit} onClose={() => setSelectedExhibit(null)}
        onNavigate={() => {
          const id = selectedExhibit.id;
          setSelectedExhibit(null); choose(id);
          requestAnimationFrame(() => controls.current?.focus());
        }} onEnter={enterStory} />}
      {collection !== null && <ArtCollection initialArtwork={collection === "all" ? null : collection} onClose={() => setCollection(null)}
        onViewOnWall={(id) => {
          setCollection(null); controls.current?.inspectArtwork(id);
          requestAnimationFrame(() => controls.current?.focus());
        }} />}
    </main>
  );
}
