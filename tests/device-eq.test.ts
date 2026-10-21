import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { getSupportedDevices, HidError, type DeviceInfo } from "@shio265/moondrop-hid";
import { deviceAutoEQOptions, deviceBandLimit, deviceEQConfig, deviceEQError, eqFilterRanges, limitEQFilters } from "../src/lib/graphtool/device-eq";
import { emptyFilter, frequencies } from "../src/lib/graphtool/config";
import { calculatePreamp } from "../src/lib/graphtool/equalizer";
import type { AutoEQOptions, Filter } from "../src/lib/graphtool/types";

function device(model: string): DeviceInfo {
  const entry = getSupportedDevices().find((entry) => entry.model === model);
  if (!entry) throw new Error(`Missing SDK device ${model}`);
  return { ...entry, vendorId: entry.vendorIds[0], productId: 1 };
}

const peak = (): Filter => ({ type: "PK", freq: 1000, gain: -3, q: 1 });

describe("device EQ limits from the SDK registry", () => {
  test("uses the offline limit or the connected device's 5/8/9-band limit", () => {
    assert.equal(deviceBandLimit(null), 20);
    assert.equal(deviceBandLimit(device("Chu2 DSP")), 5);
    assert.equal(deviceBandLimit(device("DAWN PRO2")), 8);
    assert.equal(deviceBandLimit(device("FreeDSP")), 9);
  });

  test("caps every filter source without mutating it and keeps at least one row", () => {
    const filters = Array.from({ length: 20 }, peak);
    assert.deepEqual(limitEQFilters(filters, 8), filters.slice(0, 8));
    assert.equal(filters.length, 20);
    assert.deepEqual(limitEQFilters([], 8), [emptyFilter()]);
  });

  test("restricts AutoEQ to device gain and Q limits without changing offline options", () => {
    const options: AutoEQOptions = { freqRange: [20, 20000], gainRange: [-40, 40], qRange: [0.1, 20] };
    assert.deepEqual(deviceAutoEQOptions(options, device("Chu2 DSP").limits), { freqRange: [20, 20000], gainRange: [-10, 10], qRange: [0.1, 5] });
    assert.deepEqual(deviceAutoEQOptions(options, device("Marigold").limits).gainRange, [-12, 6]);
    assert.equal(deviceAutoEQOptions(options), options);
    assert.deepEqual(options.qRange, [0.1, 20]);
  });

  test("registry distinguishes readable, write-only and blocked experimental entries", () => {
    assert.equal(device("FreeDSP").capabilities.supportsRead, false);
    assert.equal(device("DAWN PRO2").capabilities.supportsRead, true);
    assert.equal(device("MD-QT-042").experimental, true);
  });

  test("device initial ranges use its entire frequency/gain/Q capability, not offline defaults", () => {
    assert.deepEqual(eqFilterRanges(device("DAWN PRO2").limits), { freqRange: [20, 20000], gainRange: [-12, 12], qRange: [0.1, 10] });
    assert.deepEqual(eqFilterRanges(device("Chu2 DSP").limits), { freqRange: [20, 20000], gainRange: [-10, 10], qRange: [0.1, 5] });
    assert.deepEqual(eqFilterRanges(device("Marigold").limits).gainRange, [-12, 6]);
    assert.deepEqual(eqFilterRanges(), { freqRange: [20, 20000], gainRange: [-40, 40], qRange: [0.1, 20] });
  });

  test("device ranges can be narrowed but cannot escape hardware frequency/gain/Q bounds", () => {
    const options: AutoEQOptions = { freqRange: [100, 8000], gainRange: [-6, 3], qRange: [0.3, 1.5] };
    assert.deepEqual(deviceAutoEQOptions(options, device("DAWN PRO2").limits), options);
    assert.deepEqual(deviceAutoEQOptions({ ...options, freqRange: [0, 25000] }, device("DAWN PRO2").limits).freqRange, [20, 20000]);
  });
});

