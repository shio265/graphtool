/* Biquad equations: AutoEq (jaakkopasanen) / biquad-coeffs-cookbook (mohayonao) */
import { interpolate } from "./data";
import type { AutoEQOptions, Filter, ResponseCurve } from "./types";

export type Coefficients = [number, number, number, number, number, number];
export const defaultSampleRate = 48000;
const deltas = [[10, 10, 10, 5, 0.1, 0.5], [10, 10, 10, 2, 0.1, 0.2], [10, 10, 10, 1, 0.1, 0.1]];
export const defaultAutoEQOptions: AutoEQOptions = { freqRange: [20, 20000], gainRange: [-12, 12], qRange: [0.1, 2] };
export const enabledFilters = (filters: Filter[]) => filters.filter((filter) => !filter.disabled && filter.freq && filter.q && filter.gain);

export function biquad(filter: Filter, sampleRate = defaultSampleRate): Coefficients {
  const frequency = Math.max(1e-6, Math.min(filter.freq / sampleRate, 1));
  const q = Math.max(1e-4, Math.min(filter.q, 1000));
  const gain = Math.max(-40, Math.min(filter.gain, 40));
  const w = 2 * Math.PI * frequency, sine = Math.sin(w), cosine = Math.cos(w);
  const a = 10 ** (gain / 40), alpha = sine / (2 * q), modified = 2 * Math.sqrt(a) * alpha || 0;
  let a0: number, a1: number, a2: number, b0: number, b1: number, b2: number;
  if (filter.type === "LSQ") {
    a0 = (a + 1) + (a - 1) * cosine + modified;
    a1 = -2 * ((a - 1) + (a + 1) * cosine);
    a2 = (a + 1) + (a - 1) * cosine - modified;
    b0 = a * ((a + 1) - (a - 1) * cosine + modified);
    b1 = 2 * a * ((a - 1) - (a + 1) * cosine);
    b2 = a * ((a + 1) - (a - 1) * cosine - modified);
  } else if (filter.type === "HSQ") {
    a0 = (a + 1) - (a - 1) * cosine + modified;
    a1 = 2 * ((a - 1) - (a + 1) * cosine);
    a2 = (a + 1) - (a - 1) * cosine - modified;
    b0 = a * ((a + 1) + (a - 1) * cosine + modified);
    b1 = -2 * a * ((a - 1) + (a + 1) * cosine);
    b2 = a * ((a + 1) + (a - 1) * cosine - modified);
  } else {
    a0 = 1 + alpha / a; a1 = -2 * cosine; a2 = 1 - alpha / a;
    b0 = 1 + alpha * a; b1 = -2 * cosine; b2 = 1 - alpha * a;
  }
  return [1, a1 / a0, a2 / a0, b0 / a0, b1 / a0, b2 / a0];
}

export function calculateGains(frequencies: number[], coefficients: Coefficients[], sampleRate = defaultSampleRate): number[] {
  return frequencies.map((frequency) => coefficients.reduce((gain, [a0, a1, a2, b0, b1, b2]) => {
    const phi = 4 * Math.sin(Math.PI * frequency / sampleRate) ** 2;
    return gain + 10 * Math.log10((b0 + b1 + b2) ** 2 + (b0 * b2 * phi - (b1 * (b0 + b2) + 4 * b0 * b2)) * phi)
      - 10 * Math.log10((a0 + a1 + a2) ** 2 + (a0 * a2 * phi - (a1 * (a0 + a2) + 4 * a0 * a2)) * phi);
  }, 0));
}

export function filterCoefficients(filters: Filter[], sampleRate = defaultSampleRate): Coefficients[] {
  return enabledFilters(filters).map((filter) => biquad(filter, sampleRate));
}

export function applyEQ(curve: ResponseCurve, filters: Filter[], sampleRate = defaultSampleRate): ResponseCurve {
  const gains = calculateGains(curve.map(([frequency]) => frequency), filterCoefficients(filters, sampleRate), sampleRate);
  return curve.map(([frequency, spl], index) => [frequency, spl + gains[index]]);
}

export function calculatePreamp(filters: Filter[], frequencies: number[]): number {
  const gains = calculateGains(frequencies, filterCoefficients(filters));
  return gains.length ? -Math.max(...gains) : 0;
}

export function graphicEQ(filters: Filter[]): ResponseCurve {
  const rawFrequencies = Array.from({ length: Math.ceil(Math.log(1000) / Math.log(1.0072)) }, (_, index) => 20 * 1.0072 ** index);
  const frequencies = [...new Set(Array.from({ length: Math.ceil(Math.log(1000) / Math.log(1.0563)) }, (_, index) => Math.floor(20 * 1.0563 ** index)))].sort((a, b) => a - b);
  const gains = calculateGains(rawFrequencies, filterCoefficients(filters));
  let index = 0;
  const result: ResponseCurve = frequencies.map((frequency, j) => {
    const to = j < frequencies.length - 1 ? Math.sqrt(frequency * frequencies[j + 1]) : 20000;
    const points: number[] = [];
    for (; index < rawFrequencies.length && rawFrequencies[index] < to; index++) points.push(gains[index]);
    return [frequency, points.length ? points.reduce((a, b) => a + b, 0) / points.length : 0];
  });
  const maximum = Math.max(...result.map(([, value]) => value));
  return result.map(([frequency, value]) => [frequency, value - maximum]);
}

export function responseDistance(a: ResponseCurve, b: ResponseCurve): number {
  return a.reduce((sum, [, value], index) => {
    const difference = Math.abs(value - b[index][1]);
    return sum + (difference >= 0.1 ? difference : 0);
  }, 0) / a.length;
}

