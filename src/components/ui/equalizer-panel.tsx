"use client";

import { useRef, useState } from "react";
import Checkbox from "@mui/material/Checkbox";
import { emptyFilter } from "@/src/lib/graphtool/config";
import { enabledFilters } from "@/src/lib/graphtool/equalizer";
import { eqFilterRanges } from "@/src/lib/graphtool/device-eq";
import { downloadBlob, exportFilters, exportWavelet, parseFilters } from "@/src/lib/graphtool/filter-files";
import { useAudioPreview } from "@/src/lib/graphtool/use-audio-preview";
import type { Filter, FilterType, Range } from "@/src/lib/graphtool/types";
import type { GraphToolController } from "@/src/lib/graphtool/use-graph-tool";
import { NumberInput } from "./number-input";
import { AudioPreview } from "./audio-preview";
import { ConvolutionEQ } from "./convolution-eq";
import { ToneGeneratorPanel } from "./tone-generator";
import { Button } from "./button";
import { PanelHeading } from "./panel-heading";
import { SelectInput } from "./select-input";
import { EqualizerGuide } from "./equalizer-guide";
import { FilterCheckboxIcon } from "./filter-checkbox-icon";
import { GraphIcon } from "./graph-icon";
import { DeviceEQPanel } from "./device-eq-panel";

