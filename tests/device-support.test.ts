import { test } from "node:test";
import assert from "node:assert/strict";
import { getSupportedDevices } from "@shio265/moondrop-hid";
import { deviceSupportStatus, getDeviceSupportRows } from "../src/lib/graphtool/device-support";

test("support rows preserve all SDK bands, filter types and capabilities", () => {
  const registry = getSupportedDevices();
  const rows = getDeviceSupportRows();
  assert.equal(rows.length, registry.length);
  assert.deepEqual(rows.map((row) => row.model), registry.map((row) => row.model).sort((a, b) => a.localeCompare(b)));
  for (const entry of registry) {
    const row = rows.find((row) => row.model === entry.model)!;
    assert.deepEqual(row.limits, entry.limits);
    assert.deepEqual(row.capabilities, entry.capabilities);
    assert.deepEqual(row.slots, entry.slots);
  }
});

test("readable and write-only devices both have Enable status when EQ can be written", () => {
  const rows = getDeviceSupportRows();
  assert.equal(rows.find((row) => row.model === "DAWN PRO2")?.status, "Enable");
  assert.equal(rows.find((row) => row.model === "FreeDSP")?.status, "Enable");
  assert.equal(rows.find((row) => row.model === "FreeDSP")?.capabilities.supportsRead, false);
});

test("experimental registry models retain a distinct Experimental status", () => {
  const rows = getDeviceSupportRows();
  assert.equal(rows.find((row) => row.model === "MD-QT-042")?.status, "Experimental");
  assert.equal(rows.find((row) => row.model === "MOONDROP HiFi with PD")?.status, "Experimental");
});

test("missing or non-writable EQ capabilities map to Disable, not a false supported state", () => {
  const model = getSupportedDevices().find((row) => row.model === "DAWN PRO2")!;
  assert.equal(deviceSupportStatus(null), "Disable");
  assert.equal(deviceSupportStatus({ ...model, slots: [] }), "Disable");
  assert.equal(deviceSupportStatus({ ...model, limits: { ...model.limits, maxFilters: 0 } }), "Disable");
  assert.equal(deviceSupportStatus({ ...model, limits: { ...model.limits, filterTypes: [] } }), "Disable");
});
