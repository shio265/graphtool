"use client";

import { animate, scrambleText } from "animejs";
import { useLayoutEffect, useRef, type RefObject } from "react";

export function useScrambleText(ref: RefObject<HTMLSpanElement | null>, text: string, active: boolean) {
  const previous = useRef({ text, active });
  const interrupted = useRef<string | null>(null);

  useLayoutEffect(() => {
    const source = previous.current;
    previous.current = { text, active };
    const element = ref.current;
    const visual = element?.querySelector<HTMLElement>("[data-scramble-visual]");
    if (!element || !visual) return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reset = () => {
      element.removeAttribute("data-scrambling");
      visual.textContent = "";
    };
    if (!active || !source.active || source.text === text || preference.matches) {
      interrupted.current = null;
      reset();
      return;
    }

    visual.textContent = interrupted.current ?? source.text;
    interrupted.current = null;
    element.dataset.scrambling = "true";
    const animation = animate(visual, {
      innerHTML: scrambleText({ text, duration: 500, settleDuration: 150, chars: "lowercase", override: false }),
      onComplete: reset,
    });
    const reduce = () => { if (preference.matches) animation.complete(); };
    preference.addEventListener("change", reduce);

    return () => {
      // A fast click continues from the visible letters, not an old destination.
      interrupted.current = visual.textContent || null;
      animation.cancel();
      reset();
      preference.removeEventListener("change", reduce);
    };
  }, [ref, text, active]);
}
