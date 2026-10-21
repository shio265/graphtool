import { test, expect } from "@playwright/test";

const compactShare = "targets/Shiori%2520Target,Moondrop_Moca,TruthEars_Zero";

test("compact model links load, reload and copy with the target format unchanged", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value: string) => { document.documentElement.dataset.copiedShare = value; } } });
  });
  await page.goto(`/?share=${compactShare}`);
  for (const load of ["first load", "reload"]) {
    if (load === "reload") await page.reload();
    await expect(page.locator("tbody.curves > tr")).toHaveCount(3);
    await expect(page.locator(".graph-curves path")).toHaveCount(3);
    await expect(page.locator("tbody.curves").getByRole("button", { name: "Remove Moondrop Moca", exact: true })).toBeVisible();
    await expect(page.locator("tbody.curves").getByRole("button", { name: "Remove TruthEars Zero", exact: true })).toBeVisible();
    await expect(page.locator("tbody.curves").getByRole("button", { name: "Remove Shiori Target", exact: true })).toBeVisible();
    await expect.poll(() => new URL(page.url()).search).toBe(`?share=${compactShare}`);
  }
  await page.getByRole("button", { name: "Copy URL", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-copied-share", page.url());
  await page.locator("tbody.curves").getByRole("button", { name: "Remove Moondrop Moca", exact: true }).click();
  await expect.poll(() => new URL(page.url()).search).toBe("?share=targets/Shiori%2520Target,TruthEars_Zero");
  await page.locator("tbody.curves").getByRole("button", { name: "Remove TruthEars Zero", exact: true }).click();
  await page.locator("tbody.curves").getByRole("button", { name: "Remove Shiori Target", exact: true }).click();
  await expect.poll(() => new URL(page.url()).search).toBe("");
  expect(errors).toEqual([]);
});

test("mixed old and compact links normalize without duplicates or losing other URL state", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?keep=value&share=targets/Shiori%2520Target,Shiori_Target,models/Moondrop/Moca,Moondrop_Moca,Moca,models/TruthEars/Zero,TruthEars_Zero,Zero#graph");
  await expect(page.locator("tbody.curves > tr")).toHaveCount(3);
  await expect(page.locator(".graph-curves path")).toHaveCount(3);
  await expect.poll(() => new URL(page.url()).search).toBe(`?keep=value&share=${compactShare}`);
  expect(new URL(page.url()).hash).toBe("#graph");
  await page.reload();
  await expect(page.locator("tbody.curves > tr")).toHaveCount(3);
});

test("compact filenames with spaces load the selected measurement variants", async ({ page }) => {
  const measurements: string[] = [], errors: string[] = [];
  page.on("request", (request) => {
    const path = decodeURIComponent(new URL(request.url()).pathname);
    if (path.startsWith("/data/models/")) measurements.push(path);
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?share=Moondrop_Lan_2_REF,Moondrop_Chu_II_DSP");
  await expect(page.locator("tbody.curves > tr")).toHaveCount(2);
  await expect(page.locator(".graph-curves path")).toHaveCount(2);
  await expect(page.locator("tbody.curves .phonename")).toHaveText(["Lan 2 REF", "Chu II DSP"]);
  for (const file of ["Lan 2 REF L", "Lan 2 REF R", "Chu II DSP L", "Chu II DSP R"]) expect(measurements).toContain(`/data/models/Moondrop/${file}.txt`);
  expect(measurements.some((path) => path.includes("Lan 2 POP") || /\/Chu II [LR]\.txt$/.test(path))).toBe(false);
  await expect.poll(() => new URL(page.url()).search).toBe("?share=Moondrop_Lan_2_REF,Moondrop_Chu_II_DSP");
  expect(errors).toEqual([]);
});
