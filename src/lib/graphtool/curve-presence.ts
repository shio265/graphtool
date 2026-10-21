import type { GraphCurve } from "./types";

// Keep the last geometry of removed curves until their exit animation completes.
// A curve selected again takes over its existing path instead of duplicating it.
export function retainRemovedCurves(previous: GraphCurve[], current: GraphCurve[], exiting: GraphCurve[]): GraphCurve[] {
  const active = new Set(current.map((curve) => curve.id));
  const removed = new Map<string, GraphCurve>();
  for (const curve of [...exiting, ...previous]) if (!active.has(curve.id)) removed.set(curve.id, curve);
  return [...removed.values()];
}
