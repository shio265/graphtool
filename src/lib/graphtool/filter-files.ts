import { frequencies } from "./config";
import { calculatePreamp, graphicEQ } from "./equalizer";
import type { Filter, FilterType } from "./types";

export function parseFilters(text: string): Filter[] {
  const filters = text.split(/\r?\n/).flatMap((line): Filter[] => {
    const match = line.match(/Filter\s*\d*:\s*(\S+)\s+(\S+)\s+Fc\s*([\d.e+-]+)\s*Hz\s*Gain\s*([\d.e+-]+)\s*dB(?:\s*Q\s*([\d.e+-]+))?/i);
    if (!match) return [];
    const type = match[2].toUpperCase().replace(/^(LS|HS)C?$/, "$1Q") as FilterType;
    if (!["PK", "LSQ", "HSQ"].includes(type)) return [];
    const filter: Filter = { type, disabled: match[1].toUpperCase() !== "ON", freq: Number(match[3]), gain: Number(match[4]), q: Number(match[5]) || (type === "PK" ? 0 : 0.707) };
    return [filter.freq, filter.gain, filter.q].every(Number.isFinite) ? [filter] : [];
  });
  while (filters.length && !filters[filters.length - 1].freq && !filters[filters.length - 1].gain && !filters[filters.length - 1].q) filters.pop();
  if (!filters.length) throw new Error("Parse filters file failed: no filter found.");
  return filters;
}

export function exportFilters(filters: Filter[]): string {
  const preamp = calculatePreamp(filters, frequencies);
  return `Preamp: ${preamp.toFixed(1)} dB\r\n` + filters.filter((filter) => filter.freq).map((filter, index) => {
    const on = !filter.disabled && filter.freq && filter.q && filter.gain ? "ON" : "OFF";
    const type = filter.type.replace(/^(LS|HS)Q$/, "$1C");
    return `Filter ${index + 1}: ${on} ${type} Fc ${filter.freq.toFixed(0)} Hz Gain ${filter.gain.toFixed(1)} dB Q ${filter.q.toFixed(3)}\r\n`;
  }).join("");
}

export function exportWavelet(filters: Filter[]): string {
  return "GraphicEQ: " + graphicEQ(filters).map(([frequency, gain]) => `${frequency.toFixed(0)} ${gain.toFixed(1)}`).join("; ");
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.replace(/[<>:"/\\|?*]/g, "_");
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
