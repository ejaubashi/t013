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
import { useControlsMotion } from "./useControlsMotion";
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
}) {
  const controls = useRef(null);
  const [ready, setReady] = useState(false),
    [progress, setProgress] = useState(0);
  const [error, setError] = useState(""),
    [active, setActive] = useState("arrival");
  const [help, setHelp] = useState(false),
    [capture, setCapture] = useState("");
  const [loadingCapture, setLoadingCapture] = useState(false),
    [captureError, setCaptureError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [night, setNight] = useState(false);
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
    setNight(false);
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
    <main className={`spatial-stage gallery-${activeRoom} ${navigation.mode === "walk" && !capture ? "is-walking" : ""} ${focused ? "is-focus" : ""} ${interacting ? "is-interacting" : ""} ${travel ? "is-travelling" : ""} ${ready ? "room-ready" : ""} ${night ? "after-hours" : ""} ${journeyStep !== null ? "is-journey" : ""}`}>
      <div className="spatial-fallback" aria-hidden="true" />
      <Suspense fallback={null}>
        <RoomCanvas
          key={attempt}
          controlRef={controls}
          reducedMotion={reducedMotion}
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
            setActiveRoom(id); setActive(view); setHelp(false);
            if (toolboxRef.current) toolboxRef.current.open = false;
            setVisited((previous) => previous.includes(id) ? previous : [...previous, id]);
          }}
          onRoomTransition={(event) => {
            setTravel(event.active ? event : null);
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
      <span className="sr-only" role="status" aria-live="polite">{travelNotice}</span>
      {travel && <aside className="room-transit-hud" aria-label="Room transition">
        <div><span className="transit-origin">{rooms.find((room) => room.id === travel.from).short}</span>
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
      <div className="spatial-topline">
        <span className="spatial-kicker">
          <i /> A place for human memory
        </span>
        <button onClick={onOriginal} className="spatial-original">
          Original view <Arrow />
        </button>
      </div>
      {!error && <div className="gallery-actions">
        {!capture && <button className="atlas-launcher" aria-label="Open gallery atlas" aria-haspopup="dialog" disabled={!ready} onClick={openAtlas}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></svg>
          Explore the rooms <span className="atlas-visit-dots" aria-hidden="true">{rooms.map((room) => <i key={room.id} className={activeRoom === room.id ? "is-current" : visited.includes(room.id) ? "is-visited" : ""} />)}</span>
        </button>}
      </div>}
      {!error && <button ref={focusTriggerRef} className={`gallery-focus-toggle ${focused ? "gallery-focus-exit" : ""}`}
          aria-label={focused ? "Return to gallery interface" : "View artwork without interface"} aria-pressed={focused} disabled={!ready}
          onClick={() => {
            if (focused) { closeFocus(); return; }
            controls.current?.stopJourney(); if (toolboxRef.current) toolboxRef.current.open = false; setFocused(true);
          }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" /></svg><span>Just the art</span>
          {focused && <span className="focus-exit-label">Exit art view ×</span>}
        </button>}
      <div className="room-coordinate" aria-hidden="true">
        <span>48° 12′ N</span>
        <span>16° 22′ E</span>
        <span>{currentRoom.name.toUpperCase()} · EST. IN MEMORY</span>
      </div>
      {!error && !ready && (
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
          <div
            className={`spatial-introduction ${active !== "arrival" || capture || journeyStep !== null ? "introduction-small" : ""}`}
          >
            <p className="spatial-kicker">
              An immersive exhibition · Benno Kern
            </p>
            <h1>
              Some light
              <br />
              <span>never leaves.</span>
            </h1>
            <p className="spatial-description">
              A life remembered. A voice still here.
              <br />
              Walk into the light. Stay for the story.
            </p>
            <button
              className="spatial-enter"
              onClick={enterStory}
              aria-label="Open Benno’s memories"
            >
              Listen to Benno <Arrow />
            </button>

          </div>
          {activeRoom !== "pavilion" && !capture && journeyStep === null && <div className={`gallery-room-heading ${active !== currentRoom.entry ? "room-heading-quiet" : ""}`}>
            <p className="spatial-kicker">Room {currentRoom.number} / A study in light</p>
            <h2>{currentRoom.name}</h2>
            <p>{currentRoom.description}</p>
          </div>}
          {!capture && journeyStep === null && <button className="gallery-journey-launch" disabled={!ready} aria-label="Start guided journey" onClick={() => controls.current?.startJourney()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m10 8 6 4-6 4Z" /></svg>
            <span>Take the journey<small>{rooms.length} rooms · {journey.length} moments</small></span><Arrow />
          </button>}
          {!capture && <button className="gallery-collection-launch" disabled={!ready} aria-label="Browse wall artworks" onClick={() => openCollection()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M3 5h18v14H3zM6 8h12v8H6z" /></svg>
            Art collection <span>{artworks.length}</span>
          </button>}
          <div className="room-view-label" aria-live="polite">
            <span>
              {capture
                ? "Your capture"
                : String(
                    roomViews.findIndex((v) => v.id === active) + 1,
                  ).padStart(2, "0") +
                  " / " +
                  String(roomViews.length).padStart(2, "0")}
            </span>
            <strong>
              {capture || viewpoints.find((v) => v.id === active)?.label}
            </strong>
          </div>
          {(active !== "arrival" || capture || journeyStep !== null || navigation.mode === "walk") && (
            <button
              className="room-listen"
              onClick={enterStory}
              aria-label="Open Benno’s memories"
            >
              Listen to Benno <Arrow />
            </button>
          )}
          {journeyStep !== null && (
            <aside className="room-journey-card" aria-label="Guided journey" aria-live="polite">
              <span className="spatial-kicker">A journey in light · {journeyStep + 1} / {journey.length}</span>
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
          <div className={`gallery-navigation ${capture ? "is-capture" : ""}`}>
          {!capture && <WalkModeSwitch mode={navigation.mode} ready={ready} onChange={(mode) => controls.current?.setNavigation(mode)} />}
          {!capture && navigation.mode === "views" && <ViewDock views={roomViews} active={active} ready={ready} onSelect={choose} reducedMotion={reducedMotion} />}
          <details className="gallery-toolbox" ref={toolboxRef} onToggle={controlsMotion.onToggle} onKeyDown={controlsMotion.onKeyDown}>
            <summary aria-label="Gallery controls" onClick={controlsMotion.onSummaryClick}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M4 7h16M4 17h16M9 4v6m6 4v6" /></svg><span className="controls-label">Controls</span><span className="controls-symbol" aria-hidden="true">+</span></summary>
            <div className="gallery-controls-panel">
              <p className="controls-eyebrow">Light, movement & view</p>
              {!capture && navigation.mode === "walk" && <button className="walking-tour-action" aria-label="Start guided journey" onClick={() => {
                toolboxRef.current.open = false; controls.current?.startJourney();
              }}>Take the guided journey ↗</button>}
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
                {night ? "After hours" : "Daylight"}
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
                Shape the light
                <span className="art-form-state">{["I", "II", "III"][artForm]}</span>
                <span id="art-form-description" className="sr-only">Current form: {artForms[artForm]}</span>
              </button>}
            </>
          )}
              {!capture && activeRoom === "prism" && <label className="spectrum-control">Move the light <span>{Math.round(spectrum * 100)}%</span>
                <input type="range" min="0" max="100" value={Math.round(spectrum * 100)} aria-label="Spectrum position" onChange={(event) => {
                  const value = Number(event.target.value) / 100; setSpectrum(value); controls.current?.setSpectrum(value);
                }} />
                <small>A different spectrum, with every position.</small>
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
                In Walk, drag to turn your head. Scroll or select the floor to
                walk, or use W A S D to move and Q E to turn. On a phone, move
                the thumbstick while dragging with your other hand to look.
                Pools, benches, and installations stay outside your walking route.
              </p>
              <p>
                Choose Views for composed viewpoints and orbit controls. Walk
                returns you to eye level. Reset returns you to the
                entrance. Shape the light transforms the installation between a
                ribbon, constellation, and Bloom. Take the journey for a guided
                camera route across all four rooms. Select a glowing doorway
                or open the atlas to visit Orbit Hall, Sky Garden, and Prism Chamber.
                Select a photograph in the pavilion to open it.
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
          <button className="spatial-chapters" onClick={() => { controls.current?.stopJourney(); onChapters(); }}>
            Explore all chapters <Arrow />
          </button>
          <p className="room-caption">
            {capture
              ? "Your capture stays on this device."
              : navigation.mode === "walk" ? "Drag to look · W A S D to walk" : "Drag to look around"}
            <span>{navigation.mode === "walk" ? "Scroll or click the floor to walk" : "Scroll or pinch to move closer"}</span>
          </p>
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
      {!error && !capture && navigation.mode === "walk" && <WalkControls arriving={navigation.arriving} learned={walkLearned} room={currentRoom}
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
