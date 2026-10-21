import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import rangeData from "../public/data/ranges/index.json";
import { defaultFrequencyRangePreset, frequencyRangeGeometry, frequencyRangePresets, parseFrequencyRangePresets } from "../src/lib/graphtool/frequency-ranges";
import { createFrequencyScale } from "../src/lib/graphtool/graph-scales";

const range = (overrides: Record<string, unknown> = {}) => ({ id: "bass", name: "Bass", from: 20, to: 150, description: "Low-frequency reference region.", ...overrides });
const preset = (overrides: Record<string, unknown> = {}) => ({ id: "default", name: "Default", display: "highlight", ranges: [range()], ...overrides });

test("range JSON preserves every supplied Delta Force and CS2 boundary", () => {
  assert.deepEqual(frequencyRangePresets.map(({ id }) => id), ["default", "delta-force", "cs2"]);
  const simplify = (id: string) => frequencyRangePresets.find((entry) => entry.id === id)!.ranges.map(({ name, from, to }) => [name, from, to]);
  assert.deepEqual(simplify("delta-force"), [["Immersion", 20, 150], ["Footsteps", 150, 330], ["Gun", 3500, 6000], ["Heal", 7000, 9000]]);
  assert.deepEqual(simplify("cs2"), [["Immersion", 20, 150], ["Footsteps", 150, 450], ["Gun", 5000, 8000]]);
});

test("every range has an editable non-empty description in JSON", () => {
  for (const preset of frequencyRangePresets) for (const range of preset.ranges) assert.ok(range.description.trim().length > 20, `${preset.id}/${range.id}`);
  assert.deepEqual(parseFrequencyRangePresets(rangeData), frequencyRangePresets);
});

test("game logo paths come from JSON and point to the supplied public assets", () => {
  assert.equal(frequencyRangePresets.find(({ id }) => id === "delta-force")!.icon, "/icon/Delta Force.png");
  assert.equal(frequencyRangePresets.find(({ id }) => id === "cs2")!.icon, "/icon/CS2.png");
  assert.equal(defaultFrequencyRangePreset.icon, undefined);
  for (const preset of frequencyRangePresets) if (preset.icon) assert.ok(existsSync(new URL(`../public${preset.icon}`, import.meta.url)), preset.icon);
});

test("preset logos are optional local images and reject malformed or remote paths", () => {
  assert.equal(parseFrequencyRangePresets([preset({ icon: "/icon/My game.png" })])[0].icon, "/icon/My game.png");
  for (const icon of ["", null, 1, "https://example.com/game.png", "//example.com/game.png", "/icon/../game.png", "/icon/game.txt", "/icon/game.png?token=1"]) assert.throws(() => parseFrequencyRangePresets([preset({ icon })]), /icon/);
});

test("Default retains all seven legacy labels, widths and introduction text", () => {
  assert.equal(defaultFrequencyRangePreset.display, "highlight");
  assert.deepEqual(defaultFrequencyRangePreset.ranges.map(({ name }) => name), ["Sub bass", "Mid bass", "Lower midrange", "Upper midrange", "Presence region", "Mid treble", "Air"]);
  assert.deepEqual(defaultFrequencyRangePreset.ranges.map(({ width }) => width), ["20.1%", "19.2%", "17.4%", "20%", "6%", "7.3%", "10%"]);
  assert.ok(Math.abs(defaultFrequencyRangePreset.ranges.reduce((sum, range) => sum + parseFloat(range.width!), 0) - 100) < 1e-9);
  assert.equal(defaultFrequencyRangePreset.ranges[0].description, "Rumble and physical impact of drum hits and bass section in an orchestra.");
});

test("invalid presets fail clearly rather than leaving missing range descriptions", () => {
  for (const invalid of [null, [], {}, [preset({ ranges: [] })], [preset({ ranges: [range({ description: "  " })] })], [preset({ ranges: [range({ description: undefined })] })]]) assert.throws(() => parseFrequencyRangePresets(invalid));
  assert.throws(() => parseFrequencyRangePresets([preset({ id: "cs2" })]), /include Default/);
  assert.throws(() => parseFrequencyRangePresets([preset(), preset()]), /Duplicate frequency range preset/);
  assert.throws(() => parseFrequencyRangePresets([preset({ ranges: [range(), range()] })]), /Duplicate range/);
});

test("range IDs, bounds, colors and optional legacy widths are validated", () => {
  for (const patch of [{ id: "Bad ID" }, { from: 0 }, { to: 20001 }, { from: 150 }, { to: NaN }, { color: "red" }, { width: "200%" }]) assert.throws(() => parseFrequencyRangePresets([preset({ ranges: [range(patch)] })]));
  assert.throws(() => parseFrequencyRangePresets([preset({ display: "unknown" })]), /display/);
  assert.equal(parseFrequencyRangePresets([preset({ ranges: [range({ color: "#8b5cf6" })] })])[0].ranges[0].color, "#8b5cf6");
});

test("bands use logarithmic Hz positions and preserve gaps between supplied ranges", () => {
  const scale = createFrequencyScale(20, 20000);
  const delta = frequencyRangePresets.find(({ id }) => id === "delta-force")!;
  const first = frequencyRangeGeometry(delta.ranges[0], scale)!;
  const footsteps = frequencyRangeGeometry(delta.ranges[1], scale)!;
  const gun = frequencyRangeGeometry(delta.ranges[2], scale)!;
  assert.equal(first.left, 15);
  assert.ok(Math.abs(first.width - Math.log10(150 / 20) / 3 * 770) < 1e-8);
  assert.equal(first.right, footsteps.left);
  assert.ok(gun.left > footsteps.right);
});

test("zoom clips partially visible bands and omits off-screen ranges", () => {
  const delta = frequencyRangePresets.find(({ id }) => id === "delta-force")!;
  const bassScale = createFrequencyScale(100, 400);
  const immersion = frequencyRangeGeometry(delta.ranges[0], bassScale)!;
  assert.equal(immersion.left, 15);
  assert.equal(immersion.right, bassScale(150));
  assert.equal(frequencyRangeGeometry(delta.ranges[2], bassScale), null);
  const midScale = createFrequencyScale(100, 4000);
  assert.equal(frequencyRangeGeometry(delta.ranges[2], midScale)!.right, 785);
});
