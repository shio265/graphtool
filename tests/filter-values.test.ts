import { test } from "node:test";
import assert from "node:assert/strict";
import { roundEQFilters, roundFilterValue } from "../src/lib/graphtool/filter-values";
import { emptyFilter } from "../src/lib/graphtool/config";
import { exportFilters, parseFilters } from "../src/lib/graphtool/filter-files";
import type { Filter } from "../src/lib/graphtool/types";

test("filter values round to one decimal, including native HID fixed-point fractions", () => {
  assert.equal(roundFilterValue(0.89585746), 0.9);
  assert.equal(roundFilterValue(230 / 256), 0.9);
  assert.equal(roundFilterValue(-3.14159265), -3.1);
  assert.equal(roundFilterValue(1.25), 1.3);
  assert.equal(roundFilterValue(-1.25), -1.3);
  assert.equal(roundFilterValue(-1.15), -1.2);
});

test("filter rounding avoids negative zero and keeps whole-Hz frequency", () => {
  assert.equal(roundFilterValue(-0.01), 0);
  assert.equal(roundFilterValue(-0), 0);
  assert.equal(roundFilterValue(1000.9, 0), 1001);
  assert.deepEqual(roundEQFilters([emptyFilter()]), [emptyFilter()]);
});

test("rounding copies filters without changing their type, bypass state or source data", () => {
  const input: Filter[] = [Object.freeze({ type: "LSQ", freq: 1000.9, gain: -3.14159265, q: 0.89585746, disabled: true })];
  assert.deepEqual(roundEQFilters(input), [{ type: "LSQ", freq: 1001, gain: -3.1, q: 0.9, disabled: true }]);
  assert.equal(input[0].q, 0.89585746);
  assert.equal(input[0].freq, 1000.9);
});

test("imported rounded state is also used by EQ export", () => {
  const filters = roundEQFilters(parseFilters("Filter 1: ON PK Fc 1000.9 Hz Gain -3.14159265 dB Q 0.89585746"));
  assert.match(exportFilters(filters), /Fc 1001 Hz Gain -3.1 dB Q 0.9/);
});

test("non-finite numbers stay invalid for subsequent validation", () => {
  assert.ok(Number.isNaN(roundFilterValue(NaN)));
  assert.equal(roundFilterValue(Infinity), Infinity);
});
