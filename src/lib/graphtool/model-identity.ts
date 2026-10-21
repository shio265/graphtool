import type { Model } from "./types";

// Include the data category and brand, not just a potentially shared filename.
// Encode each segment separately so names containing commas or slashes stay distinct.
export function modelIdentity(model: Model): string {
  if (model.isDynamic) return `dynamic:${model.key}`;
  const file = encodeURIComponent(model.fileName);
  return model.isTarget ? `targets/${file}` : `models/${encodeURIComponent(model.brand)}/${file}`;
}

export function sameModel(a: Model, b: Model): boolean {
  if (a.isDynamic || b.isDynamic) return !!a.isDynamic === !!b.isDynamic && a.key === b.key;
  return !!a.isTarget === !!b.isTarget && a.brand === b.brand && (a.key === b.key || a.fileName === b.fileName);
}
