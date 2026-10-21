import { test } from "node:test";
import assert from "node:assert/strict";
import brands from "../public/data/models/index.json";
import { buildCatalog } from "../src/lib/graphtool/data";
import { modelIdentity } from "../src/lib/graphtool/model-identity";
import { readSharedModels, sharedModel, sharedModelIds } from "../src/lib/graphtool/share";
import { targetModels } from "../src/lib/graphtool/targets";
import type { Model } from "../src/lib/graphtool/types";

function model(brand: string, fileName: string, overrides: Partial<Model> = {}): Model {
  return { key: `${brand}:${fileName}`, brand, fileName, name: fileName, fullName: `${brand} ${fileName}`, ...overrides };
}

function searchFor(models: Model[]): string {
  const params = new URLSearchParams({ share: sharedModelIds(models).join(",") });
  return `?${params.toString().replace(/%2C/gi, ",").replace(/%2F/gi, "/")}`;
}

test("share IDs shorten models to Brand_File and keep target encoding unchanged", () => {
  const catalog = [model("Targets", "Shiori Target", { isTarget: true }), model("Moondrop", "Moca"), model("TruthEars", "Zero")];
  assert.deepEqual(sharedModelIds(catalog), ["targets/Shiori%20Target", "Moondrop_Moca", "TruthEars_Zero"]);
  assert.equal(searchFor(catalog), "?share=targets/Shiori%2520Target,Moondrop_Moca,TruthEars_Zero");
  for (const [index, id] of readSharedModels(searchFor(catalog)).entries()) assert.equal(sharedModel(catalog, id), catalog[index]);
});

test("reading share tokens preserves delimiters and removes empty/repeated tokens", () => {
  assert.deepEqual(readSharedModels("?share=Moondrop_Moca,,Shiori_Target,models/Moondrop/Moca,Moondrop_Moca"), ["Moondrop_Moca", "Shiori_Target", "models/Moondrop/Moca"]);
  assert.deepEqual(readSharedModels("?other=value"), []);
});

test("brand-qualified shorthand distinguishes identical filenames in different brands", () => {
  const catalog = [model("Moondrop", "Zero"), model("TruthEars", "Zero"), model("Targets", "Zero", { isTarget: true })];
  assert.equal(sharedModel(catalog, "Moondrop_Zero"), catalog[0]);
  assert.equal(sharedModel(catalog, "TruthEars_Zero"), catalog[1]);
  assert.equal(sharedModel(catalog, "targets/Zero"), catalog[2]);
  assert.equal(sharedModel(catalog, "Zero"), undefined);
});

test("qualified shorthand takes precedence over filename-only interpretation", () => {
  const catalog = [model("Other", "Moondrop Moca"), model("Moondrop", "Moca")];
  assert.equal(sharedModel(catalog, "Moondrop_Moca"), catalog[1]);
  assert.equal(sharedModel(catalog, "models/Other/Moondrop%20Moca"), catalog[0]);
});

test("old qualified IDs and unambiguous filename-only links still resolve", () => {
  const catalog = [model("Moondrop", "Space Travel (Reference)"), model("Targets", "Shiori Target", { isTarget: true })];
  for (const id of ["models/Moondrop/Space%20Travel%20(Reference)", "Space_Travel_(Reference)", "Space Travel (Reference)"]) assert.equal(sharedModel(catalog, id), catalog[0]);
  for (const id of ["targets/Shiori%20Target", "Shiori_Target", "Shiori Target"]) assert.equal(sharedModel(catalog, id), catalog[1]);
});

test("mixed short, qualified and legacy links retain one internal identity per measurement", () => {
  const catalog = [model("Moondrop", "Moca"), model("Targets", "Shiori Target", { isTarget: true })];
  const resolved = readSharedModels("?share=Moondrop_Moca,models/Moondrop/Moca,Moca,targets/Shiori%2520Target,Shiori_Target").map((id) => sharedModel(catalog, id)).filter((entry): entry is Model => !!entry);
  const selected = [...new Map(resolved.map((entry) => [modelIdentity(entry), entry])).values()];
  assert.deepEqual(sharedModelIds(selected), ["Moondrop_Moca", "targets/Shiori%20Target"]);
});

test("brands with spaces or underscores do not collide with filenames containing spaces", () => {
  const catalog = [model("Brand A", "B"), model("Brand", "A B"), model("Brand_A", "B")];
  assert.deepEqual(sharedModelIds(catalog), ["Brand%20A_B", "Brand_A_B", "Brand%5FA_B"]);
  for (const [index, id] of readSharedModels(searchFor(catalog)).entries()) assert.equal(sharedModel(catalog, id), catalog[index]);
});

test("literal underscores, commas, slashes, Unicode and percent escapes round-trip without ambiguity", () => {
  const catalog = [
    model("Brand", "Model_Name"), model("Brand", "Model Name"),
    model("A,B/_%", "Mẫu, / _ + %20 & # ?"),
    model("Targets", "Target_ / , + %20", { isTarget: true }),
  ];
  assert.equal(new Set(sharedModelIds(catalog)).size, catalog.length);
  const tokens = readSharedModels(searchFor(catalog));
  assert.equal(tokens.length, catalog.length);
  for (const [index, id] of tokens.entries()) assert.equal(sharedModel(catalog, id), catalog[index]);
});

test("all current catalog measurements and variants round-trip identically to their old qualified IDs", () => {
  const catalog = [...buildCatalog(brands), ...targetModels];
  for (const entry of catalog) {
    for (const fileName of new Set([entry.fileName, ...(entry.variants ?? []).map((variant) => variant.fileName)])) {
      const selected = { ...entry, fileName };
      const [id] = readSharedModels(searchFor([selected]));
      assert.deepEqual(sharedModel(catalog, id), sharedModel(catalog, modelIdentity(selected)), `${entry.brand}: ${fileName}`);
    }
  }
});

test("dynamic uploads and EQ curves are excluded and repeated model IDs are deduplicated", () => {
  const entry = model("Moondrop", "Moca");
  const upload = model("Uploaded", "Example", { isDynamic: true });
  const eq = model("Moondrop", "Moca EQ", { isDynamic: true });
  assert.deepEqual(sharedModelIds([entry, entry, upload, eq]), ["Moondrop_Moca"]);
  assert.equal(sharedModel([upload], "Uploaded_Example"), undefined);
});

test("unknown brands, missing variants and malformed escapes are ignored safely", () => {
  const catalog = [model("Moondrop", "Moca")];
  for (const id of ["Other_Moca", "Moondrop_Missing", "Moondrop_%E0%A4%A", "models/Missing/Moca"]) assert.equal(sharedModel(catalog, id), undefined);
});
