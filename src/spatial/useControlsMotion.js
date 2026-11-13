import { useEffect, useRef } from "react";

export function useControlsMotion(ref, onOpen) {
  const latestOpen = useRef(onOpen); latestOpen.current = onOpen;
  const state = useRef({ animation: null, closing: false });
  const stop = () => { state.current.animation?.cancel(); state.current.animation = null; state.current.closing = false; };
  const animate = (frames, duration, finish) => {
    state.current.animation?.cancel();
    const panel = ref.current.querySelector(".gallery-controls-panel");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !panel.animate) { finish?.(); return; }
    const animation = panel.animate(frames, { duration, easing: "cubic-bezier(.16,1,.3,1)", fill: "both" });
    state.current.animation = animation;
    animation.finished.then(() => {
      if (state.current.animation !== animation) return;
      state.current.animation = null;
      animation.cancel(); finish?.();
    }, () => {});
  };
  const close = (restoreFocus = false) => {
    if (!ref.current?.open || state.current.closing) return;
    state.current.closing = true;
    const computed = getComputedStyle(ref.current.querySelector(".gallery-controls-panel"));
    animate([{ opacity: computed.opacity, transform: computed.transform },
      { opacity: 0, transform: "translateY(8px) scale(.98)" }], 150, () => {
      ref.current.open = false; state.current.closing = false;
      if (restoreFocus) ref.current.querySelector("summary").focus({ preventScroll: true });
    });
  };
  useEffect(() => {
    const outside = (event) => { if (ref.current?.open && !ref.current.contains(event.target)) close(); };
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const finishMotion = (event) => { if (event.matches) state.current.animation?.finish(); };
    document.addEventListener("pointerdown", outside);
    preference.addEventListener("change", finishMotion);
    return () => { document.removeEventListener("pointerdown", outside); preference.removeEventListener("change", finishMotion); stop(); };
  }, []);
  return {
    onToggle: () => {
      if (!ref.current.open) { stop(); return; }
      stop(); latestOpen.current();
      animate([{ opacity: 0, transform: "translateY(12px) scale(.97)" }, { opacity: 1, transform: "none" }], 260);
    },
    onSummaryClick: (event) => { if (ref.current.open) { event.preventDefault(); close(); } },
    onKeyDown: (event) => { if (event.key === "Escape") { event.preventDefault(); close(true); } },
  };
}
