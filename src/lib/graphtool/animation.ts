"use client";

import { animate, spring } from "animejs";
import { SPRING_PRESETS } from "morphicons";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { retainRemovedCurves } from "./curve-presence";
import { interpolateGraphCurves } from "./graph-transition";
import type { GraphCurve } from "./types";
import { animateDom, readDomTranslation, type DomMotion } from "./dom-motion";

export function motionDuration(duration: number): number {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : duration;
}

export function useIconMorphProgress(active: boolean) {
  const [progress, setProgress] = useState(active ? 1 : 0);
  const current = useRef({ value: active ? 1 : 0 });
  useLayoutEffect(() => {
    const position = current.current;
    const target = active ? 1 : 0;
    if (position.value === target) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const smooth = SPRING_PRESETS.smooth;
    const smoothSpring = spring({ stiffness: smooth.k, damping: smooth.c, mass: 1 });
    // Morphicons owns the shape; animejs drives its controlled progress with
    // the same smooth physics, playing twice as fast without changing damping.
    const animation = animate(position, {
      value: target, playbackRate: 2,
      ease: preference.matches ? "linear" : smoothSpring,
      duration: preference.matches ? 0 : smoothSpring.duration,
      onUpdate: () => setProgress(position.value),
      onComplete: () => { position.value = target; setProgress(target); },
    });
    const reduce = () => { if (preference.matches) animation.complete(); };
    preference.addEventListener("change", reduce);
    return () => { animation.pause(); preference.removeEventListener("change", reduce); };
  }, [active]);
  return progress;
}

export function useCurvePresence(curves: GraphCurve[]) {
  const [state, setState] = useState(() => ({ previous: curves, exiting: [] as GraphCurve[] }));
  let exiting = state.exiting;
  if (state.previous !== curves) {
    exiting = retainRemovedCurves(state.previous, curves, exiting);
    setState({ previous: curves, exiting });
  }
  const activeCurveIds = useMemo(() => new Set(curves.map((curve) => curve.id)), [curves]);
  const finishExit = useCallback((id: string) => {
    setState((previous) => previous.exiting.some((curve) => curve.id === id)
      ? { ...previous, exiting: previous.exiting.filter((curve) => curve.id !== id) }
      : previous);
  }, []);
  return { renderedCurves: [...curves, ...exiting], activeCurveIds, finishExit };
}

export function useCurveReveal(ref: RefObject<SVGRectElement | null>, present: boolean, width: number, curveId: string, onExit: (id: string) => void) {
  const progress = useRef({ value: 0 });
  useLayoutEffect(() => {
    const rectangle = ref.current;
    if (!rectangle) return;
    const current = progress.current;
    const target = present ? 1 : 0;
    const update = () => rectangle.setAttribute("width", String(width * current.value));
    const complete = () => {
      current.value = target;
      update();
      if (!present) onExit(curveId);
    };
    const duration = motionDuration(present ? 500 : 300) * Math.abs(target - current.value);
    if (!duration) { complete(); return; }
    // Resume from the current reveal when a fast re-selection interrupts exit.
    const animation = animate(current, { value: target, duration, ease: "inOutCubic", onUpdate: update, onComplete: complete });
    return () => { animation.pause(); };
  }, [ref, present, width, curveId, onExit]);
}

export function useAnimatedRange(from: number, to: number, duration = 700): [number, number] {
  const [range, setRange] = useState<[number, number]>([from, to]);
  const current = useRef({ low: from, high: to });
  useEffect(() => {
    const animation = animate(current.current, {
      low: from, high: to, duration: motionDuration(duration), ease: "inOutQuad",
      onUpdate: () => setRange([current.current.low, current.current.high]),
      onComplete: () => setRange([from, to]),
    });
    return () => { animation.pause(); };
  }, [from, to, duration]);
  return range;
}

export function useAnimatedGraphView(curves: GraphCurve[], baselineKey: string | null, low: number, high: number) {
  const [view, setView] = useState(() => ({ curves, low, high, transforming: false }));
  const current = useRef(view);
  const baseline = useRef(baselineKey);
  const animation = useRef<ReturnType<typeof animate> | null>(null);
  const finishBaseline = useCallback(() => {
    if (current.current.transforming) animation.current?.complete();
  }, []);

  useLayoutEffect(() => {
    const source = current.current;
    const transforming = baseline.current !== baselineKey || source.transforming;
    baseline.current = baselineKey;
    const position = { low: source.low, high: source.high, progress: 0 };
    const publish = (complete = false) => {
      const next = {
        curves: transforming && !complete ? interpolateGraphCurves(source.curves, curves, position.progress) : curves,
        low: complete ? low : position.low,
        high: complete ? high : position.high,
        transforming: transforming && !complete,
      };
      current.current = next;
      setView(next);
    };
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches || !transforming && source.low === low && source.high === high) {
      publish(true);
      return;
    }
    // Curves and the Y domain share one clock: no final geometry in the old
    // coordinate system, and interrupted baselines resume from the visible frame.
    publish();
    const controller = animate(position, {
      low, high, progress: 1, duration: 400, ease: "inOutQuad",
      onUpdate: () => publish(), onComplete: () => publish(true),
    });
    animation.current = controller;
    const reduce = () => { if (preference.matches) controller.complete(); };
    preference.addEventListener("change", reduce);
    return () => { controller.pause(); preference.removeEventListener("change", reduce); };
  }, [curves, baselineKey, low, high]);

  return { ...view, finishBaseline };
}