describe("device write validation", () => {
  test("keeps enabled band values and EQ preamp without mutating editor data", () => {
    const filters = [Object.freeze(peak())];
    assert.deepEqual(deviceEQConfig(filters, device("DAWN PRO2"), -4.5), { filters, globalGain: -4.5 });
    assert.deepEqual(filters[0], peak());
  });

  test("writes the calculated EQ preamp at the precision displayed in the editor", () => {
    const filters = [{ ...peak(), gain: 6 }];
    const preamp = calculatePreamp(filters, frequencies);
    assert.ok(preamp < 0);
    assert.equal(deviceEQConfig(filters, device("DAWN PRO2"), preamp).globalGain, Number(preamp.toFixed(1)));
    assert.equal(deviceEQConfig(filters, device("DAWN PRO2"), -4.56789).globalGain, -4.6);
    assert.equal(deviceEQConfig([emptyFilter()], device("DAWN PRO2"), -0).globalGain, 0);
  });

  test("empty and disabled bands explicitly clear device bands instead of sending invalid zeroes", () => {
    const filters: Filter[] = [emptyFilter(), { type: "HSQ", freq: 0, gain: 40, q: 0, disabled: true }];
    assert.deepEqual(deviceEQConfig(filters, device("Marigold"), 0).filters, Array.from({ length: 2 }, () => ({ type: "PK", freq: 100, gain: 0, q: 1, disabled: true })));
    assert.equal(filters[1].gain, 40);
  });

  test("does not apply preamp twice on devices which manage it themselves", () => {
    assert.equal(device("Rays").limits.deviceHandlesPregain, true);
    assert.equal(deviceEQConfig([peak()], device("Rays"), -10).globalGain, 0);
    assert.equal(deviceEQConfig([peak()], device("FreeDSP"), -10).globalGain, 0);
  });

  test("rejects unsupported shelves rather than silently converting them to peaks", () => {
    assert.throws(() => deviceEQConfig([{ ...peak(), type: "LSQ" }], device("Marigold"), 0), /does not support LSQ/);
    assert.equal(deviceEQConfig([{ ...peak(), type: "LSQ" }], device("DAWN PRO2"), 0).filters[0].type, "LSQ");
  });

  test("rejects empty/oversized configurations before I/O", () => {
    assert.throws(() => deviceEQConfig([], device("DAWN PRO2"), 0), /1–8/);
    assert.throws(() => deviceEQConfig(Array.from({ length: 9 }, peak), device("DAWN PRO2"), 0), /1–8/);
  });

  for (const freq of [0, 19, 20001, 1000.5, NaN, Infinity]) test(`rejects invalid device frequency ${freq}`, () => {
    assert.throws(() => deviceEQConfig([{ ...peak(), freq }], device("DAWN PRO2"), 0), /whole number/);
  });

  test("rejects out-of-range gain, Q and preamp instead of silently clipping", () => {
    assert.throws(() => deviceEQConfig([{ ...peak(), gain: 7 }], device("Marigold"), 0), /-12 to 6/);
    assert.throws(() => deviceEQConfig([{ ...peak(), q: 5.1 }], device("Chu2 DSP"), 0), /0.1 to 5/);
    assert.throws(() => deviceEQConfig([{ ...peak(), gain: NaN }], device("DAWN PRO2"), 0), /gain/);
    assert.throws(() => deviceEQConfig([peak()], device("DAWN PRO2"), 128), /preamp/);
  });
});

test("unsupported/partial read errors explain support and preserve the editor", () => {
  assert.match(deviceEQError(new HidError("UNSUPPORTED_DEVICE", "unsupported")).message, /Support list/);
  assert.match(deviceEQError(new HidError("EXPERIMENTAL_DEVICE", "experimental")).message, /not enabled/);
  assert.match(deviceEQError(new HidError("INCOMPLETE_READ", "partial")).message, /have not been replaced/);
  assert.match(deviceEQError(new HidError("UNSUPPORTED_ENVIRONMENT", "no HID")).message, /Chrome or Edge/);
});