function candidates(curve: ResponseCurve, target: ResponseCurve, threshold: number, options: AutoEQOptions): Filter[] {
  let state = 0, startIndex = -1;
  const filters: Filter[] = [];
  for (let index = 0; index < curve.length; index++) {
    const [frequency, value] = curve[index];
    const difference = value - target[index][1];
    const next = Math.abs(difference) < threshold ? 0 : Math.sign(difference);
    if (next === state) continue;
    if (startIndex >= 0) {
      if (state !== 0) {
        const start = curve[startIndex][0], center = Math.sqrt(start * frequency);
        const gain = interpolate([center], target.slice(startIndex, index))[0][1] - interpolate([center], curve.slice(startIndex, index))[0][1];
        if (center >= options.freqRange[0] && center <= options.freqRange[1]) filters.push({ type: "PK", freq: center, q: center / (frequency - start), gain });
      }
      startIndex = -1;
    } else startIndex = index;
    state = next;
  }
  return filters;
}

function frequencyUnit(frequency: number): number {
  return frequency < 100 ? 1 : frequency < 1000 ? 10 : frequency < 10000 ? 100 : 1000;
}

function strip(filters: Filter[], options: AutoEQOptions): Filter[] {
  return filters.map((filter) => ({
    type: filter.type,
    freq: Math.floor(filter.freq - filter.freq % frequencyUnit(filter.freq)),
    q: Math.min(Math.max(Math.floor(filter.q * 10) / 10, options.qRange[0]), options.qRange[1]),
    gain: Math.min(Math.max(Math.floor(filter.gain * 10) / 10, options.gainRange[0]), options.gainRange[1]),
  }));
}

function optimize(curve: ResponseCurve, target: ResponseCurve, input: Filter[], iteration: number, options: AutoEQOptions, reverse = false): Filter[] {
  const filters = strip(input, options);
  const [minFrequency, maxFrequency] = options.freqRange, [minQ, maxQ] = options.qRange, [minGain, maxGain] = options.gainRange;
  const [maxDF, maxDQ, maxDG, stepDF, stepDQ, stepDG] = deltas[iteration];
  const [begin, end, step] = reverse ? [filters.length - 1, -1, -1] : [0, filters.length, 1];
  for (let index = begin; index !== end; index += step) {
    const filter = filters[index];
    const without = applyEQ(curve, filters.filter((_, i) => i !== index));
    let best = filter, distance = responseDistance(applyEQ(without, [filter]), target);
    const test = (df: number, dq: number, dg: number) => {
      const freq = filter.freq + df * frequencyUnit(filter.freq) * stepDF;
      const q = filter.q + dq * stepDQ, gain = filter.gain + dg * stepDG;
      if (freq < minFrequency || freq > maxFrequency || q < minQ || q > maxQ || gain < minGain || gain > maxGain) return false;
      const candidate = { type: filter.type, freq, q, gain };
      const next = responseDistance(applyEQ(without, [candidate]), target);
      if (next < distance) { best = candidate; distance = next; return true; }
      return false;
    };
    for (let df = -maxDF; df < maxDF; df++) {
      for (let dq = maxDQ - 1; dq >= -maxDQ; dq--) {
        for (let dg = 1; dg < maxDG; dg++) if (!test(df, dq, dg)) break;
        for (let dg = -1; dg >= -maxDG; dg--) if (!test(df, dq, dg)) break;
      }
    }
    filters[index] = best;
  }
  if (!reverse) return optimize(curve, target, filters, iteration, options, true);
  filters.sort((a, b) => a.freq - b.freq);
  for (let index = 0; index < filters.length - 1;) {
    const a = filters[index], b = filters[index + 1];
    if (Math.abs(a.freq - b.freq) <= frequencyUnit(a.freq) && Math.abs(a.q - b.q) <= 0.1) { a.gain += b.gain; filters.splice(index + 1, 1); }
    else index++;
  }
  let bestDistance = responseDistance(applyEQ(curve, filters), target);
  for (let index = 0; index < filters.length;) {
    if (Math.abs(filters[index].gain) <= 0.1) { filters.splice(index, 1); continue; }
    const distance = responseDistance(applyEQ(curve, filters.filter((_, i) => i !== index)), target);
    if (distance < bestDistance) { filters.splice(index, 1); bestDistance = distance; }
    else index++;
  }
  return filters;
}

export function autoEQ(curve: ResponseCurve, target: ResponseCurve, maxFilters: number, options = defaultAutoEQOptions): Filter[] {
  if (!curve.length || curve.length !== target.length) throw new Error("AutoEQ requires aligned frequency responses.");
  if ([options.freqRange, options.gainRange, options.qRange].some(([from, to]) => !Number.isFinite(from) || !Number.isFinite(to) || from > to)) throw new Error("Invalid AutoEQ ranges.");
  const firstSize = Math.max(Math.floor(maxFilters / 2) - 1, 1);
  let first = candidates(curve, target, 1, options).filter((filter) => filter.freq <= 7000).sort((a, b) => a.q - b.q).slice(0, firstSize).sort((a, b) => a.freq - b.freq);
  for (let i = 0; i < deltas.length; i++) first = optimize(curve, target, first, i, options);
  const secondCurve = applyEQ(curve, first);
  let second = candidates(secondCurve, target, 0.5, options).sort((a, b) => a.q - b.q).slice(0, maxFilters - first.length).sort((a, b) => a.freq - b.freq);
  for (let i = 0; i < deltas.length; i++) second = optimize(secondCurve, target, second, i, options);
  let result = first.concat(second);
  for (let i = 0; i < deltas.length; i++) result = optimize(curve, target, result, i, options);
  return strip(result, options);
}
