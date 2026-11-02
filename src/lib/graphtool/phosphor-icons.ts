import type { Icon, IconWeight } from "@phosphor-icons/react";
import type { IconInput } from "morphicons";
import { svgToIcon } from "morphicons/adapters";
import { preloadRegion } from "morphicons/dom";

const icons = new WeakMap<Icon, Map<IconWeight, IconInput>>();
const pending = new WeakMap<Icon, Map<IconWeight, Promise<void>>>();
const listeners = new Set<() => void>();

export function getPhosphorIconData(icon: Icon, weight: IconWeight): IconInput | undefined {
  return icons.get(icon)?.get(weight);
}

export function subscribePhosphorIcons(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function cachePhosphorIcon(icon: Icon, weight: IconWeight, markup: string): Promise<void> {
  if (getPhosphorIconData(icon, weight)) return Promise.resolve();
  const requests = pending.get(icon) ?? new Map<IconWeight, Promise<void>>();
  const previous = requests.get(weight);
  if (previous) return previous;
  const data = svgToIcon(markup);
  const ready = preloadRegion().catch(() => undefined).then(() => {
    const weights = icons.get(icon) ?? new Map<IconWeight, IconInput>();
    weights.set(weight, data);
    icons.set(icon, weights);
    requests.delete(weight);
    listeners.forEach((listener) => listener());
  });
  requests.set(weight, ready);
  pending.set(icon, requests);
  return ready;
}
