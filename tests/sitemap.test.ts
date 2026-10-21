import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSitemap } from "../src/lib/sitemap";

test("sitemap contains only the absolute homepage URL", () => {
  assert.deepEqual(buildSitemap("https://graphs.example.com"), [{ url: "https://graphs.example.com/", priority: 1 }]);
});

test("sitemap preserves a configured deployment path and trailing slash", () => {
  assert.deepEqual(buildSitemap("https://graphs.example.com/tool/"), [{ url: "https://graphs.example.com/tool/", priority: 1 }]);
});

test("shared graph selections and fragments are excluded from the sitemap", () => {
  assert.deepEqual(buildSitemap("https://graphs.example.com/?share=Aria,Hexa#graph"), [{ url: "https://graphs.example.com/", priority: 1 }]);
});

test("local development supports an HTTP origin", () => {
  assert.deepEqual(buildSitemap("http://localhost:3000"), [{ url: "http://localhost:3000/", priority: 1 }]);
});

test("invalid origins and credential-bearing URLs are rejected", () => {
  for (const url of ["not a URL", "ftp://graphs.example.com", "https://user:password@graphs.example.com"]) assert.throws(() => buildSitemap(url));
});
