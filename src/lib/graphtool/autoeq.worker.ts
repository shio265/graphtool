import { autoEQ } from "./equalizer";
import type { AutoEQOptions, ResponseCurve } from "./types";

export interface AutoEQRequest {
  curve: ResponseCurve;
  target: ResponseCurve;
  bands: number;
  options: AutoEQOptions;
}

globalThis.onmessage = (event: MessageEvent<AutoEQRequest>) => {
  try {
    const { curve, target, bands, options } = event.data;
    globalThis.postMessage({ filters: autoEQ(curve, target, bands, options) });
  } catch (error) {
    globalThis.postMessage({ error: error instanceof Error ? error.message : "AutoEQ failed." });
  }
};
