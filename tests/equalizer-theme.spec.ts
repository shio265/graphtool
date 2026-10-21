import { test, expect } from "@playwright/test";

for (const width of [1440, 390]) test(`all Equalizer inputs match Channel mode in dark mode without changing light mode (${width}px)`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?share=Moondrop_Aria");
  await expect(page.locator("tbody.curves > tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Equalizer", exact: true }).click();
  const controls = page.locator('.extra-panel input[type="number"], .extra-panel [data-select-trigger]');
  const appearances = () => controls.evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element);
    return { label: element.getAttribute("aria-label"), background: style.backgroundColor, color: style.color };
  }));
  await expect(controls).toHaveCount(56);
  const lightStyles = await appearances();
  const theme = page.getByRole("button", { name: "dark mode", exact: true });
  await theme.click();
  await expect(page.locator("body")).toHaveClass(/dark-mode/);
  const channel = page.getByRole("button", { name: "Channel mode", exact: true });
  const reference = await channel.evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, color: style.color };
  });
  const foreground = await page.locator("body").evaluate((element) => getComputedStyle(element).color);
  const expectDarkControls = async () => {
    for (const appearance of await appearances()) {
      expect(appearance.background, appearance.label ?? "Input background").toBe(reference.background);
      expect([reference.color, foreground], appearance.label ?? "Input text").toContain(appearance.color);
    }
  };
  await expectDarkControls();
  const chevrons = await page.locator(".extra-panel .select-chevron-icon").evaluateAll((elements) => elements.map((element) => getComputedStyle(element).color));
  for (const color of chevrons) expect([reference.color, foreground]).toContain(color);

  const type = page.getByRole("button", { name: "Filter 1 type", exact: true });
  await type.click();
  await page.getByRole("menuitemradio", { name: "LSQ", exact: true }).click();
  await expect(type).toHaveAttribute("data-value", "LSQ");
  for (const [name, value] of [["frequency", "1000"], ["gain", "-3"], ["Q", "1.2"]]) {
    const input = page.getByRole("spinbutton", { name: `Filter 1 ${name}`, exact: true });
    await input.fill(value);
    await input.press("Tab");
    await expect(input).toHaveValue(value);
  }
  for (const [name, value] of [
    ["Frequency Range minimum", "50"],
    ["Gain Range maximum", "10"],
    ["Q Range maximum", "3"],
    ["Convolution frequency resolution value", "32"],
    ["Convolution preamp value", "-2"],
    ["Tone minimum frequency", "30"],
    ["Tone maximum frequency", "18000"],
    ["Tone frequency", "500"],
  ]) {
    const input = page.getByRole("spinbutton", { name, exact: true });
    await input.fill(value);
    await input.press("Tab");
    await expect(input).toHaveValue(value);
  }
  for (const dropdown of [
    { name: "Sample rate", label: "96000", value: "96000" },
    { name: "Bit depth", label: "24 bit", value: "24" },
    { name: "Phase", label: "linear", value: "linear" },
  ]) {
    const trigger = page.getByRole("button", { name: dropdown.name, exact: true });
    await trigger.click();
    await page.getByRole("menuitemradio", { name: dropdown.label, exact: true }).click();
    await expect(trigger).toHaveAttribute("data-value", dropdown.value);
  }
  await page.getByRole("button", { name: "Add EQ filter", exact: true }).click();
  await expect(controls).toHaveCount(60);
  await expectDarkControls();
  await page.getByRole("button", { name: "Remove last EQ filter", exact: true }).click();
  await expect(controls).toHaveCount(56);
  await theme.click();
  await expect(page.locator("body")).not.toHaveClass(/dark-mode/);
  expect(await appearances()).toEqual(lightStyles);
});
