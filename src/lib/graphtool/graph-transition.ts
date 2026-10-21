import type { GraphCurve } from "./types";

export function interpolateGraphCurves(previous: GraphCurve[], next: GraphCurve[], progress: number): GraphCurve[] {
  if (progress >= 1) return next;
  const sources = new Map(previous.map((curve) => [curve.id, curve]));
  return next.map((curve) => {
    const source = sources.get(curve.id);
    if (!source || source.points.length !== curve.points.length) return curve;
    return {
      ...curve,
      points: curve.points.map(([frequency, value], index) => {
        const [oldFrequency, oldValue] = source.points[index];
        return [frequency, oldFrequency === frequency ? oldValue + (value - oldValue) * progress : value];
      }),
    };
  });
}
