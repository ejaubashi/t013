import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { viewpoints } from "./viewpoints";
import "./spatial.css";

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
    setAttempt((n) => n + 1);
  };
  return (
    <main className={`spatial-stage ${ready ? "room-ready" : ""}`}>
      <div className="spatial-fallback" aria-hidden="true" />
      <Suspense fallback={null}>
        <RoomCanvas
          key={attempt}
          controlRef={controls}
          reducedMotion={reducedMotion}
          onReady={() => setReady(true)}
          onProgress={setProgress}
          onError={setError}
        />
      </Suspense>
      <div className="spatial-vignette" aria-hidden="true" />
      <div className="spatial-topline">
        <span className="spatial-kicker">
          <i /> A space for remembering
        </span>
        <button onClick={onOriginal} className="spatial-original">
          Original view <Arrow />
        </button>
      </div>
      <div className="room-coordinate" aria-hidden="true">
        <span>48° 12′ N</span>
        <span>16° 22′ E</span>
        <span>VIENNA · MEMORY STUDY</span>
      </div>
      {!error && !ready && (
        <div className="room-loader" role="status">
          <span className="room-loader-mark" />
          <span>Opening the room</span>
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
            className={`spatial-introduction ${active !== "arrival" || capture ? "introduction-small" : ""}`}
          >
            <p className="spatial-kicker">Benno Kern · A life remembered</p>
            <h1>
              A room of
              <br />
              <span>memories.</span>
            </h1>
            <p className="spatial-description">
              Step inside. Look closer.
              <br />
              Every photograph holds a life.
            </p>
            <button
              className="spatial-enter"
              onClick={onEnter}
              aria-label="Open Benno’s memories"
            >
              Listen to Benno <Arrow />
            </button>
          </div>
          <div className="room-view-label" aria-live="polite">
            <span>
              {capture
                ? "Your capture"
                : String(
                    viewpoints.findIndex((v) => v.id === active) + 1,
                  ).padStart(2, "0") + " / 04"}
            </span>
            <strong>
              {capture || viewpoints.find((v) => v.id === active)?.label}
            </strong>
          </div>
          {(active !== "arrival" || capture) && (
            <button
              className="room-listen"
              onClick={onEnter}
              aria-label="Open Benno’s memories"
            >
              Listen to Benno <Arrow />
            </button>
          )}
          <nav className="room-viewpoints" aria-label="Room viewpoints">
            {!capture &&
              viewpoints.map((view, index) => (
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
          <div className="room-tools">
            <button
              onClick={() => {
                controls.current?.reset();
                setActive("arrival");
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
              onClick={() => setHelp(!help)}
            >
              ?
            </button>
            <button
              aria-label="Open a captured 3D scene"
              disabled={!ready || loadingCapture}
              onClick={() => inputRef.current?.click()}
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
                entrance.
              </p>
              <p className="room-provenance">
                The bundled scene is an imagined archive rendered with Gaussian
                splats. It is not a capture of a historical location. You can
                open your own .spz, .splat, or .ply file; it stays on your
                device.
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
          <button className="spatial-chapters" onClick={onChapters}>
            Explore all chapters <Arrow />
          </button>
          <p className="room-caption">
            {capture
              ? "LOCAL CAPTURE · YOUR DEVICE ONLY"
              : "SPATIAL STUDY · IMAGINED ARCHIVE"}
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
    </main>
  );
}
