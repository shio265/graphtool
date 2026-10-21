import Fuse from "fuse.js";
import { config, frequencies } from "./config";
import { modelIdentity } from "./model-identity";
import type { BrandEntry, Channels, Model, ResponseCurve } from "./types";

export function parseResponse(text: string): ResponseCurve {
  const points = text.split(/[\r\n]/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("*"))
    .map((line) => line.split(/[\s,;]+/).slice(0, 2).map(Number.parseFloat))
    .filter((point) => point.length === 2 && point[0] > 0 && point.every(Number.isFinite))
    .map(([f, spl]): [number, number] => [f, spl])
    .sort((a, b) => a[0] - b[0]);
  return points.filter((point, index) => !index || point[0] !== points[index - 1][0]);
}

export function interpolate(values: readonly number[], curve: ResponseCurve): ResponseCurve {
  if (!curve.length) return [];
  let index = 0;
  return values.map((f) => {
    for (; index < curve.length - 1; index++) {
      const [f0, v0] = curve[index];
      const [f1, v1] = curve[index + 1];
      if (!index && f < f0) return [f, v0];
      if (f >= f0 && f < f1) return [f, v0 + (v1 - v0) * (f - f0) / (f1 - f0)];
    }
    return [f, curve[curve.length - 1][1]];
  });
}

export function buildCatalog(brands: BrandEntry[]): Model[] {
  const brandNames = new Set<string>();
  for (const brand of brands) {
    if (brandNames.has(brand.name)) throw new Error(`Duplicate brand: ${brand.name}`);
    brandNames.add(brand.name);
  }
  const keys = new Set<string>(), identities = new Set<string>();
  return brands.flatMap((brand) => brand.models.map((entry) => {
    const phone = typeof entry === "string" ? { name: entry } : entry;
    const files = phone.file ?? phone.name;
    const variants = Array.isArray(files) ? files.map((fileName, index) => ({
      fileName,
      name: phone.suffix ? `${phone.name}${phone.suffix[index] ? ` ${phone.suffix[index]}` : ""}`
        : phone.prefix ? `${phone.name}${fileName.replace(new RegExp(`^${phone.prefix}\\s*`, "i"), "") ? ` ${fileName.replace(new RegExp(`^${phone.prefix}\\s*`, "i"), "")}` : ""}`
        : fileName,
    })) : undefined;
    const displayBrand = `${brand.name}${phone.collab ? ` x ${phone.collab}` : ""}`;
    const model: Model = {
      key: `${brand.name}:${phone.name}`,
      brand: brand.name,
      brandSuffix: brand.suffix,
      collab: phone.collab,
      name: phone.name,
      fullName: `${displayBrand} ${phone.name}`,
      fileName: variants?.[0]?.fileName ?? (files as string),
      variants,
    };
    if (keys.has(model.key)) throw new Error(`Duplicate model in ${brand.name}: ${phone.name}`);
    keys.add(model.key);
    for (const fileName of new Set(variants?.map((variant) => variant.fileName) ?? [model.fileName])) {
      const identity = modelIdentity({ ...model, fileName });
      if (identities.has(identity)) throw new Error(`Duplicate measurement in ${brand.name}: ${fileName}`);
      identities.add(identity);
    }
    return model;
  }));
}

export function responseFiles(model: Model): string[] {
  const directory = model.isTarget ? config.targetDirectory : `${config.modelDirectory}${encodeURIComponent(model.brand)}/`;
  return (model.isTarget ? [model.fileName] : [`${model.fileName} L`, `${model.fileName} R`])
    .map((file) => `${directory}${encodeURIComponent(file)}.txt`);
}

const responseCache = new Map<string, Promise<Channels>>();

export async function loadResponse(model: Model): Promise<Channels> {
  if (model.isDynamic && "rawChannels" in model && Array.isArray(model.rawChannels)) return model.rawChannels as Channels;
  const cacheKey = modelIdentity(model);
  let request = responseCache.get(cacheKey);
  if (!request) {
    request = Promise.all(responseFiles(model).map(async (file) => {
      const response = await fetch(file);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Could not load ${file} (${response.status}).`);
      }
      const curve = parseResponse(await response.text());
      return curve.length ? interpolate(frequencies, curve) : null;
    })).then((channels) => {
      if (!channels.some(Boolean)) throw new Error(`Headphone not found: ${model.fullName}`);
      return channels;
    }).catch((error: unknown) => {
      responseCache.delete(cacheKey);
      throw error;
    });
    responseCache.set(cacheKey, request);
  }
  return request;
}

export function searchModels(models: Model[], query: string, selectedBrands: string[]): Model[] {
  const inBrand = (model: Model) => selectedBrands.includes(model.brand) || !!model.collab && selectedBrands.includes(model.collab);
  if (query.length < 2) return selectedBrands.length ? models.filter(inBrand) : models;
  const results = new Fuse(models, {
    shouldSort: false, threshold: 0.2, ignoreLocation: true, minMatchCharLength: 2,
    keys: [{ name: "fullName", weight: 0.3 }, { name: "brandSuffix", weight: 0.1 }, { name: "name", weight: 0.6 }],
  }).search(query).map(({ item }) => item);
  const filtered = selectedBrands.length ? results.filter(inBrand) : results;
  return filtered.length ? filtered : results;
}

export function searchBrands(brands: string[], query: string): string[] {
  if (query.length < 2) return brands;
  const result = new Fuse(brands, { shouldSort: false, threshold: 0.05, minMatchCharLength: 3 }).search(query).map(({ item }) => item);
  return result.length ? result : brands;
}

export function parseUpload(text: string): ResponseCurve {
  const curve = parseResponse(text);
  if (curve.length < 32) throw new Error("Parse frequency response file failed: invalid format (at least 32 valid points required).");
  return interpolate(frequencies, curve);
}
