import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

test("file-based PNG favicon is a valid 32px square image", () => {
  const png = readFileSync(new URL("../src/app/icon.png", import.meta.url));
  assert.deepEqual(png.subarray(0, 8), pngSignature);
  assert.equal(png.readUInt32BE(16), 32);
  assert.equal(png.readUInt32BE(20), 32);
});

test("file-based Apple touch icon is a valid 180px square image", () => {
  const png = readFileSync(new URL("../src/app/apple-icon.png", import.meta.url));
  assert.deepEqual(png.subarray(0, 8), pngSignature);
  assert.equal(png.readUInt32BE(16), 180);
  assert.equal(png.readUInt32BE(20), 180);
});

test("ICO favicon contains valid PNG frames for 16, 32 and 48px browser tabs", () => {
  const ico = readFileSync(new URL("../src/app/favicon.ico", import.meta.url));
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 3);
  for (const [index, size] of [16, 32, 48].entries()) {
    const entry = 6 + index * 16;
    assert.equal(ico[entry], size);
    assert.equal(ico[entry + 1], size);
    assert.equal(ico.readUInt16LE(entry + 4), 1);
    assert.equal(ico.readUInt16LE(entry + 6), 32);
    const length = ico.readUInt32LE(entry + 8), offset = ico.readUInt32LE(entry + 12);
    assert.ok(offset >= 54 && offset + length <= ico.length);
    const png = ico.subarray(offset, offset + length);
    assert.deepEqual(png.subarray(0, 8), pngSignature);
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
});
