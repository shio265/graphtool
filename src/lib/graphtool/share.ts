import { config } from "./config";
import { modelIdentity } from "./model-identity";
import type { Model } from "./types";

export function readSharedModels(search: string): string[] {
  // Keep format delimiters until resolution so compact brand-qualified IDs and
  // old filename-only links can coexist in the same URL.
  return [...new Set((new URLSearchParams(search).get("share") ?? "").split(",").filter(Boolean))];
}

function compactModelId(model: Model): string {
  const brand = encodeURIComponent(model.brand).replace(/_/g, "%5F");
  const file = encodeURIComponent(model.fileName).replace(/_/g, "%5F").replace(/%20/g, "_");
  return `${brand}_${file}`;
}

function readCompactModelId(identifier: string): { brand: string; fileName: string } | undefined {
  const separator = identifier.indexOf("_");
  if (separator < 1) return;
  try {
    return {
      brand: decodeURIComponent(identifier.slice(0, separator)),
      // Expand shorthand underscores before decoding %5F for literal underscores.
      fileName: decodeURIComponent(identifier.slice(separator + 1).replace(/_/g, " ")),
    };
  } catch { return; }
}

export function sharedModel(catalog: Model[], identifier: string): Model | undefined {
  const qualified = /^(models|targets)\//.test(identifier);
  const compact = qualified ? undefined : readCompactModelId(identifier);
  const legacyName = identifier.replace(/_/g, " ");
  const compactMatches = new Map<string, Model>(), legacyMatches = new Map<string, Model>();
  for (const model of catalog) {
    if (model.isDynamic) continue;
    const candidates = [model, ...(model.variants ?? []).map((variant) => ({
      ...model, key: variant.fileName === model.fileName ? model.key : `${model.key}:${variant.fileName}`,
      fileName: variant.fileName, name: variant.name,
    }))];
    for (const candidate of candidates) {
      const identity = modelIdentity(candidate);
      if (identity === identifier) return candidate;
      if (compact && !candidate.isTarget && candidate.brand === compact.brand && candidate.fileName === compact.fileName && !compactMatches.has(identity)) compactMatches.set(identity, candidate);
      if (!qualified && (candidate.fileName === identifier || candidate.fileName === legacyName)) legacyMatches.set(identity, candidate);
    }
  }
  // Brand-qualified shorthand takes precedence over legacy filename-only links.
  if (compactMatches.size) return compactMatches.size === 1 ? compactMatches.values().next().value : undefined;
  // Old links have no brand. Don't silently select the wrong measurement if ambiguous.
  return legacyMatches.size === 1 ? legacyMatches.values().next().value : undefined;
}

export function sharedModelIds(models: Model[]): string[] {
  return [...new Set(models.filter((model) => !model.isDynamic).map((model) => model.isTarget ? modelIdentity(model) : compactModelId(model)))];
}

export function updateShareURL(models: Model[]): void {
  const ids = sharedModelIds(models);
  const names = models.filter((model) => !model.isDynamic).map((model) => model.fullName);
  const url = new URL(window.location.href);
  if (ids.length) url.searchParams.set("share", ids.join(","));
  else url.searchParams.delete("share");
  // Keep target prefixes and item separators readable; encoded name characters
  // remain protected by the query's outer encoding layer.
  const search = url.search.replace(/%2C/gi, ",").replace(/%2F/gi, "/");
  window.history.replaceState(null, "", `${url.pathname}${search}${url.hash}`);
  document.title = names.length ? `${names.join(", ")} - ${config.title}` : config.title;
  const description = document.querySelector('meta[name="description"]');
  description?.setAttribute("content", `${config.description}${names.length ? ` Including ${names.join(", ")}.` : ""}`);
}

export async function copyShareURL(): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(window.location.href); return; } catch { /* Use the fallback when clipboard permission is denied. */ }
  }
  const input = document.createElement("textarea");
  input.value = window.location.href;
  input.style.cssText = "position:fixed;opacity:0";
  document.body.append(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("Could not copy the URL. Please copy it from the address bar.");
}
