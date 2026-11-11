import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { viewpoints } from "./viewpoints";
import { journey, artForms } from "./journey";
import { exhibits } from "./exhibits";
import ExhibitDialog from "./ExhibitDialog";
import { rooms, roomForView } from "./rooms";
import "./spatial.css";
import "./atrium.css";
import "./journey.css";
import "./rooms.css";

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
  useEffect(() => {
    const stop = () => controls.current?.move(0, 0);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);
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
    setSelectedExhibit(exhibits.find((exhibit) => exhibit.id === id));
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
    setAttempt((n) => n + 1);
  };
  return (
    <main className={`spatial-stage gallery-${activeRoom} ${ready ? "room-ready" : ""} ${night ? "after-hours" : ""} ${journeyStep !== null ? "is-journey" : ""}`}>
      <div className="spatial-fallback" aria-hidden="true" />
      <Suspense fallback={null}>
        <RoomCanvas
          key={attempt}
          controlRef={controls}
          reducedMotion={reducedMotion}
          onReady={() => setReady(true)}
          onProgress={setProgress}
          onError={setError}
          onExhibitSelect={openExhibit}
          onRoomChange={({ id, view }) => { setActiveRoom(id); setActive(view); setHelp(false); }}
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
      {ready && <div key={activeRoom} className="room-reveal" aria-hidden="true" />}
      {!error && !capture && ready && (
        <div className="room-exhibit-hotspots" aria-label="Explore the gallery">
          {exhibitPositions.filter((point) => point.visible).map((point) => {
            if (point.room) {
              const destination = rooms.find((room) => room.id === point.room);
              return <button key={point.id} className="room-portal-hotspot" style={{ left: point.x, top: point.y }}
                aria-label={`Door to ${destination.name}`} onClick={() => controls.current?.enterRoom(point.room)}>
                <span aria-hidden="true"><Arrow /></span><span>{destination.name}</span>
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
      {!error && !capture && <nav className="gallery-room-nav" aria-label="Gallery rooms">
        <span className="gallery-room-nav-label">Explore the rooms</span>
        <div>{rooms.map((room) => <button key={room.id} aria-label={`Enter ${room.name}`} aria-pressed={activeRoom === room.id}
          disabled={!ready} onClick={() => controls.current?.enterRoom(room.id)}>
          <span>{room.number}</span>{room.short}<i aria-hidden="true"><Arrow /></i>
        </button>)}</div>
      </nav>}
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
            {!capture && <button className="spatial-journey-start" disabled={!ready} aria-label="Start guided journey" onClick={() => controls.current?.startJourney()}>
              <span aria-hidden="true">▷</span> Take the journey <span className="journey-start-detail">3 rooms · {journey.length} moments</span>
            </button>}
          </div>
          {activeRoom !== "pavilion" && !capture && journeyStep === null && <div className="gallery-room-heading">
            <p className="spatial-kicker">Room {currentRoom.number} / A study in light</p>
            <h2>{currentRoom.name}</h2>
            <p>{currentRoom.description}</p>
            <button aria-label="Start guided journey" onClick={() => controls.current?.startJourney()}>Take the full journey <Arrow /></button>
          </div>}
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
          {(active !== "arrival" || capture || journeyStep !== null) && (
            <button
              className="room-listen"
              onClick={enterStory}
              aria-label="Open Benno’s memories"
            >
              Listen to Benno <Arrow />
            </button>
          )}
          <nav className="room-viewpoints" aria-label="Room viewpoints" style={{ "--view-count": roomViews.length }}>
            {!capture &&
              roomViews.map((view, index) => (
                <button
                  key={view.id}
                  onClick={() => choose(view.id)}
                  aria-pressed={active === view.id}
                  disabled={!ready}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {view.label}
                  <i />
                </button>
              ))}
          </nav>
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
                Drag to look around. Scroll or pinch to move closer. Focus the
                room and use W A S D or the arrow keys to move.
              </p>
              <p>
                Choose a viewpoint for a composed view. Reset returns you to the
                entrance. Shape the light transforms the installation between a
                ribbon, constellation, and Bloom. Take the journey for a guided
                camera route across all three rooms. Select a glowing doorway
                or use Explore the rooms to visit Orbit Hall and the Sky Garden.
                Select a photograph in the pavilion to open it.
              </p>
              <p className="room-provenance">
                The bundled scene is an imagined gallery with three rooms and
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
          <button className="spatial-chapters" onClick={() => { controls.current?.stopJourney(); onChapters(); }}>
            Explore all chapters <Arrow />
          </button>
          <p className="room-caption">
            {capture
              ? "LOCAL CAPTURE · YOUR DEVICE ONLY"
              : "SPATIAL STUDY · IMAGINED GALLERY"}
            <span>Drag to look · Scroll to explore</span>
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
      {selectedExhibit && <ExhibitDialog exhibit={selectedExhibit} onClose={() => setSelectedExhibit(null)}
        onNavigate={() => {
          const id = selectedExhibit.id;
          setSelectedExhibit(null); choose(id);
          requestAnimationFrame(() => controls.current?.focus());
        }} onEnter={enterStory} />}
    </main>
  );
}
