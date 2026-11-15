import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";

// Named tool elements share native geometry transitions. The root and
// canvas are explicitly excluded from the document snapshot.
export function useDockMorph(ref, reducedMotion) {
  const running = useRef(null), sequence = useRef(0);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const skip = () => { if (preference.matches) running.current?.skipTransition(); };
    preference.addEventListener("change", skip);
    return () => {
      sequence.current++;
      running.current?.skipTransition();
      document.documentElement.removeAttribute("data-gallery-morph");
      preference.removeEventListener("change", skip);
    };
  }, []);
  useEffect(() => { if (reducedMotion) running.current?.skipTransition(); }, [reducedMotion]);

  return (apply) => {
    const token = ++sequence.current, dock = ref.current;
    running.current?.skipTransition();
    if (!dock || reducedMotion || matchMedia("(prefers-reduced-motion: reduce)").matches || !document.startViewTransition) {
      document.documentElement.removeAttribute("data-gallery-morph");
      apply(); return;
    }
    document.documentElement.setAttribute("data-gallery-morph", "tools");
    const transition = document.startViewTransition(() => {
      if (sequence.current === token) flushSync(apply);
    });
    running.current = transition;
    transition.ready.catch(() => {}); // Hidden/offscreen captures may be skipped.
    const settle = () => {
      if (running.current !== transition) return;
      running.current = null;
      document.documentElement.removeAttribute("data-gallery-morph");
    };
    transition.finished.then(settle, settle);
  };
}
