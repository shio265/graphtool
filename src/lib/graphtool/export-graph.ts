import { downloadBlob } from "./filter-files";
import { screenshotFilename } from "./screenshot-filename";
import type { ActiveModel } from "./types";

const exportedProperties = ["fill", "stroke", "stroke-width", "stroke-dasharray", "opacity", "font-family", "font-size", "font-weight", "text-anchor", "dominant-baseline", "filter", "background-color", "color"];

export async function exportGraph(graph: SVGSVGElement, format: "png" | "svg", models: readonly ActiveModel[] = []): Promise<void> {
  const filename = screenshotFilename(models, format);
  const clone = graph.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", "800"); clone.setAttribute("height", "346");
  const sources = [graph, ...Array.from(graph.querySelectorAll("*"))];
  const destinations = [clone, ...Array.from(clone.querySelectorAll("*"))];
  sources.forEach((element, index) => {
    const style = getComputedStyle(element);
    const target = destinations[index] as SVGElement;
    exportedProperties.forEach((property) => target.style.setProperty(property, style.getPropertyValue(property)));
  });
  clone.querySelectorAll(".dBScaler,.inspector,.graph-interaction").forEach((node) => node.remove());
  // Exports represent the selected curves, not a partially drawn animation frame.
  clone.querySelectorAll(".graph-curves path[data-curve-reveal]").forEach((path) => {
    if (path.getAttribute("data-curve-exiting") === "true") path.remove();
    else { path.removeAttribute("clip-path"); path.removeAttribute("data-curve-reveal"); }
  });
  clone.querySelectorAll("defs[data-curve-reveal]").forEach((node) => node.remove());
  const background = getComputedStyle(graph).getPropertyValue("--background-color-graph").trim() || "white";
  clone.style.backgroundColor = background;
  const backdrop = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  backdrop.setAttribute("width", "800"); backdrop.setAttribute("height", "346"); backdrop.setAttribute("fill", background);
  clone.prepend(backdrop);
  const svg = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" });
  if (format === "svg") { downloadBlob(svg, filename); return; }
  const url = URL.createObjectURL(svg);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 2400; canvas.height = 1038;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image export is unavailable in this browser.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not export the graph.")), "image/png"));
    downloadBlob(png, filename);
  } finally { URL.revokeObjectURL(url); }
}
