import { HidError, type DeviceInfo, type EqConfigInput, type Limits } from "@shio265/moondrop-hid";
import { config, emptyFilter } from "./config";
import type { AutoEQOptions, Filter, Range } from "./types";

export function deviceBandLimit(device: DeviceInfo | null) {
  return device ? Math.max(1, Math.min(config.eqBandsMax, device.limits.maxFilters)) : config.eqBandsMax;
}

export function limitEQFilters(filters: Filter[], limit: number): Filter[] {
  return filters.length ? filters.slice(0, limit) : [emptyFilter()];
}

export function eqFilterRanges(limits?: Limits): AutoEQOptions {
  return {
    freqRange: [20, 20000],
    gainRange: [limits?.minGain ?? -40, limits?.maxGain ?? 40],
    qRange: [limits?.minQ ?? 0.1, limits?.maxQ ?? 20],
  };
}

export function deviceAutoEQOptions(options: AutoEQOptions, limits?: Limits): AutoEQOptions {
  if (!limits) return options;
  const ranges = eqFilterRanges(limits);
  const restrict = (range: Range, [min, max]: Range): Range => range.map((value) => Math.max(min, Math.min(max, value))) as Range;
  return { freqRange: restrict(options.freqRange, ranges.freqRange), gainRange: restrict(options.gainRange, ranges.gainRange), qRange: restrict(options.qRange, ranges.qRange) };
}

// Validate before handing data to the SDK: never silently change an audible band.
// Empty editor rows and bypassed bands become explicit flat bands on the device.
export function deviceEQConfig(filters: Filter[], device: DeviceInfo, preamp: number): EqConfigInput {
  if (!filters.length || filters.length > device.limits.maxFilters) throw new Error(`This device accepts 1–${device.limits.maxFilters} EQ bands.`);
  const limits = device.limits;
  const prepared = filters.map((filter, index): Filter => {
    if (filter.disabled || filter.freq === 0 && filter.gain === 0 && filter.q === 0) return { type: "PK", freq: 100, gain: 0, q: 1, disabled: true };
    const band = `Filter ${index + 1}`;
    if (!limits.filterTypes.includes(filter.type)) throw new Error(`${band}: ${device.model} does not support ${filter.type}. Choose ${limits.filterTypes.join(" / ")}.`);
    if (!Number.isInteger(filter.freq) || filter.freq < 20 || filter.freq > 20000) throw new Error(`${band}: frequency must be a whole number from 20 to 20000 Hz.`);
    if (!Number.isFinite(filter.gain) || filter.gain < limits.minGain || filter.gain > limits.maxGain) throw new Error(`${band}: ${device.model} accepts gain from ${limits.minGain} to ${limits.maxGain} dB.`);
    if (!Number.isFinite(filter.q) || filter.q < limits.minQ || filter.q > limits.maxQ) throw new Error(`${band}: ${device.model} accepts Q from ${limits.minQ} to ${limits.maxQ}.`);
    return { ...filter };
  });
  const gain = limits.supportsManualGlobalGain ? preamp : 0;
  if (!Number.isFinite(gain) || gain < -128 || gain > 127) throw new Error("EQ preamp must be between -128 and 127 dB.");
  // Match the single Pre-amp value shown in the EQ editor, without retaining
  // a separate device gain or applying a second preamp on device-managed DACs.
  return { filters: prepared, globalGain: Number(gain.toFixed(1)) };
}

export function deviceEQError(error: unknown): Error {
  if (error instanceof HidError) {
    if (error.code === "UNSUPPORTED_DEVICE") return new Error("This device is not supported. See Support list in Connect Device for compatible USB/DAC models.");
    if (error.code === "EXPERIMENTAL_DEVICE") return new Error("This device is experimental and is not enabled. See Support list in Connect Device for more information.");
    if (error.code === "UNSUPPORTED_ENVIRONMENT") return new Error("WebHID is not available in this browser. Try to use another browser like Chrome or Edge.");
    if (error.code === "INCOMPLETE_READ") return new Error("The device did not return a complete configuration. Your EQ filters have not been replaced. Reconnect and try Load EQ again.");
    if (error.code === "DEVICE_DISCONNECTED") return new Error("The USB/DAC disconnected during the operation. Reconnect before loading or saving EQ.");
  }
  return error instanceof Error ? error : new Error(String(error));
}
