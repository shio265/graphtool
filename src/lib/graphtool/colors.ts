import chroma from "chroma-js";

const sequence = 1.1673039782614187;

function hclColor(hue: number, chromaticity: number, lightness: number): string {
  // The legacy palette uses D50, not chroma-js's default D65. Scope the
  // reference point to this synchronous conversion so other callers keep theirs.
  const whitePoint = chroma.getLabWhitePoint();
  try {
    chroma.setLabWhitePoint("D50");
    return chroma.hcl(hue, chromaticity, lightness).hex("rgb");
  } finally {
    chroma.setLabWhitePoint(whitePoint);
  }
}

export function curveColor(id: number, channel = 0): string {
  const p2 = sequence ** 2, p3 = sequence ** 3;
  const t = channel / 32;
  let i = id / p3 + 0.76;
  const j = id / p2 + 0.79, k = id / sequence + 0.32;
  if (id < 0) return hclColor(360 * (1 - (-i) % 1), 5, 66);
  const angle = 2 * Math.PI * i;
  i += Math.cos(angle - 0.3) / 24 + Math.cos(6 * angle) / 32;
  const sine = Math.sin(2 * Math.PI * i);
  return hclColor(360 * ((i + t / p2) % 1), 88 + 30 * (j % 1 + 1.3 * sine - t / p3), 36 + 22 * (k % 1 + 1.1 * sine + 6 * t * (1 - sine)));
}

export function contrastTextColor(background: string): "#000000" | "#ffffff" {
  const luminance = chroma(background).luminance();
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? "#000000" : "#ffffff";
}

export function nextColorId(start: number, pinned: number[]): number {
  let chosen = start;
  const distance = (id: number) => Math.min(...pinned.map((pin) => Math.abs(((id - pin) / sequence ** 3 + 0.5) % 1 - 0.5)));
  let best = distance(start);
  for (let candidate = start + 1; best < 0.12 && candidate < start + 3; candidate++) {
    const value = distance(candidate);
    if (value > best) { best = value; chosen = candidate; }
  }
  return chosen;
}
