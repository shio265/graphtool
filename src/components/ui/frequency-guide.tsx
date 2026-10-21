"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import ButtonBase from "@mui/material/ButtonBase";
import { frequencyRangePresets, type FrequencyRange, type FrequencyRangePreset } from "@/src/lib/graphtool/frequency-ranges";
import { useHeightMotion } from "@/src/lib/graphtool/animation";
import { SelectInput } from "./select-input";
import { GraphIcon } from "./graph-icon";

function RangePresetIcon({ src }: { src?: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (src && src !== failedSource) return <Image src={src} alt="" width={16} height={16} unoptimized className="block size-4 shrink-0 rounded-[3px] object-contain" onError={() => setFailedSource(src)} />;
  return <GraphIcon name="game" size={16} />;
}

export function FrequencyGuide({ preset, selected, onSelect, onHover, onRangeTypeChange }: { preset: FrequencyRangePreset; selected: number | null; onSelect: (index: number | null) => void; onHover: (index: number | null) => void; onRangeTypeChange: (id: string) => void }) {
  const [displayed, setDisplayed] = useState<FrequencyRange>(preset.ranges[selected ?? 0] ?? preset.ranges[0]);
  const selectedRange = selected === null ? undefined : preset.ranges[selected];
  if (selectedRange && selectedRange !== displayed) setDisplayed(selectedRange);
  const description = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLElement>(null);
  useHeightMotion(description, content, !!selectedRange, selected);
  return <>
    <div className="tutorial-buttons relative box-border flex h-11.25 w-full shrink-0 items-stretch bg-(--background-color-graph) pl-4" data-range-type={preset.id}>
      <div className="tutorial-range-buttons flex min-w-0 flex-1 items-start overflow-x-auto pt-1.5">{preset.ranges.map((definition, index) => <ButtonBase disableRipple key={`${preset.id}:${definition.id}`} className="button-segment relative m-0 flex-[auto_1_0] cursor-pointer border-0 bg-transparent px-4 py-2.5 font-sans text-[12px] leading-none font-normal whitespace-nowrap text-(--font-color-primary) outline-none last:mr-3.75 data-[tutorial-on=true]:before:absolute data-[tutorial-on=true]:before:inset-0 data-[tutorial-on=true]:before:rounded-full data-[tutorial-on=true]:before:bg-(--accent-color) data-[tutorial-on=true]:before:opacity-10 data-[tutorial-on=true]:before:content-['']" data-tutorial-on={selected === index} aria-pressed={selected === index}
        onClick={() => onSelect(selected === index ? null : index)} onMouseEnter={() => onHover(index)} onMouseLeave={() => onHover(null)}>{definition.name}</ButtonBase>)}</div>
      <div className="range-type-selector w-36 shrink-0"><SelectInput variant="range" aria-label="Range type" value={preset.id} onValueChange={onRangeTypeChange}
        options={frequencyRangePresets.map((entry) => ({ value: entry.id, label: entry.name, icon: entry.icon || entry.id !== "default" ? <RangePresetIcon src={entry.icon} /> : undefined }))} /></div>
    </div>
    <div ref={description} className="tutorial-description block h-0 shrink-0 overflow-hidden border-b border-(--background-color-contrast-more) bg-(--background-color-graph)"><article ref={content} className="description-segment flex w-full items-center justify-center" aria-live="polite"><p className="mx-4 mt-0 mb-4 max-w-200 flex-[auto_1_1] p-4 text-center text-[14px] leading-[1.6] text-(--font-color-primary)">{displayed.description}</p></article></div>
  </>;
}
