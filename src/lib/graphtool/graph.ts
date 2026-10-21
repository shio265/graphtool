import { curveColor } from "./colors";
import { averageCurves, hasChannelImbalance, normalizationOffset, validChannels } from "./normalization";
import { smoothResponse } from "./smoothing";
import type { ActiveModel, GraphCurve, Normalization, PreparedModel, ResponseCurve } from "./types";

export const graphDimensions = { width: 800, height: 346, left: 15, right: 785, top: 10, bottom: 324 };
export const zoomRanges: [number, number][] = [[20, 400], [100, 4000], [1000, 20000], [20, 20000]];
export const xTicks = [20,30,40,50,60,80,100,150,200,300,400,500,600,800,1000,1500,2000,3000,4000,5000,6000,8000,10000,15000,20000];

export function prepareModels(active: ActiveModel[], smoothing: number, normalization: Normalization): PreparedModel[] {
  const prepared = active.map((model) => {
    const channels = model.rawChannels.map((curve) => curve && smoothResponse(curve, smoothing));
    return { ...model, channels, average: averageCurves(validChannels(channels)), normalization: normalizationOffset(channels, normalization), imbalanced: hasChannelImbalance(channels) };
  });
  prepared.forEach((model) => {
    const parent = model.eqParent && prepared.find((entry) => entry.key === model.eqParent);
    if (parent) model.normalization = parent.normalization;
  });
  return prepared;
}

export function buildGraphCurves(models: PreparedModel[], baselineKey: string | null): GraphCurve[] {
  const baseline = models.find((model) => model.key === baselineKey);
  const baselineValues = baseline?.average.map(([, value]) => value + baseline.normalization + baseline.offset);
  return models.filter((model) => !model.hidden).flatMap((model) => {
    const channels = validChannels(model.channels);
    const selected: { name: string; curve: ResponseCurve; channel: number }[] = model.isTarget
      ? [{ name: model.fullName, curve: channels[0], channel: 0 }]
      : model.mode === "average" && channels.length > 1
        ? [{ name: `${model.fullName} (AVG)`, curve: model.average, channel: 0 }]
        : model.channels.flatMap((curve, index) => curve && (model.mode === "both" || model.mode === "average" || (model.mode === "left" ? index === 0 : index === 1))
          ? [{ name: `${model.fullName} (${index ? "R" : "L"})`, curve, channel: index ? 1 : -1 }] : []);
    return selected.filter((entry) => entry.curve).map((entry) => ({
      id: `${model.key}:${entry.channel}`,
      modelKey: model.key,
      name: entry.name,
      isTarget: !!model.isTarget,
      color: curveColor(model.colorId, entry.channel),
      points: entry.curve.map(([frequency, value], index): [number, number] => [frequency, value + model.normalization + model.offset - (baselineValues?.[index] ?? 0)]),
    }));
  });
}

export function nearestFrequencyIndex(values: readonly number[], frequency: number): number {
  let low = 0, high = values.length - 1;
  while (low < high) { const middle = (low + high) >> 1; if (values[middle] < frequency) low = middle + 1; else high = middle; }
  return low > 0 && Math.abs(values[low - 1] - frequency) < Math.abs(values[low] - frequency) ? low - 1 : low;
}
