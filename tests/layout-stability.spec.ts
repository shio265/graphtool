import { test, expect, type Page } from "@playwright/test";

// Playwright hides scrollbars by default, which masks this desktop layout shift.
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

async function captureLayout(page: Page) {
  return page.locator(".parts-primary").evaluate((element) => {
    const primary = element as HTMLElement;
    const row = [...primary.querySelectorAll<HTMLTableRowElement>("tbody.curves > tr")].find((row) => row.querySelector(".phonename")?.textContent?.trim() === "Lan 2 POP");
    if (!row) throw new Error("Lan 2 POP must remain selected while measuring layout.");
    const rect = (element: Element) => {
      const { left, width } = element.getBoundingClientRect();
      return { left, width };
    };
    return {
      primary: { ...rect(primary), clientWidth: primary.clientWidth, clientHeight: primary.clientHeight, scrollHeight: primary.scrollHeight, gutter: primary.offsetWidth - primary.clientWidth },
      graph: rect(primary.querySelector(".graph-sizer")!),
      row: rect(row),
      controls: Object.fromEntries([".channels", ".levels", ".button-baseline", ".hideIcon", ".button-pin", ".remove"].map((selector) => [selector, rect(row.querySelector(selector)!)] as const)),
    };
  });
}

function expectStableLayout(before: Awaited<ReturnType<typeof captureLayout>>, after: Awaited<ReturnType<typeof captureLayout>>) {
  const context = `scrollbar gutter ${before.primary.gutter}px → ${after.primary.gutter}px`;
  expect(after.primary.clientWidth, context).toBe(before.primary.clientWidth);
  for (const name of ["graph", "row"] as const) {
    expect(Math.abs(after[name].left - before[name].left), `${name} left; ${context}`).toBeLessThan(0.25);
    expect(Math.abs(after[name].width - before[name].width), `${name} width; ${context}`).toBeLessThan(0.25);
  }
  for (const [selector, box] of Object.entries(before.controls)) {
    expect(Math.abs(after.controls[selector].left - box.left), `${selector} left; ${context}`).toBeLessThan(0.25);
    expect(Math.abs(after.controls[selector].width - box.width), `${selector} width; ${context}`).toBeLessThan(0.25);
  }
}

for (const viewport of [
  { width: 1440, height: 800 },
  { width: 1366, height: 768 },
  { width: 1920, height: 800 },
  { width: 2000, height: 900 },
  { width: 1440, height: 900 },
  { width: 1100, height: 800 },
  { width: 390, height: 844 },
]) {
  test(`adding a third model does not shift the graph or existing row controls (${viewport.width}x${viewport.height})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?share=Moondrop_Lan_2_POP,Moondrop_Moca");
    await expect(page.locator("tbody.curves > tr")).toHaveCount(2);
    await page.evaluate(() => document.fonts.ready.then(() => {}));
    const before = await captureLayout(page);
    if (viewport.width > 1000) expect(before.primary.gutter).toBeGreaterThan(0);
    await page.locator("#phones").getByRole("button", { name: "Add Moondrop Aria", exact: true }).click();
    await expect(page.locator("tbody.curves > tr")).toHaveCount(3);
    const after = await captureLayout(page);
    if (viewport.width === 1920 && viewport.height === 800) {
      expect(before.primary.scrollHeight).toBeLessThanOrEqual(before.primary.clientHeight);
      expect(after.primary.scrollHeight).toBeGreaterThan(after.primary.clientHeight);
    }
    expectStableLayout(before, after);
    await page.locator("#phones").getByRole("button", { name: "Remove Moondrop Aria", exact: true }).click();
    await expect(page.locator("tbody.curves > tr")).toHaveCount(2);
    expectStableLayout(before, await captureLayout(page));
    if (viewport.width <= 1000) expect((await captureLayout(page)).primary.gutter).toBe(0);
  });
}

test("long curve lists still scroll below the graph", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?share=Moondrop_Lan_2_POP,Moondrop_Moca,Moondrop_Aria,TruthEars_Hexa,Moondrop_Kato,Moondrop_Alice");
  const rows = page.locator("tbody.curves > tr");
  await expect(rows).toHaveCount(6);
  const primary = page.locator(".parts-primary");
  expect(await primary.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  await primary.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect(rows.last()).toBeInViewport();
  expect(await primary.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  const last = (await rows.last().boundingBox())!, bounds = (await primary.boundingBox())!;
  expect(last.y + last.height).toBeLessThanOrEqual(bounds.y + bounds.height + 1);
});
