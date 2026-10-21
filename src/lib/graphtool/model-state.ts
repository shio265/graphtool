import type { ActiveModel, Channels, Model } from "./types";
import { sameModel } from "./model-identity";

export function createActiveModel(model: Model, rawChannels: Channels, colorId: number): ActiveModel {
  const name = model.variants?.find((variant) => variant.fileName === model.fileName)?.name ?? model.name;
  const fullName = model.isTarget ? model.fullName : `${model.brand}${model.collab ? ` x ${model.collab}` : ""} ${name}`;
  return { ...model, name, fullName, rawChannels, colorId, mode: "both", offset: 0, hidden: false, pinned: false };
}

// Pure state transitions are safe when React replays updater functions in
// Strict Mode. In particular, color allocation must happen outside updaters.
export function activateModel(previous: ActiveModel[], next: ActiveModel, exclusive: boolean): ActiveModel[] {
  const existing = previous.find((model) => sameModel(model, next));
  let remaining = exclusive ? previous.filter((model) => model.pinned || !!model.isTarget !== !!next.isTarget || model === existing) : previous;
  if (existing && remaining.includes(existing)) return remaining.map((model) => model === existing ? { ...model, hidden: false } : model);
  const average = !next.isTarget && remaining.some((model) => !model.isTarget);
  if (average) remaining = remaining.map((model) => !model.isTarget ? { ...model, mode: "average" } : model);
  const added: ActiveModel = { ...next, mode: average ? "average" : "both" };
  return next.isTarget ? [added, ...remaining] : [...remaining, added];
}

export function removeModel(previous: ActiveModel[], key: string): ActiveModel[] {
  const remaining = previous.filter((model) => model.key !== key);
  const phones = remaining.filter((model) => !model.isTarget);
  return phones.length === 1 ? remaining.map((model) => model === phones[0] ? { ...model, mode: "both" } : model) : remaining;
}
