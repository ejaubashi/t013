import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/archivo-black/400.css";
import "@fontsource/archivo/400.css";
import "@fontsource/archivo/500.css";
import "@fontsource/archivo/600.css";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-500-italic.css";
import { chapters, archive } from "./chapters";
import SpatialLanding from "./spatial/SpatialLanding";
import "./base.css";
import "./styles.css";

const asset = (name) => `${import.meta.env.BASE_URL}assets/${name}`;
const number = (id) => String(id).padStart(2, "0");

function Icon({ name = "arrow", className = "" }) {
  const paths = {
    arrow: "M5 19 19 5M5 5h14v14",
    up: "M12 21V3M4 11l8-8 8 8",
    left: "M21 12H3m8-8-8 8 8 8",
    right: "M3 12h18m-8-8 8 8-8 8",
    close: "m5 5 14 14M19 5 5 19",
    check: "m4 12 5 5L20 6",
  };
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      {name === "play" ? (
        <path d="m8 4 12 8-12 8Z" fill="currentColor" stroke="none" />
      ) : name === "pause" ? (
        <>
          <path d="M7 4v16M17 4v16" strokeWidth="4" />
        </>
      ) : (
        <path d={paths[name] || paths.arrow} />
      )}
    </svg>
  );
}

function SoundIcon({ muted }) {
  return (
    <span
      className={`sound-bars ${muted ? "is-muted" : ""}`}
      aria-hidden="true"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <i key={i} />
      ))}
    </span>
  );
}

function Marquee({ text, faded = false }) {
  return (
    <div className={`marquee ${faded ? "faded" : ""}`} aria-hidden="true">
      <div>
        {[0, 1, 2, 3].map((i) => (
          <span key={i}>{text}&nbsp;&nbsp;</span>
        ))}
      </div>
    </div>
  );
}

