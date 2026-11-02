import type { Filter } from "./types";

export function roundFilterValue(value: number, decimalPlaces = 1): number {
  if (!Number.isFinite(value)) return value;
  const scale = 10 ** decimalPlaces;
  const rounded = Math.round((Math.abs(value) + Number.EPSILON) * scale) / scale;
  return rounded === 0 ? 0 : Math.sign(value) * rounded;
}

export function roundEQFilters(filters: Filter[]): Filter[] {
  return filters.map((filter) => ({ ...filter, freq: roundFilterValue(filter.freq, 0), gain: roundFilterValue(filter.gain), q: roundFilterValue(filter.q) }));
}