export function EqualizerPanel({ tool }: { tool: GraphToolController }) {
  const importInput = useRef<HTMLInputElement>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const audio = useAudioPreview(tool.filters, tool.reportError);
  const deviceLimits = tool.deviceEQ.device?.limits;
  const filterRanges = eqFilterRanges(deviceLimits);
  const locked = tool.deviceEQ.busy !== null;
  const modelName = tool.eqModels.find((model) => model.key === tool.eqModelKey)?.fullName.replace(/^Uploaded /, "") ?? "Unnamed";
  const changeFilter = (index: number, patch: Partial<Filter>) => tool.applyFilters(tool.filters.map((filter, i) => i === index ? { ...filter, ...patch } : filter));
  const importFile = async (file: File) => {
    try { const filters = parseFilters(await file.text()); while (filters.length < tool.filters.length) filters.push(emptyFilter()); tool.applyFilters(filters); }
    catch (error) { tool.reportError(error); }
  };
  const exportFile = (wavelet: boolean) => {
    try {
      if (!enabledFilters(tool.filters).length) throw new Error("Please add at least one filter before export.");
      if (!wavelet && !tool.eqModelKey) throw new Error("Please select model and add at least one filter before export.");
      downloadBlob(new Blob([wavelet ? exportWavelet(tool.filters) : exportFilters(tool.filters)], { type: "text/plain;charset=utf-8" }), `${modelName} ${wavelet ? "Graphic Filters" : "Filters"}.txt`);
    } catch (error) { tool.reportError(error); }
  };
  const ranges: { label: string; key: "freqRange" | "gainRange" | "qRange"; min: number; max: number; step: number; names: string[] }[] = [
    { label: "Frequency Range", key: "freqRange", min: filterRanges.freqRange[0], max: filterRanges.freqRange[1], step: 1, names: ["autoeq-from", "autoeq-to"] },
    { label: "Gain Range", key: "gainRange", min: filterRanges.gainRange[0], max: filterRanges.gainRange[1], step: 0.1, names: ["autoeq-gain-from", "autoeq-gain-to"] },
    { label: "Q Range", key: "qRange", min: filterRanges.qRange[0], max: filterRanges.qRange[1], step: 0.1, names: ["autoeq-q-from", "autoeq-q-to"] },
  ];
  const filterCell = "relative flex h-[25px] min-w-0 items-center text-[11px] leading-none";
  const unit = "after:pointer-events-none after:absolute after:top-1/2 after:right-2 after:-translate-y-1/2 after:text-[11px] after:leading-none after:text-[var(--background-color-contrast-more)] hover:after:opacity-0 focus-within:after:opacity-0";
  return <>
    <DeviceEQPanel tool={tool} />
    <div className="extra-eq mb-[1em] text-(--background-color-contrast-more)"><PanelHeading>Parametric Equalizer</PanelHeading>
      <div className="select-eq-phone mb-[0.4em]"><SelectInput name="phone" aria-label="Choose EQ model" value={tool.eqModelKey} onValueChange={tool.selectEQModel} disabled={locked}
        options={[{ value: "", label: "Choose EQ model" }, ...tool.eqModels.map((model) => ({ value: model.key, label: model.fullName }))]} /></div>
      <div className="filters-header grid grid-cols-4 items-center gap-x-1 text-[11px] leading-none"><span className="flex min-w-0 items-center">Type</span><span className="flex min-w-0 items-center">Frequency</span><span className="flex min-w-0 items-center">Gain</span><span className="flex min-w-0 items-center">Q</span></div>
      <div className="filters mb-[0.4em] grid gap-y-1">{tool.filters.map((filter, index) => <div className="filter grid grid-cols-4 items-center gap-x-1" key={index}>
        <span className={filterCell}><Checkbox disableRipple checked={!filter.disabled} disabled={locked} onChange={(event) => changeFilter(index, { disabled: !event.target.checked })}
          icon={<FilterCheckboxIcon checked={false} />} checkedIcon={<FilterCheckboxIcon checked />}
          slotProps={{ input: { name: "enabled", "aria-label": `Enable filter ${index + 1}` } }}
          sx={{ width: "16px", height: "16px", p: 0, mr: "6px", flex: "0 0 16px", color: "var(--background-color-contrast-more)", transition: "none", "&.Mui-checked": { color: "var(--accent-color)" } }} />
          <SelectInput variant="filter" name="type" aria-label={`Filter ${index + 1} type`} value={filter.type} onValueChange={(value) => changeFilter(index, { type: value as FilterType })} disabled={locked}
            options={(["PK", "LSQ", "HSQ"] as const).map((type) => ({ value: type, label: type, disabled: deviceLimits ? !deviceLimits.filterTypes.includes(type) : false }))} /></span>
        <span className={`${filterCell} ${unit} after:content-['Hz']`}><NumberInput variant="filter" name="freq" aria-label={`Filter ${index + 1} frequency`} disabled={locked} min={deviceLimits ? filterRanges.freqRange[0] : 0} max={filterRanges.freqRange[1]} step={1} decimalPlaces={0} value={filter.freq} onValueChange={(freq) => changeFilter(index, { freq })} /></span>
        <span className={`${filterCell} ${unit} after:content-['dB']`}><NumberInput variant="filter" name="gain" aria-label={`Filter ${index + 1} gain`} disabled={locked} min={filterRanges.gainRange[0]} max={filterRanges.gainRange[1]} step={0.1} decimalPlaces={1} value={filter.gain} onValueChange={(gain) => changeFilter(index, { gain })} /></span>
        <span className={filterCell}><NumberInput variant="filter" name="q" aria-label={`Filter ${index + 1} Q`} disabled={locked} min={deviceLimits ? filterRanges.qRange[0] : 0} max={filterRanges.qRange[1]} step={0.1} decimalPlaces={1} value={filter.q} onValueChange={(q) => changeFilter(index, { q })} /></span>
      </div>)}</div>
      {ranges.map((range) => <div className="settings-row mb-[0.4em] flex items-center gap-1" key={range.key}><span className="flex-[auto_1_1] text-[12px] leading-none">{range.label}</span>{[0, 1].map((index) => <span className="flex-[calc(25%-4px)_0_0]" key={index}><NumberInput name={range.names[index]} aria-label={`${range.label} ${index ? "maximum" : "minimum"}`} disabled={locked} min={range.min} max={range.max} step={range.step} value={tool.autoEQOptions[range.key][index]} onValueChange={(value) => { const next = [...tool.autoEQOptions[range.key]] as Range; next[index] = value; tool.setAutoEQOptions({ ...tool.autoEQOptions, [range.key]: next }); }} /></span>)}</div>)}
      <div className="settings-row mb-[0.4em] flex items-center gap-1"><span className="flex-[auto_1_1] text-[12px] leading-none">Pre-amp</span><span className="flex-[calc(25%-4px)_0_0]" id="preamp-value">{tool.preamp.toFixed(1)} dB</span></div>
      <div className="filters-button flex flex-wrap gap-x-1 gap-y-0">
        <Button panel compact className="add-filter" aria-label="Add EQ filter" disabled={locked || tool.filters.length >= tool.filterLimit} onClick={() => tool.applyFilters([...tool.filters, emptyFilter()])}><GraphIcon name="plus" size={12} /></Button>
        <Button panel compact className="remove-filter" aria-label="Remove last EQ filter" disabled={locked || tool.filters.length <= 1} onClick={() => tool.applyFilters(tool.filters.slice(0, -1))}><GraphIcon name="minus" size={12} /></Button>
        <Button panel compact layout="half" className="sort-filters" disabled={locked} onClick={() => tool.applyFilters([...tool.filters].sort((a, b) => (a.freq || Infinity) - (b.freq || Infinity)))}>Sort</Button>
        <Button panel compact className="autoeq" onClick={tool.runAutoEQ} disabled={locked || tool.autoEQRunning}>AutoEQ</Button>
        <Button panel compact layout="half" className="import-filters" disabled={locked} onClick={() => importInput.current?.click()}>Import</Button>
        <Button panel compact layout="half" className="export-filters" onClick={() => exportFile(false)}>Export</Button>
        <Button panel compact layout="full" className="export-graphic-filters" onClick={() => exportFile(true)}>Export Wavelet</Button>
        <Button panel compact layout="full" className="readme" onClick={() => setGuideOpen(true)}>Guide</Button>
      </div>
      <EqualizerGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
      <input ref={importInput} hidden type="file" id="file-filters-import" accept=".txt" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void importFile(file); event.currentTarget.value = ""; }} />
      <ConvolutionEQ filters={tool.filters} modelName={modelName} reportError={tool.reportError} />
    </div>
    <AudioPreview audio={audio} eqEnabled={enabledFilters(tool.filters).length > 0} onEnableFilters={(enabled) => tool.applyFilters(tool.filters.map((filter) => ({ ...filter, disabled: !enabled })))} />
    <ToneGeneratorPanel hidden={!!audio.filename} reportError={tool.reportError} />
  </>;
}
