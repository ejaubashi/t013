import { useEffect, useRef, useState } from "react";
import { GallerySoundscape } from "./galleryAudio";

export function useGalleryAudio(externalRef, onChange) {
  const [enabled, setEnabled] = useState(false), [message, setMessage] = useState("");
  const engine = useRef(null), callback = useRef(onChange), requested = useRef(false), generation = useRef(0), controller = useRef(null);
  callback.current = onChange;
  if (!controller.current) {
    const enable = async value => {
      const token = ++generation.current; requested.current = value;
      engine.current ||= new GallerySoundscape();
      try {
        const result = await engine.current.setEnabled(value);
        if (token !== generation.current) return;
        requested.current = result;
        setEnabled(result); callback.current?.(result); setMessage(value && !result ? "Sound is unavailable in this browser. You can continue quietly." : "");
      } catch {
        if (token !== generation.current) return;
        engine.current.enabled = false;
        requested.current = false; setEnabled(false); callback.current?.(false); setMessage("Tap sound to try again, or continue quietly.");
      }
    };
    controller.current = { enable, toggle: () => enable(!requested.current), get enabled() { return Boolean(engine.current?.enabled); },
      setRoom: id => { engine.current ||= new GallerySoundscape(); engine.current.setRoom(id); }, passage: () => engine.current?.passage(), pose: value => engine.current?.pose(value) };
  }
  useEffect(() => {
    if (externalRef) externalRef.current = controller.current;
    callback.current?.(false);
    return () => { generation.current++; engine.current?.dispose(); if (externalRef) externalRef.current = null; };
  }, []);
  return { ...controller.current, enabled, message };
}