export function useDrawerMotion(ref: RefObject<HTMLElement | null>, focused: "primary" | "secondary") {
  const position = useRef({ mobile: false });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const current = position.current;
    let animation: DomMotion | undefined;
    const update = (animateChange: boolean) => {
      animation?.cancel();
      if (window.innerWidth > 1000) { current.mobile = false; element.style.transform = ""; return; }
      const expanded = window.innerWidth * 0.44 + 92;
      const destination = focused === "secondary" ? expanded : expanded + element.offsetHeight - 84;
      // Match the server-rendered CSS before paint; mounting/resizing is not a drawer gesture.
      const duration = animateChange && current.mobile ? motionDuration(400) : 0;
      current.mobile = true;
      // Read the actual displayed transform, including an interrupted native
      // animation; never start a gesture from an old numeric destination.
      animation = animateDom(element, {
        from: { transform: `translateY(${readDomTranslation(element, "y")}px)` },
        to: { transform: `translateY(${destination}px)` }, duration, ease: "outCubic",
      });
    };
    update(true);
    const resize = () => update(false);
    window.addEventListener("resize", resize);
    return () => { animation?.cancel(); window.removeEventListener("resize", resize); };
  }, [ref, focused]);
}

export function useListMotion(ref: RefObject<HTMLDivElement | null>, selected: string) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let animation: DomMotion | undefined;
    const update = (animateChange: boolean) => {
      animation?.cancel();
      const wide = window.innerWidth >= 1500 && window.innerWidth / window.innerHeight >= 2;
      const destination = selected === "brands" && !wide ? Math.max(0, element.offsetWidth - 60) : 0;
      animation = animateDom(element, {
        from: { transform: `translateX(${readDomTranslation(element, "x")}px)` },
        to: { transform: `translateX(${destination}px)` }, duration: animateChange ? motionDuration(300) : 0, ease: "outCubic",
      });
    };
    update(true);
    const resize = () => update(false);
    window.addEventListener("resize", resize);
    return () => { animation?.cancel(); window.removeEventListener("resize", resize); };
  }, [ref, selected]);
}

export function useModelListReveal(ref: RefObject<HTMLDivElement | null>, revealKey: number) {
  useLayoutEffect(() => {
    const list = ref.current;
    if (!list) return;
    list.scrollTop = 0;
    if (!motionDuration(400)) return;

    // Stagger only the visible rows, so long catalogs never delay offscreen models.
    const bounds = list.getBoundingClientRect();
    const items = [...list.querySelectorAll<HTMLElement>(".phone-item")].filter((item) => {
      const row = item.getBoundingClientRect();
      return row.bottom > bounds.top && row.top < bounds.bottom;
    });
    if (!items.length) return;
    const step = Math.min(40, 320 / Math.max(1, items.length - 1));
    const animations = items.map((item, index) => animateDom(item, {
      from: { opacity: "0", transform: "translateY(-12px)" },
      to: { opacity: "1", transform: "translateY(0px)" }, duration: 400, ease: "outCubic", delay: index * step,
      onComplete: (animation) => { animation.revert(); },
    }));
    // Restore reused rows before another brand interrupts the entrance.
    return () => { animations.forEach((animation) => animation.revert()); };
  }, [ref, revealKey]);
}

export function useSelectorPanelMotion(ref: RefObject<HTMLDivElement | null>, showEqualizer: boolean) {
  useLayoutEffect(() => {
    const track = ref.current;
    if (!track) return;
    const target = showEqualizer ? 1 : 0;
    // The track is twice the viewport width; percentages also track resizes.
    const distance = track.getBoundingClientRect().width / 2;
    const progress = distance ? Math.min(1, Math.max(0, -readDomTranslation(track, "x") / distance)) : target;
    const animation = animateDom(track, {
      from: { transform: `translateX(${-50 * progress}%)` }, to: { transform: `translateX(${-50 * target}%)` },
      midpoint: { transform: `translateX(${-25 * (progress + target)}%)` },
      duration: motionDuration(360) * Math.abs(target - progress), ease: "inOutCubic",
    });
    return () => { animation.cancel(); };
  }, [ref, showEqualizer]);
}

export function useHeightMotion(ref: RefObject<HTMLDivElement | null>, contentRef: RefObject<HTMLElement | null>, open: boolean, contentKey?: number | null) {
  useLayoutEffect(() => {
    const element = ref.current;
    const content = contentRef.current;
    if (!element || !content) return;

    let animation: ReturnType<typeof animate> | undefined;
    let targetHeight = -1;
    const update = () => {
      // Measure the intrinsic content, not the clipped/collapsed outer panel.
      const height = open ? Math.ceil(content.getBoundingClientRect().height) : 0;
      if (height === targetHeight) return;
      targetHeight = height;
      animation?.pause();
      // Animate actual layout height so every following section, including
      // Targets, moves continuously even when switching to shorter content.
      animation = animate(element, { height, duration: motionDuration(300), ease: "inOutCubic" });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(content);
    return () => { observer.disconnect(); animation?.pause(); };
  }, [ref, contentRef, open, contentKey]);
}
