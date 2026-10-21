import { animate, utils, waapi } from "animejs";

type DomProperty = "opacity" | "transform";
type DomStyles = Partial<Record<DomProperty, string>>;

// Native CSS easings avoid the linear() sampling/custom-transform variables
// that can prevent compositor acceleration, especially on Safari.
export const domEasings = {
  linear: "linear",
  inCubic: "cubic-bezier(0.3333333333333333, 0, 0.6666666666666666, 0)",
  outQuad: "cubic-bezier(0.3333333333333333, 0.6666666666666666, 0.6666666666666666, 1)",
  outCubic: "cubic-bezier(0.3333333333333333, 1, 0.6666666666666666, 1)",
} as const;

export interface DomMotion {
  readonly engine: "waapi" | "js" | "none";
  /** Freeze the visible frame, not the underlying inline destination. */
  cancel: () => void;
  /** Restore only properties owned by this effect. */
  revert: () => void;
  complete: () => void;
}

interface DomMotionOptions {
  from?: DomStyles;
  to: DomStyles;
  duration: number;
  delay?: number;
  ease?: keyof typeof domEasings | "inOutCubic";
  /** Halfway geometry for exact inOutCubic using two native cubic segments. */
  midpoint?: DomStyles;
  onComplete?: (animation: DomMotion) => void;
}

export function readDomTranslation(element: HTMLElement, axis: "x" | "y"): number {
  const transform = getComputedStyle(element).transform;
  if (!transform || transform === "none") return 0;
  const matrix = new DOMMatrixReadOnly(transform);
  return axis === "x" ? matrix.m41 : matrix.m42;
}

export function animateDom(element: HTMLElement, { from = {}, to, duration, delay = 0, ease = "linear", midpoint, onComplete }: DomMotionOptions): DomMotion {
  if (ease === "inOutCubic" && Object.keys(to).some((property) => midpoint?.[property as DomProperty] === undefined)) throw new Error("inOutCubic DOM motion requires halfway geometry for every property.");
  const properties = Object.keys(to) as DomProperty[];
  const original = properties.map((property) => ({ property, value: element.style.getPropertyValue(property), priority: element.style.getPropertyPriority(property) }));
  const computed = getComputedStyle(element);
  const start = Object.fromEntries(properties.map((property) => [property, from[property] ?? computed.getPropertyValue(property)])) as DomStyles;
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const moving = duration > 0 && !preference.matches && properties.some((property) => start[property] !== to[property]);
  const engine = moving ? typeof element.animate === "function" ? "waapi" : "js" : "none";
  let controller: ReturnType<typeof animate> | ReturnType<typeof waapi.animate> | undefined = undefined;
  let active = true;

  const write = (styles: DomStyles) => properties.forEach((property) => element.style.setProperty(property, styles[property] ?? ""));
  const detach = () => preference.removeEventListener("change", reduce);
  const stop = () => {
    if (!controller) return;
    controller.cancel();
    // Drain this controller's native lookups before restoring styles. Otherwise
    // animejs's asynchronous cancel handlers can commit those styles again.
    if (engine === "waapi") utils.remove(element, controller);
  };
  const finish = () => {
    if (!active) return;
    active = false;
    detach();
    // Keep authored percentages rather than WAAPI's committed pixel matrix so
    // selector panels stay responsive after the animation has finished.
    write(to);
    onComplete?.(animation);
  };
  const animation: DomMotion = {
    engine,
    cancel: () => {
      if (!active) return;
      const visible = getComputedStyle(element);
      const snapshot = Object.fromEntries(properties.map((property) => [property, visible.getPropertyValue(property)])) as DomStyles;
      active = false;
      detach();
      stop();
      write(snapshot);
    },
    revert: () => {
      animation.cancel();
      original.forEach(({ property, value, priority }) => {
        if (value) element.style.setProperty(property, value, priority);
        else element.style.removeProperty(property);
      });
    },
    complete: () => {
      if (!active) return;
      stop();
      finish();
    },
  };
  const reduce = () => { if (preference.matches) animation.complete(); };

  if (!moving) {
    finish();
    return animation;
  }
  write(start);
  preference.addEventListener("change", reduce);
  const segmented = engine === "waapi" && ease === "inOutCubic";
  const keyframes = Object.fromEntries(properties.map((property) => [property, segmented ? [start[property]!, midpoint![property]!, to[property]!] : [start[property]!, to[property]!]]));
  if (engine === "waapi") {
    controller = waapi.animate(element, { ...keyframes, duration, delay, ease: ease === "inOutCubic" ? domEasings.linear : domEasings[ease], onComplete: finish });
    // Configure once; animejs still owns playback and cleanup. A single CSS
    // ease-in-out approximation would move a 350px panel by up to 3.4px.
    if (segmented) controller.forEach((animation) => {
      const effect = animation.effect as KeyframeEffect;
      effect.setKeyframes(effect.getKeyframes().map((frame, index) => ({ ...frame, easing: index === 0 ? domEasings.inCubic : domEasings.outCubic })));
    });
  } else controller = animate(element, { ...keyframes, duration, delay, ease, onComplete: finish });
  return animation;
}
