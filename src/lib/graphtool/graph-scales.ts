import { scaleLinear, scaleLog } from "@visx/scale";
import { graphDimensions } from "./graph";

export function createFrequencyScale(from: number, to: number) {
  return scaleLog<number>({ domain: [from, to], range: [graphDimensions.left, graphDimensions.right], nice: false, clamp: false });
}

export function createDecibelScale(low: number, high: number) {
  // Never extend the domain to zero: normalization and baseline motion set it exactly.
  return scaleLinear<number>({ domain: [low, high], range: [graphDimensions.bottom, graphDimensions.top + 10], zero: false, nice: false, clamp: false });
}

export function decibelTicks(low: number, high: number): number[] {
  const step = high - low < 40 ? 1 : 5;
  return Array.from({ length: Math.max(0, Math.floor(high / step) - Math.ceil(low / step) + 1) }, (_, index) => (Math.ceil(low / step) + index) * step);
}

export type FrequencyScale = ReturnType<typeof createFrequencyScale>;
export type DecibelScale = ReturnType<typeof createDecibelScale>;
