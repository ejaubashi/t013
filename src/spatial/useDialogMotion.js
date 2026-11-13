import { useEffect, useRef } from "react";

const easeOut = "cubic-bezier(.16,1,.3,1)";
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const narrow = () => matchMedia("(max-width: 600px)").matches;

// Native modal semantics remain active through exit. Navigation runs only
// after close(), so a departing dialog never cancels the next room transfer.
export function useDialogMotion(ref, onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const state = useRef({ mounted: false, closing: false, animation: null, drag: null });

  const animate = (frames, duration, finished) => {
    const current = state.current, dialog = ref.current;
    current.animation?.cancel();
    if (reduced() || !dialog.animate) { finished?.(); return; }
    const animation = dialog.animate(frames, { duration, easing: easeOut, fill: "both" });
    current.animation = animation;
    animation.finished.then(() => {
      if (!current.mounted || current.animation !== animation) return;
      current.animation = null;
      animation.cancel();
      finished?.();
    }, () => {});
  };

  useEffect(() => {
    const current = state.current, dialog = ref.current, previous = document.activeElement;
    current.mounted = true;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const finishMotion = (event) => { if (event.matches) current.animation?.finish(); };
    preference.addEventListener("change", finishMotion);
    dialog.dataset.state = "open";
    dialog.showModal();
    animate([
      { opacity: 0, transform: narrow() ? "translateY(44px)" : "translateY(18px) scale(.975)" },
      { opacity: 1, transform: "none" },
    ], 320);
    return () => {
      current.mounted = false;
      preference.removeEventListener("change", finishMotion);
      current.animation?.cancel();
      dialog.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  const close = (after = closeRef.current, swipe = false) => {
    const current = state.current, dialog = ref.current;
    if (!current.mounted || current.closing) return;
    current.closing = true;
    dialog.dataset.state = "closing";
    const computed = getComputedStyle(dialog);
    animate([
      { opacity: computed.opacity, transform: computed.transform },
      { opacity: 0, transform: narrow() ? `translateY(${swipe ? "65svh" : "30px"})` : "translateY(10px) scale(.985)" },
    ], 170, () => { dialog.close(); after(); });
  };

  const settleDrag = (event, cancel = false) => {
    const current = state.current, drag = current.drag;
    if (!drag) return;
    current.drag = null;
    const distance = Math.max(0, event.clientY - drag.y);
    const velocity = distance / Math.max(1, performance.now() - drag.time);
    if (!cancel && (distance > 100 || (distance > 35 && velocity > 0.6))) { close(undefined, true); return; }
    const dialog = ref.current;
    animate([{ transform: getComputedStyle(dialog).transform }, { transform: "none" }], 260,
      () => dialog.style.removeProperty("transform"));
  };

  const dragProps = {
    onPointerDown: (event) => {
      if (!narrow() || event.pointerType !== "touch" || event.target.closest("button") || state.current.closing) return;
      state.current.animation?.cancel();
      state.current.animation = null;
      state.current.drag = { y: event.clientY, time: performance.now() };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event) => {
      const drag = state.current.drag;
      if (!drag) return;
      const distance = Math.max(0, event.clientY - drag.y);
      ref.current.style.transform = `translateY(${distance * 0.8}px)`;
    },
    onPointerUp: (event) => settleDrag(event),
    onPointerCancel: (event) => settleDrag(event, true),
    onLostPointerCapture: (event) => settleDrag(event, true),
  };
  return { close, dragProps };
}