function Dialog({ title, children, onClose, className = "" }) {
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
      className={`dialog ${className}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-top">
        <span className="eyebrow">Benno’s Light</span>
        <button
          className="text-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          Close{" "}
          <span aria-hidden="true">
            <Icon name="close" />
          </span>
        </button>
      </div>
      <h2 id="dialog-title">{title}</h2>
      {children}
    </dialog>
  );
}

function Landing({ onEnter, onChapters }) {
  const card = useRef(null);
  const moveCard = (e) => {
    if (
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      e.pointerType === "touch"
    )
      return;
    const { width, height, left, top } =
      e.currentTarget.getBoundingClientRect();
    card.current.style.setProperty(
      "--tilt-x",
      `${((e.clientY - top) / height - 0.5) * -3}deg`,
    );
    card.current.style.setProperty(
      "--tilt-y",
      `${((e.clientX - left) / width - 0.5) * 3}deg`,
    );
  };
  const resetCard = () => {
    card.current.style.setProperty("--tilt-x", "0deg");
    card.current.style.setProperty("--tilt-y", "0deg");
  };
  return (
    <main
      className="landing paper-background"
      onPointerMove={moveCard}
      onPointerLeave={resetCard}
    >
      <div className="background-type" aria-hidden="true">
        <div className="story-line">The story of</div>
        <div className="type-caption">
          <span>Click to open</span>
          <span>Click to open</span>
        </div>
        <div className="name-line">Benno</div>
        <div className="surname-line">Kern</div>
      </div>
      <button
        className="cover-stack"
        ref={card}
        onClick={onEnter}
        aria-label="Open Benno’s memories"
      >
        <span className="cover-back cover-back-one" />
        <span className="cover-back cover-back-two" />
        <span className="cover-front">
          <span className="cover-credit">By Claims Conference</span>
          <h1 className="sr-only">Benno’s Light — The story of Benno Kern</h1>
          <svg
            className="cover-title"
            viewBox="0 0 1000 390"
            aria-hidden="true"
          >
            <text
              x="0"
              y="153"
              fontSize="193"
              textLength="1000"
              lengthAdjust="spacingAndGlyphs"
            >
              BENNO'S
            </text>
            <text
              x="-4"
              y="383"
              fontSize="287"
              textLength="1006"
              lengthAdjust="spacingAndGlyphs"
            >
              LIGHT
            </text>
          </svg>
          <span className="open-sticker">
            Click to
            <br />
            open{" "}
            <span aria-hidden="true">
              <Icon name="arrow" />
            </span>
          </span>
          <span className="cover-cta">
            Enter Benno’s memories{" "}
            <span aria-hidden="true">
              <Icon name="arrow" />
            </span>
          </span>
          <span className="cover-photo">
            <img
              src={asset("benno-eyes.webp")}
              alt="A close-up of young Benno Kern’s eyes"
            />
          </span>
        </span>
      </button>
      <button className="landing-chapters text-button" onClick={onChapters}>
        Explore all chapters{" "}
        <span aria-hidden="true">
          <Icon name="arrow" />
        </span>
      </button>
    </main>
  );
}

function ChapterMenu({
  chapterId,
  visited,
  onSelect,
  onClose,
  onInfo,
  onShare,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    return () => {
      ref.current?.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="chapter-menu paper-background"
      aria-label="All chapters"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="menu-bar">
        <nav aria-label="Project information">
          <button onClick={() => onInfo("about")}>About</button>
          <button onClick={() => onInfo("privacy")}>Privacy policy</button>
          <button onClick={onShare}>
            Share{" "}
            <span aria-hidden="true">
              <Icon name="arrow" />
            </span>
          </button>
        </nav>
        <button onClick={onClose}>
          Close{" "}
          <span aria-hidden="true">
            <Icon name="close" />
          </span>
        </button>
      </div>
      <div className="chapter-stack">
        {chapters.map((chapter, i) => (
          <button
            key={chapter.id}
            className={`chapter-card chapter-card-${i} ${chapter.id === chapterId ? "current-chapter" : ""}`}
            style={{ "--card-index": i }}
            onClick={() => onSelect(chapter.id)}
            aria-label={`Explore chapter ${number(chapter.id)}: ${chapter.title}`}
          >
            <span className="card-kicker">{chapter.title}</span>
            <span className="card-name">Chapter {number(chapter.id)}</span>
            {chapter.id === chapterId && (
              <span className="chapter-stamp">In progress</span>
            )}
            {visited.includes(chapter.id) && chapter.id !== chapterId && (
              <span className="chapter-visited" aria-label="Previously opened">
                <Icon />
              </span>
            )}
            <span className="card-explore">
              Explore chapter{" "}
              <span aria-hidden="true">
                <Icon name="arrow" />
              </span>
            </span>
            <span className="card-image">
              <img src={asset(chapter.image)} alt="" />
            </span>
          </button>
        ))}
      </div>
      <div className="menu-bottom">
        <span>Six chapters. One extraordinary life.</span>
        <span>1927 — A story to remember</span>
      </div>
    </dialog>
  );
}

function Film({
  chapter,
  onChapters,
  onContent,
  muted,
  onMuted,
  reducedMotion,
  suspended,
  onHome,
}) {
  const video = useRef(null);
  const [playing, setPlaying] = useState(!reducedMotion);
  const [progress, setProgress] = useState(0);
  const wasPlaying = useRef(false);
  useEffect(() => {
    const current = video.current;
    if (!current) return;
    if (suspended) {
      wasPlaying.current = !current.paused;
      current.pause();
    } else if (wasPlaying.current) {
      current.play().catch(() => setPlaying(false));
      wasPlaying.current = false;
    }
  }, [suspended]);
  useEffect(() => {
    setProgress(0);
    if (chapter.id === 1 && video.current && !reducedMotion)
      video.current.play().catch(() => setPlaying(false));
  }, [chapter.id, reducedMotion]);
  const toggle = async () => {
    if (!video.current) return;
    if (video.current.paused) {
      try {
        await video.current.play();
      } catch {
        setPlaying(false);
      }
    } else video.current.pause();
  };
  return (
    <main className="film-page">
      <header className="film-header">
        <div className="film-side">
          <button className="brand" onClick={onHome}>
            Benno’s Light
          </button>
          <button className="bar-button" onClick={onChapters}>
            All chapters
          </button>
        </div>
        <Marquee text={chapter.title} />
        <div className="film-side right">
          <span className="eyebrow">Chapter {number(chapter.id)}</span>
          <button className="bar-button" onClick={onContent}>
            Chapter content
          </button>
        </div>
      </header>
      <h1 className="sr-only">
        Chapter {number(chapter.id)}: {chapter.title}
      </h1>
      {chapter.id === 1 ? (
        <>
          <div className="film-frame">
            <video
              ref={video}
              src={asset("benno-excerpt.mp4")}
              poster={asset("benno-interview.webp")}
              autoPlay={!reducedMotion}
              muted={muted}
              playsInline
              preload="auto"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onTimeUpdate={() => {
                const v = video.current;
                setProgress(v?.duration ? v.currentTime / v.duration : 0);
              }}
              aria-label="A short recorded excerpt of Benno Kern’s testimony"
            >
              <track
                kind="captions"
                src={asset("benno-excerpt.vtt")}
                srcLang="en"
                label="English"
              />
            </video>
            <button
              className={`film-play-overlay ${playing ? "playing" : ""}`}
              onClick={toggle}
              aria-label={playing ? "Pause testimony" : "Play testimony"}
            >
              <span aria-hidden="true">
                <Icon name={playing ? "pause" : "play"} />
              </span>
            </button>
            <span className="excerpt-label">Testimony excerpt</span>
            <div className="film-progress" aria-hidden="true">
              <span style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
          <div className="film-bottom">
            <button
              className="play-button"
              onClick={toggle}
              aria-label={playing ? "Pause video" : "Play video"}
            >
              <Icon name={playing ? "pause" : "play"} />
            </button>
            <p>My name is Benno Kern.</p>
            <button
              className="sound-button"
              aria-label={muted ? "Unmute testimony" : "Mute testimony"}
              aria-pressed={!muted}
              onClick={onMuted}
            >
              <SoundIcon muted={muted} />
            </button>
          </div>
        </>
      ) : (
        <div className="chapter-preview">
          <div className="chapter-preview-image">
            <img
              src={asset(chapter.image)}
              alt={
                chapter.title === "Anschluss"
                  ? "A historical panorama of Vienna"
                  : "Archival imagery from Benno’s story"
              }
            />
          </div>
          <div className="chapter-preview-copy">
            <span className="eyebrow">
              Chapter {number(chapter.id)} · {chapter.years.join(" — ")}
            </span>
            <h2>{chapter.title}</h2>
            <p>{chapter.introduction}</p>
            <button className="bar-button" onClick={onContent}>
              Explore chapter content{" "}
              <span aria-hidden="true">
                <Icon name="arrow" />
              </span>
            </button>
            <span className="film-availability">
              The full chapter film is not included in this preview.
            </span>
          </div>
        </div>
      )}
    </main>
  );
}

function ArchiveViewer({ chapter, onClose, onNextChapter }) {
  const ref = useRef(null);
  const [slide, setSlide] = useState(0);
  const item = archive[slide];
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    return () => {
      ref.current?.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      className="archive-viewer"
      ref={ref}
      aria-label={`Chapter ${number(chapter.id)} content`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header className="archive-header">
        <span className="eyebrow">Chapter {number(chapter.id)}</span>
        <Marquee text={chapter.title} faded />
        <button className="bar-button inverse" onClick={onClose}>
          Close{" "}
          <span aria-hidden="true">
            <Icon name="close" />
          </span>
        </button>
      </header>
      <div className="archive-body">
        <section className="chapter-heading">
          <h2>
            <span>{chapter.heading[0]}</span>
            <span>{chapter.heading[1]}</span>
          </h2>
          <div className="chapter-years">
            <span>{chapter.years[0]}</span>
            <span>{chapter.years[1]}</span>
            <strong>Chapter {number(chapter.id)}</strong>
          </div>
        </section>
        <div className="chapter-rule">
          <span>{chapter.years[0]}</span>
          <span>Scroll down to explore</span>
          <span>Chapter {number(chapter.id)}</span>
          <span>Scroll down to explore</span>
          <span>{chapter.years[1]}</span>
        </div>
        <section className="chapter-script">
          <h3>Chapter script</h3>
          <div className="script-columns">
            {chapter.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </section>
        <section className="archive-gallery" aria-label="Archival photographs">
          <div className="section-caption">
            <span className="eyebrow">The personal archive</span>
            <h3>
              People.
              <br />
              Places.
              <br />
              Memories.
            </h3>
          </div>
          <div className="gallery-layout">
            <div className="gallery-title">
              <h4>{item.title}</h4>
              <span className="eyebrow">{item.location}</span>
            </div>
            <figure key={item.image}>
              <img src={asset(item.image)} alt={item.title} />
              <figcaption className="sr-only">{item.caption}</figcaption>
            </figure>
            <p className="gallery-description">{item.caption}</p>
          </div>
          <div className="gallery-controls">
            <button
              className="bar-button inverse"
              onClick={() =>
                setSlide((slide + archive.length - 1) % archive.length)
              }
              aria-label="Previous archival photograph"
            >
              Previous{" "}
              <span aria-hidden="true">
                <Icon name="left" />
              </span>
            </button>
            <span className="eyebrow" aria-live="polite">
              {number(slide + 1)} / {number(archive.length)}
            </span>
            <button
              className="bar-button inverse"
              onClick={() => setSlide((slide + 1) % archive.length)}
              aria-label="Next archival photograph"
            >
              Next{" "}
              <span aria-hidden="true">
                <Icon name="right" />
              </span>
            </button>
          </div>
        </section>
        <section className="memory-quote">
          <span className="eyebrow">A life remembered</span>
          <blockquote>
            “I was born on
            <br />
            July 18, 1927,
            <br />
            in Vienna.”
          </blockquote>
          <span className="eyebrow">Benno Kern</span>
        </section>
        <footer className="archive-footer">
          <button
            onClick={() =>
              ref.current.scrollTo({
                top: 0,
                behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "instant"
                  : "smooth",
              })
            }
          >
            Back to top{" "}
            <span aria-hidden="true">
              <Icon name="up" />
            </span>
          </button>
          <button className="next-chapter" onClick={onNextChapter}>
            {chapter.id === 6
              ? "All chapters"
              : `Next chapter ${number(chapter.id + 1)}`}{" "}
            <span aria-hidden="true">
              <Icon name="arrow" />
            </span>
          </button>
        </footer>
      </div>
    </dialog>
  );
}

function App() {
  const [classic, setClassic] = useState(() => {
    try {
      if (new URLSearchParams(location.search).get("view") === "spatial") return false;
      return (
        sessionStorage.getItem("benno-classic") === "1" ||
        new URLSearchParams(location.search).get("view") === "classic"
      );
    } catch {
      return false;
    }
  });
  const [view, setView] = useState("landing");
  const [chapterId, setChapterId] = useState(() => {
    const id = Number(location.hash.match(/^#chapter-(\d)/)?.[1]);
    return id >= 1 && id <= 6 ? id : 1;
  });
  const [overlay, setOverlay] = useState(null);
  const [info, setInfo] = useState(null);
  const [muted, setMuted] = useState(true);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [visited, setVisited] = useState(() => {
    try {
      return (() => {
        const saved = JSON.parse(localStorage.getItem("benno-visited") || "[]");
        return Array.isArray(saved)
          ? saved.filter((id) => Number.isInteger(id) && id >= 1 && id <= 6)
          : [];
      })();
    } catch {
      return [];
    }
  });
  const [largeText, setLargeText] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [toast, setToast] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const chapter = chapters[chapterId - 1];

  useEffect(() => {
    const syncHash = () => {
      const id = Number(location.hash.match(/^#chapter-(\d)$/)?.[1]);
      if (id >= 1 && id <= 6) {
        setChapterId(id);
        setView("film");
        setOverlay(null);
      } else if (!location.hash) {
        setView("landing");
        setOverlay(null);
      }
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reducedMotion);
  }, [reducedMotion]);
  useEffect(() => {
    document.documentElement.classList.toggle("large-text", largeText);
  }, [largeText]);
  useEffect(() => {
    document.title =
      view === "film"
        ? `${chapter.title} — Benno’s Light`
        : "Benno’s Light — The story of Benno Kern";
  }, [view, chapter.title]);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 3500);
      return () => clearTimeout(id);
    }
  }, [toast]);

  const selectChapter = (id) => {
    setChapterId(id);
    setView("film");
    setOverlay(null);
    setInfo(null);
    const nextVisited = [...new Set([...visited, id])];
    setVisited(nextVisited);
    try {
      localStorage.setItem("benno-visited", JSON.stringify(nextVisited));
    } catch {
      /* Storage may be unavailable in private contexts. */
    }
    if (location.hash !== `#chapter-${id}`) location.hash = `chapter-${id}`;
  };
  const share = () => {
    setCopyStatus("");
    setInfo("share");
  };
  const copyLink = async () => {
    const url = `${location.origin}${location.pathname}#chapter-${chapterId}`;
    try {
      await Promise.race([
        navigator.clipboard.writeText(url),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Clipboard unavailable")), 1500),
        ),
      ]);
      setCopyStatus("Link copied. Share Benno’s story.");
    } catch {
      setCopyStatus(
        "Select the link above and copy it using your device’s copy command.",
      );
    }
  };
  const home = () => {
    setView("landing");
    setOverlay(null);
    setInfo(null);
    history.pushState(null, "", location.pathname + location.search);
  };

  return (
    <>
      {view === "landing" && (
        <>
          <header className={`site-header ${classic ? "" : "gallery-header"}`}>
            <button className="brand" onClick={home}>
              Benno’s Light
            </button>
            <button
              className="header-about text-button"
              onClick={() => setInfo("about")}
            >
              About the project{" "}
              <span aria-hidden="true">
                <Icon name="arrow" />
              </span>
            </button>
          </header>
          {classic ? (
            <>
              <Landing
                onEnter={() => setInfo("notice")}
                onChapters={() => setOverlay("chapters")}
              />
              <button
                className="classic-room-link"
                onClick={() => {
                  setClassic(false);
                  try {
                    sessionStorage.removeItem("benno-classic");
                  } catch {}
                }}
              >
                Enter the 3D room <Icon />
              </button>
            </>
          ) : (
            <SpatialLanding
              onEnter={() => setInfo("notice")}
              onChapters={() => setOverlay("chapters")}
              onOriginal={() => {
                setClassic(true);
                try {
                  sessionStorage.setItem("benno-classic", "1");
                } catch {}
              }}
              reducedMotion={reducedMotion}
            />
          )}
        </>
      )}
      {view === "film" && (
        <Film
          key={chapterId}
          chapter={chapter}
          onChapters={() => setOverlay("chapters")}
          onContent={() => setOverlay("archive")}
          muted={muted}
          onMuted={() => setMuted(!muted)}
          reducedMotion={reducedMotion}
          suspended={Boolean(overlay || info)}
          onHome={home}
        />
      )}
      {view === "landing" && (
        <div className="utility-bar">
          <button
            className="accessibility-button"
            onClick={() => setInfo("accessibility")}
            aria-label="Accessibility settings"
          >
            <svg viewBox="0 0 32 20" fill="none" aria-hidden="true">
              <path
                d="M16 5H9a5 5 0 1 0 5 5m2-5h7a5 5 0 1 1-5 5M12 5l8 10"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </button>
          <div className="utility-right">
            <div className="language-picker">
              <button
                className="text-button"
                aria-expanded={languageOpen}
                onClick={() => setLanguageOpen(!languageOpen)}
              >
                Language{" "}
                <span aria-hidden="true">{languageOpen ? "−" : "+"}</span>
              </button>
              {languageOpen && (
                <div className="language-options">
                  <span>Experience language</span>
                  <button
                    onClick={() => {
                      document.documentElement.lang = "en";
                      setLanguageOpen(false);
                      setToast("English selected");
                    }}
                  >
                    English{" "}
                    <span aria-hidden="true">
                      <Icon name="check" />
                    </span>
                  </button>
                  <p>Original testimony in English</p>
                </div>
              )}
            </div>
            <button
              className="sound-button"
              onClick={() => setMuted(!muted)}
              aria-label={muted ? "Enable sound for testimony" : "Mute sound"}
              aria-pressed={!muted}
            >
              <SoundIcon muted={muted} />
            </button>
          </div>
        </div>
      )}
      {overlay === "chapters" && (
        <ChapterMenu
          chapterId={view === "film" ? chapterId : null}
          visited={visited}
          onSelect={selectChapter}
          onClose={() => setOverlay(null)}
          onInfo={setInfo}
          onShare={share}
        />
      )}
      {overlay === "archive" && (
        <ArchiveViewer
          chapter={chapter}
          onClose={() => setOverlay(null)}
          onNextChapter={() =>
            chapterId === 6
              ? setOverlay("chapters")
              : selectChapter(chapterId + 1)
          }
        />
      )}
      {info && (
        <Dialog
          title={
            {
              about: "A life. A voice. A light.",
              privacy: "Your visit stays yours.",
              notice: "Before you begin.",
              accessibility: "Make it your experience.",
              share: "Carry the story forward.",
            }[info]
          }
          onClose={() => setInfo(null)}
          className={info === "notice" ? "notice-dialog" : ""}
        >
          {info === "notice" && (
            <>
              <div className="notice-symbol" aria-hidden="true">
                <svg
                  width="34"
                  height="34"
                  viewBox="0 0 34 34"
                  fill="none"
                  stroke="currentColor"
                >
                  <circle cx="17" cy="17" r="4" />
                  <path d="M10 10a10 10 0 0 0 0 14m14-14a10 10 0 0 1 0 14M6 6a16 16 0 0 0 0 22M28 6a16 16 0 0 1 0 22" />
                </svg>
              </div>
              <p>
                You are about to experience the personal testimony of Holocaust
                survivor Benno Kern.
              </p>
              <p className="secondary-copy">
                This story deals with persecution, war, and loss. Please pause
                or leave the experience whenever you need to.
              </p>
              <button
                className="bar-button inverse"
                onClick={() => selectChapter(chapterId)}
              >
                Access the experience{" "}
                <span aria-hidden="true">
                  <Icon name="arrow" />
                </span>
              </button>
              <span className="notice-footnote">
                Sound on. Take your time. Listen.
              </span>
            </>
          )}
          {info === "about" && (
            <>
              <p>
                Benno’s Light is an interactive journey through the memories of
                Holocaust survivor Benno Kern. His voice, family photographs,
                and the places he knew bring a personal history into the
                present.
              </p>
              <p className="secondary-copy">
                This independent reconstruction follows the supplied recordings
                of the original experience, presented by Claims Conference. The
                original project is credited to makemepulse.
              </p>
              <p className="source-note">
                The short testimony excerpt and archival images come from the
                supplied screen recordings. Chapter summaries provide historical
                context; they are not verbatim transcripts. Full chapter films
                are not included.
              </p>
              <button
                className="bar-button inverse"
                onClick={() => {
                  setInfo(null);
                  setOverlay("chapters");
                }}
              >
                Explore the six chapters{" "}
                <span aria-hidden="true">
                  <Icon name="arrow" />
                </span>
              </button>
            </>
          )}
          {info === "privacy" && (
            <>
              <p>
                This reconstruction does not use analytics, advertising cookies,
                accounts, or tracking services.
              </p>
              <p className="secondary-copy">
                Your browser stores only the chapter numbers you open, on this
                device, so the chapter index can remember your progress. No
                personal information is sent to a server.
              </p>
              <button
                className="bar-button inverse"
                onClick={() => {
                  try {
                    localStorage.removeItem("benno-visited");
                  } catch {}
                  setVisited([]);
                  setToast("Local chapter history cleared.");
                }}
              >
                Clear chapter history
              </button>
            </>
          )}
          {info === "accessibility" && (
            <>
              <p>
                You can explore every chapter with a keyboard. Use Tab to move,
                Enter to select, and Escape to close any panel.
              </p>
              <label className="setting-row">
                <span>Reduce motion</span>
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                />
              </label>
              <label className="setting-row">
                <span>Larger reading text</span>
                <input
                  type="checkbox"
                  checked={largeText}
                  onChange={(e) => setLargeText(e.target.checked)}
                />
              </label>
              <p className="secondary-copy">
                The testimony excerpt includes an on-screen caption. Sound is
                off until you choose to enable it.
              </p>
            </>
          )}
          {info === "share" && (
            <>
              <p>Copy this link to share the story.</p>
              <input
                className="share-input"
                readOnly
                value={`${location.origin}${location.pathname}#chapter-${chapterId}`}
                aria-label="Share link"
                onFocus={(e) => e.target.select()}
              />
              <button className="bar-button inverse" onClick={copyLink}>
                Copy link{" "}
                <span>
                  <Icon />
                </span>
              </button>
              <p className="copy-status secondary-copy" role="status">
                {copyStatus}
              </p>
            </>
          )}
        </Dialog>
      )}
      <div className={`toast ${toast ? "visible" : ""}`} role="status">
        {toast}
      </div>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
