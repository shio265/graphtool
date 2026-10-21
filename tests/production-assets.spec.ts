import { test, expect } from "@playwright/test";

test("standalone publishes browser favicons in the HTML head and serves decodable images", async ({ page, request }) => {
  await page.goto("/");
  const icons = await page.locator('head link[rel="icon"]').evaluateAll((links) => links.map((link) => ({ href: link.getAttribute("href")!, type: link.getAttribute("type"), sizes: link.getAttribute("sizes") })));
  expect(icons.some((icon) => new URL(icon.href, page.url()).pathname === "/favicon.ico")).toBe(true);
  const png = icons.find((icon) => icon.type === "image/png");
  expect(png).toBeDefined();
  expect(png!.href).toMatch(/^\/icon\.png\?.+/);
  expect(png!.sizes).toBe("32x32");
  expect(icons.some((icon) => icon.href === "/cringraph-favicon.png")).toBe(false);
  const fallback = await request.get("/favicon.ico");
  expect(fallback.status()).toBe(200);
  expect(fallback.headers()["content-type"]).toMatch(/image\/(?:x-icon|vnd\.microsoft\.icon)/);
  for (const icon of icons) {
    const response = await request.get(icon.href);
    expect(response.status(), icon.href).toBe(200);
    expect(response.headers()["content-type"], icon.href).toMatch(/image\/(?:png|x-icon|vnd\.microsoft\.icon)/);
    const dimensions = await page.evaluate(async (href) => {
      const image = new Image();
      image.src = href;
      await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight };
    }, icon.href);
    expect([16, 32, 48], icon.href).toContain(dimensions.width);
    expect(dimensions.height).toBe(dimensions.width);
  }
  const apple = page.locator('head link[rel="apple-touch-icon"]');
  await expect(apple).toHaveAttribute("type", "image/png");
  await expect(apple).toHaveAttribute("sizes", "180x180");
  const appleUrl = (await apple.getAttribute("href"))!;
  expect(appleUrl).toMatch(/^\/apple-icon\.png\?.+/);
  expect((await request.get(appleUrl)).status()).toBe(200);
});

test("production serves a valid sitemap containing one absolute homepage URL", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toMatch(/xml/);
  const xml = await response.text();
  expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  expect(locations).toHaveLength(1);
  const homepage = new URL(locations[0]);
  expect(["http:", "https:"]).toContain(homepage.protocol);
  expect(homepage.search).toBe("");
  expect(homepage.hash).toBe("");
  expect(xml).toContain("<priority>1</priority>");
});

test("production serves compiled CSS/JS, fonts and public measurements instead of HTML fallbacks", async ({ request }) => {
  const document = await request.get("/");
  expect(document.ok()).toBe(true);
  const html = await document.text();
  const assets = [...new Set([...html.matchAll(/(?:href|src)="([^\"]+)"/g)].map((match) => match[1]).filter((url) => url.startsWith("/_next/static/") && /\.(css|js)(?:\?|$)/.test(url)))];
  expect(assets.some((url) => /\.css(?:\?|$)/.test(url))).toBe(true);
  expect(assets.some((url) => /\.js(?:\?|$)/.test(url))).toBe(true);
  const stylesheets = await Promise.all(assets.map(async (url) => {
    const response = await request.get(url);
    expect(response.status(), url).toBe(200);
    expect(response.headers()["content-type"], url).toMatch(/\.css(?:\?|$)/.test(url) ? /text\/css/ : /javascript/);
    return /\.css(?:\?|$)/.test(url) ? { url: response.url(), css: await response.text() } : null;
  }));
  expect(stylesheets.filter((stylesheet) => stylesheet).map((stylesheet) => stylesheet!.css).join("\n")).toContain("--accent-color");
  const fonts = stylesheets.flatMap((stylesheet) => stylesheet ? [...stylesheet.css.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((match) => new URL(match[1], stylesheet.url)).filter((url) => /\.(otf|ttf|woff2?)(?:\?|$)/.test(url.pathname)) : []);
  expect(fonts.length).toBeGreaterThan(0);
  for (const font of fonts) expect((await request.get(font.href)).status(), font.href).toBe(200);
  for (const url of ["/cringraph-favicon.png", "/data/models/index.json", "/data/models/Moondrop/Aria%20L.txt", "/data/targets/Shiori%20Target.txt"]) expect((await request.get(url)).status(), url).toBe(200);
});

test("production HTML keeps the graph layout and control styling before hydration", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator(".graphtool")).toHaveCSS("display", "flex");
    await expect(page.locator(".parts-secondary")).toHaveCSS("width", "350px");
    await expect(page.locator("#copy-url")).toHaveCSS("height", "36px");
    await expect(page.locator("#copy-url")).toHaveCSS("font-size", "12px");
    await expect(page.locator("body")).toHaveCSS("margin", "0px");
  } finally { await context.close(); }
});

