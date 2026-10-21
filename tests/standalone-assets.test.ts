import { test } from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { prepareStandalone } from "../src/lib/prepare-standalone";

async function withFixture(run: (root: string, write: (path: string, content: string) => Promise<void>) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "graphtool-standalone-"));
  const write = async (path: string, content: string) => {
    const file = join(root, path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, content);
  };
  try { await run(root, write); }
  finally { await rm(root, { recursive: true, force: true }); }
}

test("standalone packaging copies CSS, scripts, fonts and public measurements without changing the server", async () => withFixture(async (root, write) => {
  const files = {
    "public/data/models/Example/Model L.txt": "20 60\n1000 65",
    "public/data/targets/Example Target.txt": "20 60\n1000 60",
    "public/cringraph-favicon.png": "favicon",
    ".next/static/chunks/app.css": "body{margin:0}",
    ".next/static/chunks/app.js": "hydrate()",
    ".next/static/chunks/autoeq-worker.js": "onmessage=optimize",
    ".next/static/media/Helvetica Regular.otf": "font",
  };
  await write(".next/standalone/server.js", "standalone server");
  await Promise.all(Object.entries(files).map(([path, content]) => write(path, content)));
  const bundle = await prepareStandalone(root);
  assert.equal(bundle, join(root, ".next", "standalone"));
  for (const [path, content] of Object.entries(files)) {
    assert.equal(await readFile(join(bundle, path), "utf8"), content);
    assert.equal(await readFile(join(root, path), "utf8"), content);
  }
  assert.equal(await readFile(join(bundle, "server.js"), "utf8"), "standalone server");
}));

test("preparing an existing bundle refreshes changed assets without nesting the source folders", async () => withFixture(async (root, write) => {
  await write(".next/standalone/server.js", "server");
  await write("public/data/models/index.json", "[]");
  await write(".next/static/chunks/app.css", "old CSS");
  await prepareStandalone(root);
  await write(".next/static/chunks/app.css", "new CSS");
  await prepareStandalone(root);
  assert.equal(await readFile(join(root, ".next/standalone/.next/static/chunks/app.css"), "utf8"), "new CSS");
  await assert.rejects(access(join(root, ".next/standalone/public/public")));
  await assert.rejects(access(join(root, ".next/standalone/.next/static/static")));
}));

test("missing standalone output fails before creating an incomplete bundle", async () => withFixture(async (root, write) => {
  await write("public/data/models/index.json", "[]");
  await write(".next/static/chunks/app.css", "CSS");
  await assert.rejects(prepareStandalone(root), /Standalone server is missing/);
  await assert.rejects(access(join(root, ".next/standalone/public")));
}));

test("missing compiled static assets fail before copying public files", async () => withFixture(async (root, write) => {
  await write(".next/standalone/server.js", "server");
  await write("public/data/models/index.json", "[]");
  await assert.rejects(prepareStandalone(root), /ENOENT/);
  await assert.rejects(access(join(root, ".next/standalone/public")));
}));
