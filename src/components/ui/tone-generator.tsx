"use client";

import { useToneGenerator } from "@/src/lib/graphtool/use-audio-preview";
import { NumberInput } from "./number-input";
import { Button } from "./button";
import { PanelHeading } from "./panel-heading";

export function ToneGeneratorPanel({ hidden, reportError }: { hidden: boolean; reportError: (error: unknown) => void }) {
  const tone = useToneGenerator(reportError, hidden);
  return <div className="extra-tone-generator mb-[1em] text-(--background-color-contrast-more)" style={{ display: hidden ? "none" : "block" }}>
    <PanelHeading>Tone Generator</PanelHeading>
    <div className="settings-row mb-[0.4em] grid grid-cols-[minmax(0,1fr)_84px_84px] items-center gap-1"><span className="text-[12px] leading-none">Freq Range</span>
      <span><NumberInput name="tone-generator-from" aria-label="Tone minimum frequency" min={20} max={20000} value={tone.from} onValueChange={(value) => tone.changeRange(value, tone.to)} /></span>
      <span><NumberInput name="tone-generator-to" aria-label="Tone maximum frequency" min={20} max={20000} value={tone.to} onValueChange={(value) => tone.changeRange(tone.from, value)} /></span>
    </div>
    <div className="settings-row mb-[0.4em] grid grid-cols-[minmax(0,1fr)_84px_84px] items-center gap-1"><span className="text-[12px] leading-none">Frequency (Hz)</span><span className="col-start-3"><NumberInput className="cursor-pointer" name="tone-generator-freq" aria-label="Tone frequency" min={tone.from} max={tone.to} value={tone.frequency} onValueChange={tone.changeFrequency} onKeyDown={(event) => { if (["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"].includes(event.key)) { event.preventDefault(); tone.stepFrequency(event.key === "ArrowUp" || event.key === "ArrowRight" ? 1 : -1); } }} /></span></div>
    <div className="mt-2 flex items-center"><Button panel compact className="play" onClick={() => { void tone.toggle(); }}>{tone.playing ? "Stop" : "Play"}</Button></div>
  </div>;
}
