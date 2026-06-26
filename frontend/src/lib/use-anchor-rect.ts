"use client";

import { useEffect, useState, type RefObject } from "react";

// Tracks an anchor element's viewport rect while `open`, re-measuring on resize
// and scroll. Used to position portal popovers (select, autocomplete, calendar).
export function useAnchorRect<T extends HTMLElement>(ref: RefObject<T | null>, open: boolean) {
  const [rect, setRect] = useState<DOMRect>();
  useEffect(() => {
    if (!open) return;
    const update = () => setRect(ref.current?.getBoundingClientRect());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, ref]);
  return rect;
}
