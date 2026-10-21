import { test, expect, type Page } from "@playwright/test";
import { getSupportedDevices } from "@shio265/moondrop-hid";

// Exercise the real SDK through its WebHID transport, not a replacement SDK.
async function mockHid(page: Page, model = "DAWN PRO2", vendorId = 0x011b, cancelled = false) {
  await page.addInitScript(({ model, vendorId, cancelled }) => {
    const input = new Set<(event: { data: DataView; reportId: number }) => void>();
    const disconnect = new Set<(event: { device: typeof device }) => void>();
    let missingRead = false, failWrite = false, opened = false, globalGain = -2.5;
    const filters = Array.from({ length: 8 }, (_, i) => ({ freq: 1000 * (i + 1), q: 1, gain: i === 0 ? -3 : -i / 2, type: 2 }));
    const log = { requests: 0, opens: 0, closes: 0, reports: [] as { id: number; data: number[] }[] };
    Object.defineProperty(window, "__hidLog", { value: log });
    const device = {
      vendorId, productId: 1, productName: model, collections: [{ usagePage: 0xff00 }],
      get opened() { return opened; },
      async open() { opened = true; log.opens++; },
      async close() { opened = false; log.closes++; },
      addEventListener(_type: string, listener: (event: { data: DataView; reportId: number }) => void) { input.add(listener); },
      removeEventListener(_type: string, listener: (event: { data: DataView; reportId: number }) => void) { input.delete(listener); },
      async sendReport(id: number, data: Uint8Array) {
        log.reports.push({ id, data: Array.from(data) });
        if (data[0] === 1 && failWrite) throw new Error("Mock USB write failure");
        if (data[0] === 128 && !missingRead) {
          const response = new Uint8Array(63);
          response.set(data);
          if (data[1] === 15) response[3] = 7;
          if (data[1] === 9) {
            const filter = filters[data[4]];
            const view = new DataView(response.buffer);
            view.setUint16(27, filter.freq, true);
            view.setInt16(29, Math.round(filter.q * 256), true);
            view.setInt16(31, Math.round(filter.gain * 256), true);
            response[33] = filter.type;
          }
          if (data[1] === 3) new DataView(response.buffer).setInt16(3, Math.round(globalGain * 256), true);
          for (const listener of [...input]) listener({ data: new DataView(response.buffer), reportId: id });
        }
        if (data[0] === 1 && data[1] === 9) {
          const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
          filters[data[4]] = { freq: view.getUint16(27, true), q: view.getInt16(29, true) / 256, gain: view.getInt16(31, true) / 256, type: data[33] };
        }
        if (data[0] === 1 && data[1] === 35) globalGain = new DataView(data.buffer, data.byteOffset, data.byteLength).getInt16(3, true) / 256;
      },
    };
    Object.defineProperty(navigator, "hid", { configurable: true, value: {
      async requestDevice() { log.requests++; return cancelled ? [] : [device]; },
      async getDevices() { return [device]; },
      addEventListener(_type: string, listener: (event: { device: typeof device }) => void) { disconnect.add(listener); },
      removeEventListener(_type: string, listener: (event: { device: typeof device }) => void) { disconnect.delete(listener); },
    } });
    window.addEventListener("mock-hid-unplug", () => { opened = false; for (const listener of [...disconnect]) listener({ device }); });
    window.addEventListener("mock-hid-missing-read", () => { missingRead = true; });
    window.addEventListener("mock-hid-fail-write", () => { failWrite = true; });
    window.addEventListener("mock-hid-precise-values", () => { filters[0] = { ...filters[0], q: 0.89585746, gain: -3.14159265 }; });
  }, { model, vendorId, cancelled });
}

async function hidLog(page: Page) {
  return page.evaluate(() => (window as unknown as { __hidLog: { requests: number; opens: number; closes: number; reports: { id: number; data: number[] }[] } }).__hidLog);
}

