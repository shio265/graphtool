import rangeData from "@/public/data/ranges/index.json";
import type { FrequencyScale } from "./graph-scales";
import { graphDimensions } from "./graph";

export interface FrequencyRange {
  id: string;
  name: string;
  from: number;
  to: number;
  description: string;
  color?: string;
  width?: string;
}

export interface FrequencyRangePreset {
  id: string;
  name: string;
  icon?: string;
  display: "highlight" | "bands";
  ranges: FrequencyRange[];
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${field} must be an object.`);
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be a non-empty string.`);
  return value.trim();
}

function identifier(value: unknown, field: string): string {
  const id = text(value, field);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error(`${field} must be a lowercase kebab-case identifier.`);
  return id;
}

export function parseFrequencyRangePresets(value: unknown): FrequencyRangePreset[] {
  if (!Array.isArray(value) || !value.length) throw new Error("Frequency range presets must be a non-empty array.");
  const ids = new Set<string>();
  const presets = value.map((input, index): FrequencyRangePreset => {
    const field = `presets[${index}]`, entry = object(input, field);
    const id = identifier(entry.id, `${field}.id`);
    if (ids.has(id)) throw new Error(`Duplicate frequency range preset: ${id}`);
    ids.add(id);
    const icon = entry.icon === undefined ? undefined : text(entry.icon, `${field}.icon`);
    if (icon && !/^\/icon\/[^/\\?#]+\.(?:png|jpe?g|webp|avif|gif|svg|ico)$/i.test(icon)) throw new Error(`${field}.icon must reference an image file in /icon/.`);
    if (entry.display !== "highlight" && entry.display !== "bands") throw new Error(`${field}.display must be highlight or bands.`);
    if (!Array.isArray(entry.ranges) || !entry.ranges.length) throw new Error(`${field}.ranges must be a non-empty array.`);
    const rangeIds = new Set<string>();
    const ranges = entry.ranges.map((input, rangeIndex): FrequencyRange => {
      const label = `${field}.ranges[${rangeIndex}]`, range = object(input, label);
      const rangeId = identifier(range.id, `${label}.id`);
      if (rangeIds.has(rangeId)) throw new Error(`Duplicate range in ${id}: ${rangeId}`);
      rangeIds.add(rangeId);
      const { from, to } = range;
      if (typeof from !== "number" || typeof to !== "number" || !Number.isFinite(from) || !Number.isFinite(to) || from < 20 || to > 20000 || from >= to) throw new Error(`${label} must have 20 <= from < to <= 20000 Hz.`);
      if (range.color !== undefined && (typeof range.color !== "string" || !/^#[0-9a-f]{6}$/i.test(range.color))) throw new Error(`${label}.color must be a six-digit hex color.`);
      if (range.width !== undefined && (typeof range.width !== "string" || !/^\d+(?:\.\d+)?%$/.test(range.width) || parseFloat(range.width) <= 0 || parseFloat(range.width) > 100)) throw new Error(`${label}.width must be a positive percentage up to 100%.`);
      return { id: rangeId, name: text(range.name, `${label}.name`), from, to, description: text(range.description, `${label}.description`), ...(range.color ? { color: range.color as string } : {}), ...(range.width ? { width: range.width as string } : {}) };
    });
    return { id, name: text(entry.name, `${field}.name`), ...(icon ? { icon } : {}), display: entry.display, ranges };
  });
  if (!ids.has("default")) throw new Error("Frequency range presets must include Default (id: default).");
  return presets;
}

export const frequencyRangePresets = parseFrequencyRangePresets(rangeData);
export const defaultFrequencyRangePreset = frequencyRangePresets.find((preset) => preset.id === "default")!;

export function frequencyRangeGeometry(range: FrequencyRange, scale: FrequencyScale) {
  const left = Math.max(graphDimensions.left, scale(range.from));
  const right = Math.min(graphDimensions.right, scale(range.to));
  return right > left ? { left, right, width: right - left, center: (left + right) / 2 } : null;
}
