import { test, expect, type Locator } from "@playwright/test";

async function expectTick(menu: Locator, label: string) {
  const selected = menu.getByRole("menuitemradio", { name: label, exact: true });
  await expect(selected).toHaveAttribute("aria-checked", "true");
  await expect(menu.locator('.select-option-check[data-icon-library="phosphor"]')).toHaveCount(1);
  await expect(selected.locator(".select-option-check")).toHaveCount(1);
  await expect(menu.locator('[role="menuitemradio"][aria-checked="false"] .select-option-check')).toHaveCount(0);
  const labelBox = (await selected.locator("span").first().boundingBox())!, tickBox = (await selected.locator(".select-option-check").boundingBox())!;
  expect(tickBox.x).toBeGreaterThan(labelBox.x + labelBox.width);
  const styles = await selected.evaluate((element) => {
    const probe = document.createElement("span");
    probe.style.backgroundColor = "var(--accent-color)";
    probe.style.color = "var(--font-color-primary)";
    element.append(probe);
    const result = { background: getComputedStyle(element).backgroundColor, accent: getComputedStyle(probe).backgroundColor, color: getComputedStyle(element).color, foreground: getComputedStyle(probe).color };
    probe.remove();
    return result;
  });
  expect(styles.background).not.toBe(styles.accent);
  expect(styles.color).toBe(styles.foreground);
}

async function expectMenuHighlight(item: Locator) {
  const colors = await item.evaluate((element) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d")!;
    const rgba = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data);
    };
    const style = getComputedStyle(element);
    const probe = document.createElement("span");
    probe.style.backgroundColor = "var(--accent-color)";
    probe.style.color = "var(--font-color-primary)";
    element.append(probe);
    const result = {
      background: rgba(style.backgroundColor),
      surface: rgba(getComputedStyle(element.closest(".MuiPaper-root")!).backgroundColor),
      accent: rgba(getComputedStyle(probe).backgroundColor),
      color: style.color,
      foreground: getComputedStyle(probe).color,
    };
    probe.remove();
    return result;
  });
  expect(colors.background[3]).toBe(255);
  expect(Math.max(...colors.background.slice(0, 3).map((channel, index) => Math.abs(channel - colors.surface[index])))).toBeGreaterThanOrEqual(12);
  expect(colors.background).not.toEqual(colors.accent);
  expect(colors.color).toBe(colors.foreground);
}

for (const width of [1440, 390]) test(`dropdowns mark selection with a right-side tick instead of accent highlighting (${width}px)`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?share=Moondrop_Aria,Moondrop_Moca");
  await expect(page.locator("tbody.curves > tr")).toHaveCount(2);
  await page.getByRole("button", { name: "Equalizer", exact: true }).click();
  const model = page.getByRole("button", { name: "Choose EQ model", exact: true });
  await model.click();
  let menu = page.getByRole("menu");
  await expectTick(menu, "Choose EQ model");
  await menu.getByRole("menuitemradio", { name: "Moondrop Aria", exact: true }).click();
  await expect(menu).toHaveCount(0);
  await model.click();
  menu = page.getByRole("menu");
  await expectTick(menu, "Moondrop Aria");
  await page.keyboard.press("Escape");
  await expect(model).toBeFocused();

  const type = page.getByRole("button", { name: "Filter 1 type", exact: true });
  await type.click();
  menu = page.getByRole("menu");
  await expectTick(menu, "PK");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(type).toHaveAttribute("data-value", "LSQ");
  await type.click();
  menu = page.getByRole("menu");
  await expectTick(menu, "LSQ");
  await page.keyboard.press("Escape");

  const sampleRate = page.getByRole("button", { name: "Sample rate", exact: true });
  await sampleRate.click();
  menu = page.getByRole("menu");
  await expectTick(menu, "48000");
  await menu.getByRole("menuitemradio", { name: "96000", exact: true }).click();
  await expect(sampleRate).toHaveAttribute("data-value", "96000");
  await sampleRate.click();
  await expectTick(page.getByRole("menu"), "96000");
  await page.keyboard.press("Escape");
});

test("selected ticks remain visible and neutral in dark mode", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "dark mode", exact: true }).click();
  await page.getByRole("button", { name: "Equalizer", exact: true }).click();
  await page.getByRole("button", { name: "Filter 1 type", exact: true }).click();
  await expectTick(page.getByRole("menu"), "PK");
});

for (const dark of [false, true]) test(`menu hover and keyboard focus remain visible in ${dark ? "dark" : "light"} mode`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?share=Moondrop_Aria");
  await expect(page.locator("tbody.curves > tr")).toHaveCount(1);
  if (dark) {
    await page.getByRole("button", { name: "dark mode", exact: true }).click();
    await expect(page.locator("body")).toHaveClass(/dark-mode/);
  }
  await page.getByRole("button", { name: "Equalizer", exact: true }).click();
  for (const dropdown of [
    { name: "Range type", selected: "Default", other: "CS2" },
    { name: "Choose EQ model", selected: "Choose EQ model", other: "Moondrop Aria" },
    { name: "Filter 1 type", selected: "PK", other: "LSQ" },
    { name: "Sample rate", selected: "48000", other: "96000" },
    { name: "Channel mode", selected: "Stereo", other: "Mono" },
  ]) await test.step(dropdown.name, async () => {
    const trigger = page.getByRole("button", { name: dropdown.name, exact: true });
    await trigger.click();
    const menu = page.getByRole("menu");
    const selected = menu.getByRole("menuitemradio", { name: dropdown.selected, exact: true });
    const other = menu.getByRole("menuitemradio", { name: dropdown.other, exact: true });
    await selected.hover();
    await expectMenuHighlight(selected);
    await other.hover();
    await expectMenuHighlight(other);
    await expectTick(menu, dropdown.selected);
    await page.mouse.move(0, 0);
    await page.keyboard.press("End");
    const focused = menu.getByRole("menuitemradio").last();
    await expect(focused).toBeFocused();
    await expectMenuHighlight(focused);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  });
  await page.getByRole("button", { name: "Brands", exact: true }).click();
  for (const name of ["Upload", "Screenshot"]) await test.step(name, async () => {
    const trigger = page.getByRole("button", { name, exact: true });
    await trigger.click(name === "Screenshot" ? { button: "right" } : {});
    const items = page.getByRole("menu").getByRole("menuitem");
    await items.first().hover();
    await expectMenuHighlight(items.first());
    await items.last().hover();
    await expectMenuHighlight(items.last());
    await page.mouse.move(0, 0);
    await page.keyboard.press("End");
    await expect(items.last()).toBeFocused();
    await expectMenuHighlight(items.last());
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  });
});
