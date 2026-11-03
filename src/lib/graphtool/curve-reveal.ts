import { graphDimensions } from "./graph";

export function curveRevealClip(progress: number, width: number): string {
  const { left, width: viewportWidth } = graphDimensions;
  return `inset(0px ${viewportWidth - left - width * progress}px 0px ${left}px) view-box`;
}

export function readCurveReveal(clip: string, width: number, fallback: number): number {
  // Computed styles can collapse four inset values into two.
  const values = /^inset\(([^)]+)\)/.exec(clip)?.[1].trim().split(/\s+/);
  if (!values || !width) return fallback;
  const right = Number.parseFloat(values[1] ?? values[0]);
  if (!Number.isFinite(right)) return fallback;
  return Math.min(1, Math.max(0, (graphDimensions.width - graphDimensions.left - right) / width));
}