async function openEQ(page: Page, share = "") {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/${share}`);
  await expect(page.locator("#phones .phone-item").first()).toBeVisible();
  await page.getByRole("button", { name: "Equalizer", exact: true }).click();
  await expect(page.getByRole("button", { name: "Connect USB/DAC" })).toBeVisible();
}

for (const width of [1440, 390]) test(`Upload sits to the right of Search and offers FR/Target (${width}px)`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const search = page.getByRole("searchbox", { name: "Search brands and models" });
  const upload = page.getByRole("button", { name: "Upload", exact: true });
  await expect(upload).toBeVisible();
  const searchBox = (await search.boundingBox())!, uploadBox = (await upload.boundingBox())!;
  expect(uploadBox.x).toBeGreaterThan(searchBox.x + searchBox.width);
  expect(Math.abs(uploadBox.y - searchBox.y)).toBeLessThan(1);
  expect(uploadBox.x + uploadBox.width).toBeLessThanOrEqual(width);
  await search.fill("Aria");
  await expect(page.locator("#phones .phone-item")).toHaveCount(1);

  for (const entry of [{ label: "Upload FR", name: "My measurement.txt", row: "Uploaded My measurement" }, { label: "Upload Target", name: "My reference.txt", row: "My reference Target" }]) {
    await upload.click();
    await expect(page.getByRole("menuitem", { name: "Upload FR", exact: true })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Upload Target", exact: true })).toBeVisible();
    const picker = page.waitForEvent("filechooser");
    await page.getByRole("menuitem", { name: entry.label, exact: true }).click();
    await (await picker).setFiles({ name: entry.name, mimeType: "text/plain", buffer: Buffer.from(Array.from({ length: 64 }, (_, i) => `${Math.round(20 * 1000 ** (i / 63))} ${60 + Math.sin(i / 5)}`).join("\n")) });
    await expect(page.locator("tbody.curves").getByRole("button", { name: `Remove ${entry.row}`, exact: true })).toBeAttached();
    await expect(page.getByRole("menu")).toHaveCount(0);
  }
  await expect(search).toHaveValue("Aria");
  await page.getByRole("button", { name: "Equalizer", exact: true }).click();
  await expect(page.locator(".extra-upload")).toHaveCount(0);
  await expect(page.locator(".extra-device")).toBeVisible();
});

test("missing WebHID reports a non-blocking error while offline EQ still works", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "hid", { value: undefined, configurable: true }));
  await openEQ(page);
  await page.getByRole("button", { name: "Connect USB/DAC" }).click();
  await expect(page.locator(".notice-alert")).toContainText("WebHID is not available");
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await page.getByRole("button", { name: "Add EQ filter", exact: true }).click();
  await expect(page.locator(".filters > .filter")).toHaveCount(11);
  await page.getByRole("button", { name: "Support list", exact: true }).click();
  await expect(page.locator(".device-support-list")).toContainText("DAWN PRO2");
});

for (const model of ["Unknown DAC", "MD-QT-042"]) test(`unsupported or experimental ${model} is rejected without HID writes`, async ({ page }) => {
  await mockHid(page, model);
  await openEQ(page);
  expect((await hidLog(page)).requests).toBe(0);
  await page.getByRole("button", { name: "Connect USB/DAC" }).click();
  await expect(page.locator(".notice-alert")).toContainText(model === "Unknown DAC" ? "not supported" : "experimental");
  await expect(page.locator(".device-support-list")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Device support list", exact: true })).toBeVisible();
  await expect(page.locator(".device-support-list")).toContainText("Write only");
  await expect(page.locator(".filters > .filter")).toHaveCount(10);
  const log = await hidLog(page);
  expect(log.requests).toBe(1);
  expect(log.opens).toBe(0);
  expect(log.reports).toEqual([]);
});

test("cancelling the picker leaves the editor unchanged and does not report an error", async ({ page }) => {
  await mockHid(page, "DAWN PRO2", 0x011b, true);
  await openEQ(page);
  await page.getByRole("button", { name: "Connect USB/DAC" }).click();
  await expect(page.getByRole("button", { name: "Connect USB/DAC" })).toBeEnabled();
  await expect(page.locator(".device-eq-alert")).toHaveCount(0);
  await expect(page.locator(".notice-alert")).toHaveCount(0);
  await expect(page.locator(".filters > .filter")).toHaveCount(10);
  expect((await hidLog(page)).opens).toBe(0);
});

for (const width of [1440, 390]) test(`readable DAC loads the editor and writes current filters through the SDK (${width}px)`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await mockHid(page);
  await openEQ(page, "?share=Moondrop_Aria");
  await page.getByRole("button", { name: "Connect USB/DAC" }).click();
  await expect(page.locator(".device-connection")).toHaveText("Connected: DAWN PRO2");
  const connection = page.locator(".device-connection-row");
  const load = connection.getByRole("button", { name: "Load EQ", exact: true });
  const save = connection.getByRole("button", { name: "Save EQ", exact: true });
  await expect(load).toHaveText("Load");
  await expect(save).toHaveText("Save");
  await expect(load.locator('svg[data-icon-library="phosphor"]')).toHaveCount(1);
  await expect(save.locator('svg[data-icon-library="phosphor"]')).toHaveCount(1);
  const labelBox = (await connection.locator(".device-connection").boundingBox())!, loadBox = (await load.boundingBox())!, saveBox = (await save.boundingBox())!;
  expect(loadBox.x).toBeGreaterThan(labelBox.x + labelBox.width);
  expect(saveBox.x).toBeGreaterThan(loadBox.x + loadBox.width);
  expect(Math.abs(labelBox.y + labelBox.height / 2 - loadBox.y - loadBox.height / 2)).toBeLessThan(1);
  expect(Math.abs(loadBox.y - saveBox.y)).toBeLessThan(1);
  const supportBox = (await page.getByRole("button", { name: "Support list", exact: true }).boundingBox())!, actionsBox = (await connection.locator(".device-eq-actions").boundingBox())!;
  expect(Math.abs(actionsBox.width - supportBox.width)).toBeLessThan(0.25);
  expect(Math.abs(actionsBox.x - supportBox.x)).toBeLessThan(0.25);
  expect(Math.abs(loadBox.width - saveBox.width)).toBeLessThan(0.25);
  expect(Math.abs(loadBox.height - supportBox.height)).toBeLessThan(0.25);
  for (const button of [load, save]) {
    const iconBox = (await button.locator("svg").boundingBox())!, textBox = (await button.locator(".device-action-label").boundingBox())!;
    expect(iconBox.x + iconBox.width).toBeLessThan(textBox.x);
  }
  await load.hover();
  await expect(page.getByRole("tooltip", { name: "Load EQ", exact: true })).toBeVisible();
  await save.hover();
  await expect(page.getByRole("tooltip", { name: "Save EQ", exact: true })).toBeVisible();
  await page.mouse.move(5, 5);
  await expect(page.locator(".extra-device")).not.toContainText("bands maximum");
  await expect(page.locator(".extra-device")).not.toContainText("PK / LSQ / HSQ");
  await expect(page.locator(".extra-device")).not.toContainText("-12 to 12 dB");
  await expect(page.locator(".extra-device")).not.toContainText("Write slot:");
  await expect(page.locator(".extra-device")).not.toContainText("Lower volume before saving.");
  await expect(page.locator(".extra-eq").getByLabel("Gain Range minimum", { exact: true })).toHaveValue("-12");
  await expect(page.locator(".extra-eq").getByLabel("Gain Range maximum", { exact: true })).toHaveValue("12");
  await expect(page.locator(".extra-eq").getByLabel("Q Range maximum", { exact: true })).toHaveValue("10");
  await expect(page.locator(".device-eq-alert")).toHaveCount(0);
  await expect(page.locator(".filters > .filter")).toHaveCount(8);
  expect((await hidLog(page)).reports).toEqual([]); // Connecting must never read/write automatically.
  await expect(page.getByRole("button", { name: "Add EQ filter", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Remove last EQ filter", exact: true }).click();
  await expect(page.locator(".filters > .filter")).toHaveCount(7);
  await page.getByRole("button", { name: "Add EQ filter", exact: true }).click();
  await expect(page.locator(".filters > .filter")).toHaveCount(8);
  await page.getByRole("button", { name: "Load EQ", exact: true }).click();
  await expect(page.locator(".device-eq-alert")).toHaveText("Load EQ successful.");
  await expect(page.locator(".device-eq-alert")).toHaveClass(/MuiAlert-colorSuccess/);
  await expect(page.getByLabel("Filter 1 frequency", { exact: true })).toHaveValue("1000");
  await expect(page.getByLabel("Filter 1 gain", { exact: true })).toHaveValue("-3");
  await expect(page.getByLabel("Filter 8 frequency", { exact: true })).toHaveValue("8000");
  await expect(page.locator("#device-preamp")).toHaveCount(0);
  await expect(page.locator("#preamp-value")).toHaveCount(1);
  await expect(page.locator("tbody.curves").getByRole("button", { name: "Remove Moondrop Aria EQ", exact: true })).toBeAttached();
  await page.getByLabel("Filter 1 gain", { exact: true }).fill("-4");
  await page.getByLabel("Filter 1 gain", { exact: true }).press("Tab");
  await page.getByLabel("Enable filter 2", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Remove last EQ filter", exact: true }).click();
  const preamp = Number((await page.locator("#preamp-value").innerText()).replace("dB", "").trim());
  await page.getByRole("button", { name: "Save EQ", exact: true }).click();
  await expect(page.locator(".device-eq-alert")).toHaveText("Save EQ successful.");
  const writes = (await hidLog(page)).reports.filter((report) => report.data[0] === 1);
  const bands = writes.filter((report) => report.data[1] === 9);
  expect(bands).toHaveLength(8); // Removed/unused rows still clear the hardware bank.
  expect(bands.map((report) => report.data[4])).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(bands[0].data.slice(31, 33)).toEqual([0, 252]); // -4 dB, fixed point 8.8
  expect(bands[1].data.slice(31, 33)).toEqual([0, 0]); // Bypassed band is flat.
  expect(bands[7].data.slice(31, 33)).toEqual([0, 0]); // Missing band is reset.
  const encodedPreamp = Math.round(preamp * 256);
  expect(writes.find((report) => report.data[1] === 35)?.data.slice(3)).toEqual([encodedPreamp & 255, encodedPreamp >> 8 & 255]);
  expect(writes.at(-1)?.data).toEqual([1, 1]); // SDK flash-save command
  expect(writes.every((report) => report.id === 75)).toBe(true);
  await page.getByRole("button", { name: "Load EQ", exact: true }).click();
  await expect(page.getByLabel("Filter 1 gain", { exact: true })).toHaveValue("-4");
});

test("write-only DAC disables Load and restores the offline band limit on disconnect", async ({ page }) => {
  await mockHid(page, "FreeDSP");
  await openEQ(page);
  await page.getByRole("button", { name: "Connect USB/DAC" }).click();
  await expect(page.locator(".filters > .filter")).toHaveCount(9);
  await expect(page.getByRole("button", { name: "Load EQ", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save EQ", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Load EQ", exact: true }).locator("..").hover();
  await expect(page.getByRole("tooltip", { name: "Load EQ", exact: true })).toBeVisible();
  await expect(page.locator(".extra-device")).toContainText("Write-only device");
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add EQ filter", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Add EQ filter", exact: true }).click();
  await expect(page.locator(".filters > .filter")).toHaveCount(10);
  expect((await hidLog(page)).closes).toBe(1);
});

test("five-band device caps imported files and disables unsupported filter types", async ({ page }) => {
  await mockHid(page, "Old Fashioned");
  await openEQ(page);
  await page.getByRole("button", { name: "Connect USB/DAC" }).click();
  await expect(page.locator(".filters > .filter")).toHaveCount(5);
  await page.getByRole("button", { name: "Filter 1 type", exact: true }).click();
  await expect(page.getByRole("menuitemradio", { name: "LSQ", exact: true })).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
  await page.locator("#file-filters-import").setInputFiles({ name: "many-bands.txt", mimeType: "text/plain", buffer: Buffer.from(Array.from({ length: 12 }, (_, i) => `Filter ${i + 1}: ON PK Fc ${100 * (i + 1)} Hz Gain -3 dB Q 1`).join("\n")) });
  await expect(page.locator(".filters > .filter")).toHaveCount(5);
  await expect(page.getByLabel("Filter 5 frequency", { exact: true })).toHaveValue("500");
  await expect(page.locator(".notice-alert")).toContainText("Only the first 5 bands were kept");
  await expect(page.getByRole("button", { name: "Add EQ filter", exact: true })).toBeDisabled();
});

test("AutoEQ uses the connected DAC's band count and gain/Q constraints", async ({ page }) => {
  await mockHid(page, "Marigold");
  await page.addInitScript(() => {
    const postMessage = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (this: Worker, message: unknown, options?: Transferable[] | StructuredSerializeOptions) {
      Object.defineProperty(window, "__autoEQRequest", { configurable: true, value: message });
      return Reflect.apply(postMessage, this, [message, options]);
    };
  });
  await openEQ(page, "?share=Moondrop_Aria,targets/Shiori%2520Target");
  await page.getByRole("button", { name: "Connect USB/DAC" }).click();
  await expect(page.getByLabel("Gain Range maximum", { exact: true })).toHaveValue("6");
  await expect(page.getByLabel("Q Range maximum", { exact: true })).toHaveValue("10");
  await page.getByRole("button", { name: "AutoEQ", exact: true }).click();
  await expect(page.locator(".autoeq-modal")).toHaveCount(0, { timeout: 60000 });
  await expect(page.locator(".filters > .filter")).toHaveCount(8);
  const request = await page.evaluate(() => (window as unknown as { __autoEQRequest: { bands: number; options: { gainRange: number[]; qRange: number[] } } }).__autoEQRequest);
  expect(request.bands).toBe(8);
  expect(request.options.gainRange).toEqual([-12, 6]);
  expect(request.options.qRange).toEqual([0.1, 10]);
  await expect(page.getByRole("button", { name: "Add EQ filter", exact: true })).toBeDisabled();
});

test("failed read/write does not replace filters or claim successful persistence", async ({ page }) => {
  await mockHid(page);
  await openEQ(page);
  await page.getByRole("button", { name: "Connect USB/DAC" }).click();
  await page.getByRole("button", { name: "Load EQ", exact: true }).click();
  await expect(page.getByLabel("Filter 1 gain", { exact: true })).toHaveValue("-3");
  await page.evaluate(() => window.dispatchEvent(new Event("mock-hid-missing-read")));
  await page.getByRole("button", { name: "Load EQ", exact: true }).click();
  await expect(page.getByRole("button", { name: "Load EQ", exact: true })).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("button", { name: "Save EQ", exact: true })).toBeDisabled();
  await expect(page.locator(".device-eq-alert")).toHaveText("Load EQ failed.");
  await expect(page.locator(".device-eq-alert")).toHaveClass(/MuiAlert-colorError/);
  await expect(page.locator(".notice-alert")).toHaveCount(0);
  await expect(page.getByLabel("Filter 1 gain", { exact: true })).toHaveValue("-3");
  await page.getByRole("button", { name: "Dismiss EQ notification" }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("mock-hid-fail-write")));
  await page.getByRole("button", { name: "Save EQ", exact: true }).click();
  await expect(page.locator(".device-eq-alert")).toHaveText("Save EQ failed.");
  await expect(page.locator(".device-eq-alert")).toHaveClass(/MuiAlert-colorError/);
  await expect(page.locator(".notice-alert")).toHaveCount(0);
});

test("physical unplug releases limits and rejects a pending read without changing the editor", async ({ page }) => {
  await mockHid(page);
  await openEQ(page);
  await page.getByRole("button", { name: "Connect USB/DAC" }).click();
  await page.getByRole("button", { name: "Load EQ", exact: true }).click();
  await expect(page.getByLabel("Filter 1 gain", { exact: true })).toHaveValue("-3");
  await page.evaluate(() => window.dispatchEvent(new Event("mock-hid-missing-read")));
  await page.getByRole("button", { name: "Load EQ", exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("mock-hid-unplug")));
  await expect(page.getByRole("button", { name: "Connect USB/DAC" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Add EQ filter", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Filter 1 gain", { exact: true })).toHaveValue("-3");
  await expect(page.locator(".device-eq-alert")).toHaveText("Load EQ failed.");
});

test("connecting synchronizes actual ranges and filter bounds, while disconnect restores offline settings", async ({ page }) => {
  await mockHid(page);
  await openEQ(page);
  for (const [label, value] of [["Frequency Range minimum", "100"], ["Frequency Range maximum", "10000"], ["Gain Range minimum", "-5"], ["Gain Range maximum", "5"], ["Q Range minimum", "0.3"], ["Q Range maximum", "1.5"]]) {
    await page.getByLabel(label, { exact: true }).fill(value);
    await page.getByLabel(label, { exact: true }).press("Tab");
  }
  await page.getByRole("button", { name: "Connect USB/DAC" }).click();
  for (const [name, min, max] of [["Frequency Range", "20", "20000"], ["Gain Range", "-12", "12"], ["Q Range", "0.1", "10"]]) {
    await expect(page.getByLabel(`${name} minimum`, { exact: true })).toHaveValue(min);
    await expect(page.getByLabel(`${name} maximum`, { exact: true })).toHaveValue(max);
    for (const side of ["minimum", "maximum"]) {
      await expect(page.getByLabel(`${name} ${side}`, { exact: true })).toHaveAttribute("min", min);
      await expect(page.getByLabel(`${name} ${side}`, { exact: true })).toHaveAttribute("max", max);
    }
  }
  for (const [name, min, max] of [["frequency", "20", "20000"], ["gain", "-12", "12"], ["Q", "0.1", "10"]]) {
    await expect(page.getByLabel(`Filter 1 ${name}`, { exact: true })).toHaveAttribute("min", min);
    await expect(page.getByLabel(`Filter 1 ${name}`, { exact: true })).toHaveAttribute("max", max);
  }
  await page.getByLabel("Q Range maximum", { exact: true }).fill("7");
  await page.getByLabel("Q Range maximum", { exact: true }).press("Tab");
  await expect(page.getByLabel("Q Range maximum", { exact: true })).toHaveValue("7");
  expect((await hidLog(page)).reports).toEqual([]);
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  for (const [label, value] of [["Frequency Range minimum", "100"], ["Frequency Range maximum", "10000"], ["Gain Range minimum", "-5"], ["Gain Range maximum", "5"], ["Q Range minimum", "0.3"], ["Q Range maximum", "1.5"]]) {
    await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
  }
  await expect(page.getByLabel("Filter 1 gain", { exact: true })).toHaveAttribute("min", "-40");
  await expect(page.getByLabel("Filter 1 Q", { exact: true })).toHaveAttribute("max", "20");
  await page.getByRole("button", { name: "Connect USB/DAC" }).click();
  await expect(page.getByLabel("Q Range maximum", { exact: true })).toHaveValue("10");
});

test("five-band DAC synchronizes its asymmetric type, gain and Q restrictions", async ({ page }) => {
  await mockHid(page, "Chu2 DSP", 12722);
  await openEQ(page);
  await page.getByRole("button", { name: "Connect USB/DAC" }).click();
  await expect(page.locator(".device-connection")).toHaveText("Connected: Chu2 DSP");
  await expect(page.locator(".filters > .filter")).toHaveCount(5);
  await expect(page.getByLabel("Gain Range minimum", { exact: true })).toHaveValue("-10");
  await expect(page.getByLabel("Gain Range maximum", { exact: true })).toHaveValue("10");
  await expect(page.getByLabel("Q Range maximum", { exact: true })).toHaveValue("5");
  await expect(page.getByLabel("Filter 1 gain", { exact: true })).toHaveAttribute("max", "10");
  await expect(page.getByLabel("Filter 1 Q", { exact: true })).toHaveAttribute("max", "5");
  expect((await hidLog(page)).reports).toEqual([]);
});

for (const width of [1440, 390]) test(`filter read/import/edit/write all use one-decimal gain/Q values (${width}px)`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await mockHid(page);
  await openEQ(page, "?share=Moondrop_Aria");
  await page.getByRole("button", { name: "Connect USB/DAC" }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("mock-hid-precise-values")));
  await page.getByRole("button", { name: "Load EQ", exact: true }).click();
  await expect(page.getByLabel("Filter 1 Q", { exact: true })).toHaveValue("0.9");
  await expect(page.getByLabel("Filter 1 gain", { exact: true })).toHaveValue("-3.1");
  await page.locator("#file-filters-import").setInputFiles({ name: "precise.txt", mimeType: "text/plain", buffer: Buffer.from("Filter 1: ON PK Fc 1000 Hz Gain 1.234567 dB Q 0.89585746") });
  await expect(page.getByLabel("Filter 1 Q", { exact: true })).toHaveValue("0.9");
  await expect(page.getByLabel("Filter 1 gain", { exact: true })).toHaveValue("1.2");
  await page.getByLabel("Filter 1 Q", { exact: true }).fill("0.89585746");
  await page.getByLabel("Filter 1 Q", { exact: true }).press("Tab");
  await expect(page.getByLabel("Filter 1 Q", { exact: true })).toHaveValue("0.9");
  await page.getByLabel("Filter 1 gain", { exact: true }).fill("-4.26789");
  await page.getByLabel("Filter 1 gain", { exact: true }).press("Tab");
  await expect(page.getByLabel("Filter 1 gain", { exact: true })).toHaveValue("-4.3");
  await page.getByLabel("Filter 1 frequency", { exact: true }).fill("1000.9");
  await page.getByLabel("Filter 1 frequency", { exact: true }).press("Tab");
  await expect(page.getByLabel("Filter 1 frequency", { exact: true })).toHaveValue("1001");
  await page.getByRole("button", { name: "Save EQ", exact: true }).click();
  await expect(page.locator(".device-eq-alert")).toHaveText("Save EQ successful.");
  const first = (await hidLog(page)).reports.find((report) => report.data[0] === 1 && report.data[1] === 9)!;
  expect(first.data.slice(27, 29)).toEqual([233, 3]); // 1001 Hz
  expect(first.data.slice(29, 31)).toEqual([230, 0]); // 0.9 Q, quantized by firmware
  expect(first.data.slice(31, 33)).toEqual([179, 251]); // -4.3 dB, fixed point 8.8
  await page.getByRole("button", { name: "Load EQ", exact: true }).click();
  await expect(page.getByLabel("Filter 1 Q", { exact: true })).toHaveValue("0.9");
  await expect(page.getByLabel("Filter 1 gain", { exact: true })).toHaveValue("-4.3");
});

for (const width of [1440, 390]) test(`saving uses the single EQ Pre-amp value, not previously read hardware pregain (${width}px)`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await mockHid(page);
  await openEQ(page);
  await page.getByRole("button", { name: "Connect USB/DAC" }).click();
  await expect(page.locator("#device-preamp")).toHaveCount(0);
  await expect(page.getByText("Device preamp (dB)", { exact: true })).toHaveCount(0);
  await expect(page.locator("#preamp-value")).toHaveText("0.0 dB");
  await page.getByRole("button", { name: "Load EQ", exact: true }).click();
  await expect(page.locator(".device-eq-alert")).toHaveText("Load EQ successful.");
  await expect(page.locator("#preamp-value")).not.toHaveText("-2.5 dB");
  await page.getByLabel("Filter 1 gain", { exact: true }).fill("6");
  await page.getByLabel("Filter 1 gain", { exact: true }).press("Tab");
  const displayed = Number((await page.locator("#preamp-value").innerText()).replace("dB", "").trim());
  expect(displayed).toBeLessThan(0);
  await page.getByRole("button", { name: "Save EQ", exact: true }).click();
  await expect(page.locator(".device-eq-alert")).toHaveText("Save EQ successful.");
  const report = (await hidLog(page)).reports.find((report) => report.data[0] === 1 && report.data[1] === 35)!;
  const encoded = Math.round(displayed * 256);
  expect(report.data.slice(3)).toEqual([encoded & 255, encoded >> 8 & 255]);
  await expect(page.locator("#preamp-value")).toHaveCount(1);
  await expect(page.locator("#device-preamp")).toHaveCount(0);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 568 }]) test(`Support list uses a backdrop and SDK-driven MUI table (${viewport.width}px)`, async ({ page }) => {
  await page.setViewportSize(viewport);
  await mockHid(page);
  await openEQ(page);
  const trigger = page.getByRole("button", { name: "Support list", exact: true, includeHidden: true });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Device support list", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
  await expect(trigger).toHaveAttribute("aria-controls", (await dialog.getAttribute("id"))!);
  await expect(page.locator(".extra-device .device-support-list")).toHaveCount(0); // Portaled, not inline.
  const modal = page.locator(".MuiModal-root").filter({ has: dialog });
  const backdrop = modal.locator(".MuiBackdrop-root");
  await expect(backdrop).toBeVisible();
  await expect(backdrop).toHaveCSS("background-color", "rgba(0, 0, 0, 0.6)");
  const table = dialog.getByRole("table", { name: "USB/DAC EQ support", exact: true });
  await expect(table).toHaveClass(/MuiTable-root/);
  for (const name of ["Device", "EQ bands", "Filter types", "Config access", "Status"]) await expect(table.getByRole("columnheader", { name, exact: true })).toBeVisible();
  const registry = getSupportedDevices();
  await expect(table.locator("tbody tr")).toHaveCount(registry.length);
  for (const entry of registry) {
    const row = table.getByRole("row").filter({ has: page.getByRole("rowheader", { name: entry.model, exact: true }) });
    await expect(row.getByRole("cell").nth(0)).toHaveText(String(entry.limits.maxFilters));
    await expect(row.getByRole("cell").nth(1)).toHaveText(entry.limits.filterTypes.join(" / "));
    await expect(row.getByRole("cell").nth(2)).toHaveText(entry.capabilities.supportsRead ? "Read / Write" : "Write only");
    await expect(row.getByRole("cell").nth(3)).toHaveText(entry.experimental ? "Experimental" : "Enable");
  }
  await expect(table.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "FreeDSP", exact: true }) }).getByRole("cell", { name: "Enable", exact: true })).toHaveCount(1);
  await table.getByRole("rowheader", { name: "DAWN PRO2", exact: true }).click();
  await expect(dialog).toBeVisible();
  const region = dialog.getByRole("region", { name: "Scrollable device support table", exact: true });
  const header = table.getByRole("columnheader", { name: "Device", exact: true });
  const headerTop = (await header.boundingBox())!.y;
  await region.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect(table.locator("tbody tr").last()).toBeInViewport();
  expect(Math.abs((await header.boundingBox())!.y - headerTop)).toBeLessThan(1);
  const bounds = (await dialog.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(15);
  expect(bounds.y).toBeGreaterThanOrEqual(15);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width - 15);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height - 15);
  if (viewport.width < 640) {
    expect(await region.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    await region.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    expect(await region.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  }
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  expect((await hidLog(page)).requests).toBe(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: "OK", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await backdrop.click({ position: { x: 8, y: 8 } });
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("Support table respects dark mode and does not change the existing EQ Guide dialog", async ({ page }) => {
  await openEQ(page);
  await page.getByRole("button", { name: "dark mode", exact: true }).click();
  await page.getByRole("button", { name: "Support list", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Device support list", exact: true });
  await expect(dialog.getByRole("columnheader", { name: "Device", exact: true })).toHaveCSS("background-color", "rgb(38, 38, 38)");
  await page.keyboard.press("Escape");
  const guide = page.getByRole("button", { name: "Guide", exact: true });
  await guide.click();
  const guideDialog = page.getByRole("dialog", { name: "Equalizer Guide", exact: true });
  await expect(guideDialog).toBeVisible();
  await expect(guideDialog).toHaveCSS("max-width", "560px");
  await page.keyboard.press("Escape");
  await expect(guideDialog).toHaveCount(0);
  await expect(guide).toBeFocused();
});

for (const width of [320, 1920]) test(`connected device name and Load/Save controls stay aligned (${width}px)`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await mockHid(page, "ddHiFi DSP IEM - Memory");
  await openEQ(page);
  await page.getByRole("button", { name: "Connect USB/DAC" }).click();
  const row = page.locator(".device-connection-row");
  const label = row.locator(".device-connection");
  const load = row.getByRole("button", { name: "Load EQ", exact: true });
  const save = row.getByRole("button", { name: "Save EQ", exact: true });
  await expect(label).toHaveText("Connected: ddHiFi DSP IEM - Memory");
  await expect(label).toHaveAttribute("title", "Connected: ddHiFi DSP IEM - Memory");
  await expect(load).toBeVisible();
  await expect(save).toBeVisible();
  await expect(load).toHaveText("Load");
  await expect(save).toHaveText("Save");
  const rowBox = (await row.boundingBox())!, loadBox = (await load.boundingBox())!, saveBox = (await save.boundingBox())!;
  const supportBox = (await page.getByRole("button", { name: "Support list", exact: true }).boundingBox())!, actionsBox = (await row.locator(".device-eq-actions").boundingBox())!;
  expect(saveBox.x + saveBox.width).toBeLessThanOrEqual(rowBox.x + rowBox.width + 1);
  expect(Math.abs(loadBox.y - saveBox.y)).toBeLessThan(1);
  expect(rowBox.height).toBe(36);
  expect(Math.abs(actionsBox.width - supportBox.width)).toBeLessThan(0.25);
  expect(Math.abs(actionsBox.x - supportBox.x)).toBeLessThan(0.25);
  expect(Math.abs(loadBox.width - saveBox.width)).toBeLessThan(0.25);
  expect(Math.abs(loadBox.height - supportBox.height)).toBeLessThan(0.25);
  await load.focus();
  await page.keyboard.press("Tab");
  await expect(save).toBeFocused();
  await expect(page.getByRole("tooltip", { name: "Save EQ", exact: true })).toBeVisible();
  expect((await hidLog(page)).reports).toEqual([]);
});

for (const width of [1440, 390]) test(`Load/Save results are brief dismissible MUI success/error alerts (${width}px)`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await mockHid(page);
  await openEQ(page);
  await page.getByRole("button", { name: "Connect USB/DAC" }).click();
  const alert = page.locator(".device-eq-alert");
  await expect(alert).toHaveCount(0);
  await page.getByRole("button", { name: "Load EQ", exact: true }).click();
  await expect(alert).toHaveText("Load EQ successful.");
  await expect(alert).toHaveClass(/MuiAlert-root/);
  await expect(alert).toHaveClass(/MuiAlert-colorSuccess/);
  await expect(alert).toHaveAttribute("role", "alert");
  await expect(alert.locator('svg[data-icon-library="phosphor"]')).toHaveCount(2);
  await page.getByRole("button", { name: "Dismiss EQ notification" }).click();
  await expect(alert).toHaveCount(0);
  await page.getByRole("button", { name: "Save EQ", exact: true }).click();
  await expect(alert).toHaveText("Save EQ successful.");
  await expect(alert).toHaveClass(/MuiAlert-colorSuccess/);
  await page.evaluate(() => window.dispatchEvent(new Event("mock-hid-missing-read")));
  await page.getByRole("button", { name: "Load EQ", exact: true }).click();
  await expect(page.getByRole("button", { name: "Load EQ", exact: true })).toHaveAttribute("aria-busy", "true");
  await expect(alert).toHaveCount(0); // Previous success is cleared while loading.
  await expect(alert).toHaveText("Load EQ failed.");
  await expect(alert).toHaveClass(/MuiAlert-colorError/);
  await expect(page.getByLabel("Filter 1 gain", { exact: true })).toHaveValue("-3");
  await page.evaluate(() => window.dispatchEvent(new Event("mock-hid-fail-write")));
  await page.getByRole("button", { name: "Save EQ", exact: true }).click();
  await expect(alert).toHaveText("Save EQ failed.");
  await expect(alert).toHaveClass(/MuiAlert-colorError/);
  await expect(page.locator(".notice-alert")).toHaveCount(0); // No duplicate verbose notification.
  await expect(page.locator(".device-status")).toHaveCount(0);
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await expect(alert).toHaveCount(0);
});
