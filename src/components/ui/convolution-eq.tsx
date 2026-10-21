"use client";

import { useState } from "react";
import { downloadBlob } from "@/src/lib/graphtool/filter-files";
import { enabledFilters } from "@/src/lib/graphtool/equalizer";
import type { ConvolutionOptions, Filter } from "@/src/lib/graphtool/types";
import { NumberInput } from "./number-input";
import { RangeInput } from "./range-input";
import { Button } from "./button";
import { PanelHeading } from "./panel-heading";
import { SelectInput } from "./select-input";

export function ConvolutionEQ({ filters, modelName, reportError }: { filters: Filter[]; modelName: string; reportError: (error: unknown) => void }) {
  const [options, setOptions] = useState<ConvolutionOptions>({ sampleRate: 48000, bitDepth: "16", phase: "minimum", freqResolution: 16, preamp: 0, stereo: true });
  const exportConvolution = async () => {
    try {
      if (!enabledFilters(filters).length) throw new Error("Please add at least one filter before export.");
      const { convolutionWav } = await import("@/src/lib/graphtool/convolution");
      const depth = options.bitDepth === "float32" ? "32float" : `${options.bitDepth}bit`;
      downloadBlob(new Blob([convolutionWav(filters, options)], { type: "audio/wav" }), `${modelName} Convolution ${options.phase} ${options.sampleRate}Hz ${depth}.wav`);
    } catch (error) { reportError(error); }
  };
  const labelStyle = "grid gap-1 text-[11px] text-[var(--background-color-contrast-more)]";
  return <div className="convolution-eq mt-2.5 grid gap-2"><PanelHeading className="convolution-eq-info">Convolution EQ</PanelHeading>
    <div className="convolution-eq-selects grid grid-cols-3 gap-1.5">
      <label className={labelStyle}><span>Sample rate</span><SelectInput variant="convolution" name="conv-sample-rate" aria-label="Sample rate" value={options.sampleRate} onValueChange={(value) => setOptions({ ...options, sampleRate: Number(value) })}
        options={[44100,48000,96000,192000,384000].map((rate) => ({ value: rate, label: String(rate) }))} /></label>
      <label className={labelStyle}><span>Bit depth</span><SelectInput variant="convolution" name="conv-bit-depth" aria-label="Bit depth" value={options.bitDepth} onValueChange={(value) => setOptions({ ...options, bitDepth: value as ConvolutionOptions["bitDepth"] })}
        options={[{ value: "16", label: "16 bit" }, { value: "24", label: "24 bit" }, { value: "32", label: "32 bit" }, { value: "float32", label: "32 bit float" }]} /></label>
      <label className={labelStyle}><span>Phase</span><SelectInput variant="convolution" name="conv-phase" aria-label="Phase" value={options.phase} onValueChange={(value) => setOptions({ ...options, phase: value as ConvolutionOptions["phase"] })}
        options={[{ value: "minimum", label: "minimum" }, { value: "linear", label: "linear" }]} /></label>
    </div>
    <label className={`convolution-eq-slider grid-cols-[minmax(0,1fr)_64px] items-center ${labelStyle}`}><span className="col-span-full">Frequency resolution (Hz)</span><RangeInput aria-label="Convolution frequency resolution" name="conv-freq-resolution" min={1} max={96} step={1} value={options.freqResolution} onValueChange={(freqResolution) => setOptions({ ...options, freqResolution })} /><NumberInput variant="convolution" aria-label="Convolution frequency resolution value" name="conv-freq-resolution-value" min={1} max={96} value={options.freqResolution} onValueChange={(freqResolution) => setOptions({ ...options, freqResolution })} /></label>
    <label className={`convolution-eq-slider grid-cols-[minmax(0,1fr)_64px] items-center ${labelStyle}`}><span className="col-span-full">Preamp</span><RangeInput aria-label="Convolution preamp" name="conv-preamp" min={-30} max={12} step={0.1} value={options.preamp} onValueChange={(preamp) => setOptions({ ...options, preamp })} /><NumberInput variant="convolution" aria-label="Convolution preamp value" name="conv-preamp-value" min={-30} max={12} step={0.1} value={options.preamp} onValueChange={(preamp) => setOptions({ ...options, preamp })} /></label>
    <div className="convolution-eq-actions flex flex-col items-stretch gap-2"><label className="convolution-eq-mode flex flex-[auto_1_1] items-center gap-1.5 text-[12px] text-(--background-color-contrast-more)"><span>Channel mode</span><SelectInput variant="channel" name="conv-stereo" aria-label="Channel mode" value={String(options.stereo)} onValueChange={(value) => setOptions({ ...options, stereo: value === "true" })}
      options={[{ value: "true", label: "Stereo" }, { value: "false", label: "Mono" }]} /></label><Button compact className="export-convolution w-full flex-none" onClick={() => { void exportConvolution(); }}>Export Convolution</Button></div>
  </div>;
}
