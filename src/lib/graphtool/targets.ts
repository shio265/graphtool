import groups from "@/public/data/targets/index.json";
import type { Model } from "./types";

export const targetGroups = groups;

export const targetModels: Model[] = [...new Set(targetGroups.flatMap((group) => group.targets))].map((name) => ({
  key: `target:${name}`,
  brand: "Targets",
  name,
  fullName: `${name} Target`,
  fileName: `${name} Target`,
  isTarget: true,
}));
