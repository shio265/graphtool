import type { Filter, Normalization } from "./types";

export const config = {
  title: "Shiori Graph Tool (CrinGraph)",
  description: "View and compare frequency response graphs for earphones/headphones.",
  modelDirectory: "/data/models/",
  targetDirectory: "/data/targets/",
  smoothing: 5,
  normalization: { mode: "dB", db: 60, hz: 500 } satisfies Normalization,
  maxChannelImbalance: 5,
  eqBands: 10,
  eqBandsMax: 20,
  stickyGraph: true,
  stickyLabels: true,
} as const;

export function emptyFilter(): Filter {
  return { type: "PK", freq: 0, gain: 0, q: 0 };
}

// Preserve the legacy tool's rounded 1/48-octave frequency grid.
export const frequencies = (() => {
  const values = [20];
  const step = 2 ** (1 / 48);
  while (values[values.length - 1] < 20000) {
    let value = Math.round(values[values.length - 1] * step * 10) / 10;
    if (value >= 1000) value = Math.round(value / 10) * 10;
    else if (value >= 100) value = Math.round(value);
    values.push(value);
  }
  values[values.length - 1] = 20000;
  return values;
})();