for (const width of [1440, 390]) {
  test(`AutoEQ running keeps the original plain status and blocking backdrop (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      const postMessage = Worker.prototype.postMessage;
      Worker.prototype.postMessage = function (this: Worker, message: unknown, options?: Transferable[] | StructuredSerializeOptions) {
        window.addEventListener("run-autoeq-status-test", () => Reflect.apply(postMessage, this, [message, options]), { once: true });
      };
    });
    await page.goto("/?share=Moondrop_Aria,targets/Shiori%2520Target");
    await expect(page.locator("tbody.curves > tr")).toHaveCount(2);
    await page.getByRole("button", { name: "Equalizer", exact: true }).click();
    const trigger = page.getByRole("button", { name: "AutoEQ", exact: true, includeHidden: true });
    await trigger.click();
    const status = page.getByRole("status");
    await expect(status).toHaveText("AutoEQ is running, it could take 5~20 seconds or more.");
    await expect(status).not.toHaveClass(/MuiAlert-root/);
    await expect(status.locator("svg")).toHaveCount(0);
    await expect(status).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(status).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(status).toHaveCSS("font-weight", "700");
    await expect(status).toHaveCSS("text-align", "center");
    await expect(status).toBeFocused();
    await expect(trigger).toBeDisabled();
    const backdrop = page.locator(".autoeq-modal .MuiBackdrop-root");
    await expect(backdrop).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(status).toBeVisible();
    await backdrop.click({ position: { x: 8, y: 8 } });
    await expect(status).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(status).toBeFocused();
    await page.evaluate(() => window.dispatchEvent(new Event("run-autoeq-status-test")));
    await expect(status).toHaveCount(0, { timeout: 60000 });
    await expect(trigger).toBeEnabled();
    await expect(page.getByLabel("Filter 1 frequency", { exact: true })).not.toHaveValue("0");
  });
}

test("production hydrates shared measurements and loads the AutoEQ worker from the bundle", async ({ page }) => {
  const errors: string[] = [], failedAssets: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => { if (response.status() >= 400 && /\/(?:_next\/static|data)\//.test(response.url())) failedAssets.push(response.url()); });
  page.on("requestfailed", (request) => { if (request.url().includes("/_next/static/")) failedAssets.push(request.url()); });
  await page.goto("/?share=Aria,Shiori_Target");
  await expect(page.locator("tbody.curves > tr")).toHaveCount(2);
  await expect(page.locator(".graph-curves path")).toHaveCount(3);
  await expect.poll(() => page.locator(".graphtool").evaluate((root) => (root as HTMLElement).style.opacity)).toBe("1");
  await page.getByRole("button", { name: "Equalizer", exact: true }).click();
  const worker = page.waitForEvent("worker");
  await page.getByRole("button", { name: "AutoEQ", exact: true }).click();
  // Turbopack may wrap the bundled worker chunks in a bootstrap blob URL.
  expect((await worker).url()).toMatch(/(?:\/_next\/static\/|^blob:)/);
  await expect(page.locator(".extra-eq-overlay")).toHaveCount(0, { timeout: 60000 });
  await expect(page.getByLabel("Filter 1 frequency", { exact: true })).not.toHaveValue("0");
  expect(failedAssets).toEqual([]);
  expect(errors).toEqual([]);
});
