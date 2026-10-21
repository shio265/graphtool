import type { ActiveModel } from "./types";

export function screenshotFilename(models: readonly Pick<ActiveModel, "fullName" | "isTarget" | "hidden">[], format: "png" | "svg"): string {
  const visible = models.filter((model) => !model.hidden);
  const ordered = [...visible.filter((model) => !model.isTarget), ...visible.filter((model) => model.isTarget)];
  const names = [...new Set(ordered.map((model) => model.fullName.trim()).filter(Boolean))];
  return `${names.join(", ") || "graph"}.${format}`;
}
