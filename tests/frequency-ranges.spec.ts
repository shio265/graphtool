import { readFile } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import rangeData from "../public/data/ranges/index.json";

async function selectPreset(page: Page, name: string) {
  await page.getByRole("button", { name: "Range type", exact: true }).click();
  await page.getByRole("menuitemradio", { name, exact: true }).click();
}

for (const width of [1440, 390]) test(`JSON range presets update graph bands and per-range descriptions (${width}px)`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?share=Moondrop_Aria,targets/Shiori%2520Target");
  await expect(page.locator("tbody.curves > tr")).toHaveCount(2);
  if (width <= 1000) {
    await page.locator(".graph-sizer").click({ position: { x: 100, y: 60 } });
    await expect(page.locator("main")).toHaveAttribute("data-focused-panel", "primary");
  }
  const guide = page.locator(".tutorial-buttons"), trigger = page.getByRole("button", { name: "Range type", exact: true });
  const description = page.locator(".tutorial-description"), article = description.locator("article");
  await expect(trigger).toHaveAttribute("data-value", "default");
  await expect(trigger.locator(".select-trigger-icon")).toHaveCount(0);
  await expect(guide.locator(".button-segment")).toHaveCount(7);
  await guide.locator(".tutorial-range-buttons").evaluate((element) => { element.scrollLeft = element.scrollWidth; });
  const air = guide.getByRole("button", { name: "Air", exact: true });
  const airBox = (await air.boundingBox())!, triggerBox = (await trigger.boundingBox())!;
  expect(airBox.x + airBox.width).toBeLessThan(triggerBox.x);
  expect(triggerBox.x + triggerBox.width).toBeLessThanOrEqual(width);
  await air.click();
  await expect(article).toHaveText(rangeData[0].ranges[6].description);
  await expect.poll(() => description.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(1);
  await trigger.click();
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitemradio")).toHaveCount(3);
  await expect(menu.getByRole("menuitemradio", { name: "Default", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(menu.locator(".select-option-check")).toHaveCount(1);
  await expect(menu.getByRole("menuitemradio", { name: "Default", exact: true }).locator("img")).toHaveCount(0);
  for (const [name, src] of [["Delta Force", "/icon/Delta Force.png"], ["CS2", "/icon/CS2.png"]]) {
    const icon = menu.getByRole("menuitemradio", { name, exact: true }).locator("img");
    const url = new URL((await icon.getAttribute("src"))!, page.url());
    expect(decodeURIComponent(url.pathname)).toBe(src);
    expect(url.origin).toBe(new URL(page.url()).origin);
    await expect(icon).toHaveAttribute("alt", "");
    await expect.poll(() => icon.evaluate((element) => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0)).toBe(true);
    const bounds = (await icon.boundingBox())!;
    expect(bounds.width).toBe(16);
    expect(bounds.height).toBe(16);
  }
  const curvesBefore = await page.locator(".graph-curves path").evaluateAll((paths) => paths.map((path) => path.getAttribute("d")));
  await menu.getByRole("menuitemradio", { name: "Delta Force", exact: true }).click();
  await expect(trigger).toHaveAttribute("data-value", "delta-force");
  const selectedLogo = trigger.locator(".select-trigger-icon img");
  await expect(selectedLogo).toHaveCount(1);
  expect(decodeURIComponent(new URL((await selectedLogo.getAttribute("src"))!, page.url()).pathname)).toBe("/icon/Delta Force.png");
  await expect.poll(() => selectedLogo.evaluate((element) => (element as HTMLImageElement).naturalWidth > 0)).toBe(true);
  const logoBox = (await selectedLogo.boundingBox())!, valueBox = (await trigger.locator('[id$="-value"]').boundingBox())!;
  expect(logoBox.width).toBe(16);
  expect(logoBox.height).toBe(16);
  expect(logoBox.x + logoBox.width).toBeLessThan(valueBox.x);
  expect(await trigger.locator('[id$="-value"]').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await expect(description).toHaveCSS("height", "0px");
  await expect(guide.locator(".button-segment")).toHaveText(["Immersion", "Footsteps", "Gun", "Heal"]);
  await expect(page.locator(".frequency-range-band")).toHaveCount(4);
  await expect(page.locator('.frequency-range-band[data-range-id="footsteps"]')).toHaveAttribute("data-to", "330");
  await expect(page.locator('.frequency-range-band[data-range-id="gun"]')).toHaveAttribute("data-from", "3500");
  expect(await page.locator(".graph-curves path").evaluateAll((paths) => paths.map((path) => path.getAttribute("d")))).toEqual(curvesBefore);
  await guide.getByRole("button", { name: "Footsteps", exact: true }).click();
  await expect(article).toHaveText(rangeData[1].ranges[1].description);
  await expect(page.locator('.frequency-range-band[data-range-id="footsteps"]')).toHaveAttribute("data-active", "true");
  await guide.getByRole("button", { name: "Footsteps", exact: true }).click();
  await expect(description).toHaveCSS("height", "0px");
  await expect(page.locator(".frequency-range-band")).toHaveCount(4);
  await guide.getByRole("button", { name: "Heal", exact: true }).click();
  await expect(article).toHaveText(rangeData[1].ranges[3].description);
  await selectPreset(page, "CS2");
  await expect(trigger).toHaveAttribute("data-value", "cs2");
  await expect(selectedLogo).toHaveCount(1);
  expect(decodeURIComponent(new URL((await selectedLogo.getAttribute("src"))!, page.url()).pathname)).toBe("/icon/CS2.png");
  await expect.poll(() => selectedLogo.evaluate((element) => (element as HTMLImageElement).naturalWidth > 0)).toBe(true);
  await expect(description).toHaveCSS("height", "0px");
  await expect(guide.locator(".button-segment")).toHaveText(["Immersion", "Footsteps", "Gun"]);
  await expect(page.locator(".frequency-range-band")).toHaveCount(3);
  await expect(page.locator('.frequency-range-band[data-range-id="footsteps"]')).toHaveAttribute("data-to", "450");
  await expect(page.locator('.frequency-range-band[data-range-id="gun"]')).toHaveAttribute("data-from", "5000");
  await guide.getByRole("button", { name: "Footsteps", exact: true }).click();
  await expect(article).toHaveText(rangeData[2].ranges[1].description);
  await selectPreset(page, "Default");
  await expect(trigger.locator(".select-trigger-icon")).toHaveCount(0);
  await expect(page.locator(".frequency-range-overlay")).toHaveCount(0);
  await expect(page.locator(".tutorial-overlay .overlay-segment")).toHaveCount(7);
  await expect(guide.locator(".button-segment")).toHaveCount(7);
  await expect(description).toHaveCSS("height", "0px");
  expect(errors).toEqual([]);
});

test("game bands follow zoom and remain decodable in SVG screenshot exports", async ({ page, request }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?share=Moondrop_Aria");
  await expect(page.locator("tbody.curves > tr")).toHaveCount(1);
  const response = await request.get("/data/ranges/index.json");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual(rangeData);
  for (const preset of rangeData) if (preset.icon) {
    const response = await request.get(encodeURI(preset.icon));
    expect(response.ok(), preset.icon).toBe(true);
    expect(response.headers()["content-type"], preset.icon).toMatch(/^image\/png/);
  }
  await selectPreset(page, "Delta Force");
  await page.getByRole("button", { name: "Bass", exact: true }).click();
  await expect(page.locator(".frequency-range-band")).toHaveCount(2);
  await page.getByRole("button", { name: "Mids", exact: true }).click();
  await expect(page.locator(".frequency-range-band")).toHaveCount(3);
  const gun = page.locator('.frequency-range-band[data-range-id="gun"] > rect').first();
  expect(await gun.evaluate((element) => Number(element.getAttribute("x")) + Number(element.getAttribute("width")))).toBeCloseTo(785, 6);
  await page.getByRole("button", { name: "Screenshot", exact: true }).click({ button: "right" });
  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "As .svg", exact: true }).click();
  const svg = await readFile((await (await download).path())!, "utf8");
  expect(svg).toContain("frequency-range-overlay");
  expect(svg).toContain("<pattern");
  expect(svg).toContain("Footsteps");
  expect(svg).not.toContain("graph-interaction");
  const size = await page.evaluate(async (source) => {
    const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml" }));
    try { const image = new Image(); image.src = url; await image.decode(); return [image.naturalWidth, image.naturalHeight]; }
    finally { URL.revokeObjectURL(url); }
  }, svg);
  expect(size).toEqual([800, 346]);
});

test("rapid preset switches safely replace descriptions while animejs height motion is active", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.locator(".tutorial-buttons").getByRole("button", { name: "Air", exact: true }).click();
  for (const name of ["Delta Force", "CS2", "Default", "Delta Force"]) {
    await selectPreset(page, name);
    await page.locator(".tutorial-buttons .button-segment").first().click();
  }
  await expect(page.locator(".description-segment")).toHaveText(rangeData[1].ranges[0].description);
  await expect.poll(() => page.locator(".tutorial-description").evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(1);
  expect(errors).toEqual([]);
});

test("an unavailable range logo falls back to Phosphor without breaking selection", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/icon/CS2.png", (route) => route.fulfill({ status: 404, contentType: "image/png", body: "" }));
  await page.goto("/");
  await page.getByRole("button", { name: "Range type", exact: true }).click();
  const option = page.getByRole("menuitemradio", { name: "CS2", exact: true });
  await expect(option.locator('svg[data-icon-library="phosphor"]')).toHaveCount(1);
  await expect(option.locator("img")).toHaveCount(0);
  await option.click();
  await expect(page.getByRole("button", { name: "Range type", exact: true })).toHaveAttribute("data-value", "cs2");
  const triggerIcon = page.getByRole("button", { name: "Range type", exact: true }).locator(".select-trigger-icon");
  await expect(triggerIcon.locator('svg[data-icon-library="phosphor"]')).toHaveCount(1);
  await expect(triggerIcon.locator("img")).toHaveCount(0);
  await expect(page.locator(".frequency-range-band")).toHaveCount(3);
});
