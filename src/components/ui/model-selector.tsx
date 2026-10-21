"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import ButtonBase from "@mui/material/ButtonBase";
import InputBase from "@mui/material/InputBase";
import { searchBrands, searchModels } from "@/src/lib/graphtool/data";
import { contrastTextColor, curveColor } from "@/src/lib/graphtool/colors";
import { sameModel } from "@/src/lib/graphtool/model-identity";
import { useListMotion, useModelListReveal, useSelectorPanelMotion } from "@/src/lib/graphtool/animation";
import type { GraphToolController } from "@/src/lib/graphtool/use-graph-tool";
import { ModelToggleIcon } from "./model-toggle-icon";
import { UploadMenu } from "./upload-menu";

type CatalogTab = "brands" | "models";
type SelectorTab = CatalogTab | "extra";

export function ModelSelector({ tool, children, onHighlight, onPanelFocus }: { tool: GraphToolController; children: ReactNode; onHighlight: (key: string | null) => void; onPanelFocus: (panel: "primary" | "secondary") => void }) {
  const [selected, setSelected] = useState<SelectorTab>("models");
  const [listSelected, setListSelected] = useState<CatalogTab>("models");
  const [query, setQuery] = useState("");
  const [brands, setBrands] = useState<string[]>([]);
  const [modelRevealKey, setModelRevealKey] = useState(0);
  const modelList = useRef<HTMLDivElement>(null);
  const modelItems = useRef<HTMLDivElement>(null);
  const panelTrack = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const allBrands = useMemo(() => [...new Set([...tool.models.map((model) => model.brand), "Uploaded"])], [tool.models]);
  const filteredBrands = searchBrands(allBrands, query);
  const filteredModels = useMemo(() => searchModels(tool.models, query, brands), [tool.models, query, brands]);
  const comparingModels = tool.eqModels.length > 1;
  useListMotion(modelList, listSelected);
  useModelListReveal(modelItems, modelRevealKey);
  useSelectorPanelMotion(panelTrack, selected === "extra");

  const selectTab = (tab: SelectorTab) => {
    setSelected(tab);
    // Keep the Brands/Models position unchanged while revealing Equalizer.
    if (tab !== "extra") setListSelected(tab);
  };

  const chooseBrand = (brand: string, exclusive: boolean) => {
    setBrands((previous) => exclusive ? previous.includes(brand) ? [] : [brand] : [...new Set([...previous, brand])]);
    setModelRevealKey((previous) => previous + 1);
    selectTab("models");
  };
  const tab = "box-border m-0 flex-[100%_1_1] cursor-pointer rounded-none border border-solid border-[var(--background-color-contrast-more)] bg-[var(--background-color)] px-0 py-[11px] font-sans text-[12px] leading-none font-normal text-[var(--accent-color-contrast)] outline-none first:rounded-l-[6px] first:border-r-0 last:rounded-r-[6px] last:border-l-0 aria-pressed:border-[var(--accent-color)] aria-pressed:bg-[var(--accent-color)] aria-pressed:text-[var(--font-color-secondary)]";
  const listPanel = "absolute top-0 z-[1] box-border h-full w-[calc(100%-60px)] overflow-hidden bg-[var(--background-color)] before:absolute before:top-0 before:z-[1] before:box-border before:block before:h-full before:w-full before:bg-[var(--background-color)] before:content-[''] [@media(min-width:1500px)_and_(min-aspect-ratio:2/1)]:relative [@media(min-width:1500px)_and_(min-aspect-ratio:2/1)]:flex [@media(min-width:1500px)_and_(min-aspect-ratio:2/1)]:flex-[50%_1_1] [@media(min-width:1500px)_and_(min-aspect-ratio:2/1)]:before:hidden";
  const scroll = "box-border h-full w-full overflow-x-hidden overflow-y-auto py-4 [@media(min-width:1500px)_and_(min-aspect-ratio:2/1)]:relative [@media(min-width:1500px)_and_(min-aspect-ratio:2/1)]:flex-[50%_1_1]";
  return <div className="controls h-full w-full overflow-hidden border-r border-(--background-color-contrast-more) bg-(--background-color) [@media(max-width:1000px)]:rounded-t-2xl [@media(max-width:1000px)]:before:pointer-events-none [@media(max-width:1000px)]:before:absolute [@media(max-width:1000px)]:before:top-1.5 [@media(max-width:1000px)]:before:right-0 [@media(max-width:1000px)]:before:left-0 [@media(max-width:1000px)]:before:m-auto [@media(max-width:1000px)]:before:h-1 [@media(max-width:1000px)]:before:w-15 [@media(max-width:1000px)]:before:rounded-md [@media(max-width:1000px)]:before:bg-(--background-color-contrast-more) [@media(max-width:1000px)]:before:content-['']"><div className="select flex h-full w-full flex-col overflow-hidden border-r border-(--background-color-contrast-more) bg-(--background-color)" data-selected={selected}>
    <div className="selector-tabs relative flex flex-[auto_0_0] border-b border-(--background-color-contrast) p-4"
      onTouchStart={(event) => { touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }}
      onTouchEnd={(event) => { if (!touch.current) return; const delta = event.changedTouches[0].clientY - touch.current.y; if (Math.abs(delta) > 50) onPanelFocus(delta > 0 ? "primary" : "secondary"); touch.current = null; }}
      onWheel={(event) => { if (Math.abs(event.deltaY) > 5) onPanelFocus(event.deltaY > 0 ? "secondary" : "primary"); }}>
      <ButtonBase disableRipple className={`brands ${tab}`} aria-pressed={selected === "brands"} onClick={() => selectTab("brands")}>Brands</ButtonBase>
      <ButtonBase disableRipple className={`models ${tab}`} aria-pressed={selected === "models"} onClick={() => selectTab("models")}>Models</ButtonBase>
      <ButtonBase disableRipple className={`extra ${tab}`} aria-pressed={selected === "extra"} onClick={() => selectTab("extra")}>Equalizer</ButtonBase>
    </div>
    <div className="selector-viewport relative min-h-0 w-full flex-1 overflow-clip">
    <div ref={panelTrack} className="selector-track flex h-full w-[200%]">
    <div className="selector-panel box-border flex h-full min-h-0 min-w-0 flex-[0_0_50%] flex-col overflow-hidden" inert={selected === "extra"} aria-hidden={selected === "extra"}>
      <div className="selector-search mx-4 mt-4 flex shrink-0 items-center gap-1.5">
      <InputBase className="min-w-0 flex-1" type="search" value={query} disableInjectingGlobalStyles
        sx={{ minWidth: 0, height: "36px", lineHeight: 1, letterSpacing: "normal", "& input": { animation: "none", "&:-webkit-autofill": { animation: "none" } } }}
        slotProps={{ input: { className: "search box-border h-9 rounded-[6px] border border-solid border-[var(--background-color-contrast-more)] bg-[var(--background-color-inputs)] px-4 py-[10px] font-mono text-[11px] leading-none text-[var(--font-color-inputs)] uppercase outline-none", inputMode: "search", placeholder: "Search", "aria-label": "Search brands and models", onChange: (event) => setQuery(event.currentTarget.value), onFocus: (event) => event.currentTarget.select() } }} />
      <UploadMenu upload={tool.upload} />
      </div>
      <div className="scroll-container relative min-h-0 flex-[auto_1_1] [@media(min-width:1500px)_and_(min-aspect-ratio:2/1)]:flex [@media(min-width:1500px)_and_(min-aspect-ratio:2/1)]:max-h-full"
        onTouchStart={(event) => { touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }}
        onTouchEnd={(event) => { if (!touch.current) return; const dx = event.changedTouches[0].clientX - touch.current.x, dy = event.changedTouches[0].clientY - touch.current.y; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) selectTab(dx > 0 ? "brands" : "models"); touch.current = null; }}>
        <div className={`scrollOuter left-0 px-4 ${listPanel} ${listSelected === "models" ? "before:pointer-events-auto before:cursor-pointer before:opacity-80" : "before:pointer-events-none before:opacity-0"}`} data-list="brands" onClick={() => { if (selected !== "brands") selectTab("brands"); }}><div className={`scroll ${scroll}`} id="brands">
          {filteredBrands.map((brand, index) => <div key={brand} className={`relative box-border h-9 cursor-pointer overflow-hidden rounded-md border-0 bg-(--background-color) px-3 py-2.75 text-[12px] leading-normal font-normal text-(--font-color-primary) hover:underline aria-pressed:bg-(--accent-color) aria-pressed:text-(--font-color-secondary) ${index ? "mt-1.5" : ""} ${brands.includes(brand) ? "active" : ""}`} role="button" tabIndex={0} aria-pressed={brands.includes(brand)}
            onClick={(event) => { event.stopPropagation(); chooseBrand(brand, !event.ctrlKey && !event.metaKey); }}
            onAuxClick={(event) => { if (event.button === 1) { event.preventDefault(); chooseBrand(brand, false); } }}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); chooseBrand(brand, !event.ctrlKey && !event.metaKey); } }}>{brand}</div>)}
        </div></div>
        <div ref={modelList} className={`scrollOuter right-0 border-l border-(--background-color-contrast-more) pr-2.5 pl-4 ${listPanel} ${listSelected === "brands" ? "before:pointer-events-auto before:cursor-pointer before:opacity-80" : "before:pointer-events-none before:opacity-0"}`} data-list="models" onClick={() => { if (selected !== "models") selectTab("models"); }}><div ref={modelItems} className={`scroll ${scroll}`} id="phones">
          {filteredModels.map((model, index) => {
            const active = tool.active.find((entry) => !entry.eqParent && sameModel(entry, model));
            const selectionColor = active && comparingModels ? curveColor(active.colorId) : undefined;
            return <div key={model.key} className={`phone-item relative box-border flex h-9 w-[256px] cursor-pointer items-center justify-start overflow-hidden rounded-md border-0 bg-(--background-color) p-0 text-[12px] leading-normal font-normal text-(--font-color-primary) hover:underline aria-pressed:bg-(--accent-color) aria-pressed:text-(--font-color-secondary) [@media(max-width:1000px)]:w-[calc(100vw-94px)] ${index ? "mt-1.5" : ""}`} role="button" tabIndex={0} aria-pressed={!!active}
              style={selectionColor ? { backgroundColor: selectionColor, color: contrastTextColor(selectionColor) } : undefined}
              onMouseEnter={() => onHighlight(active?.key ?? null)} onMouseLeave={() => onHighlight(null)}
              onClick={(event) => { event.stopPropagation(); void tool.choose(model, !event.ctrlKey && !event.metaKey); }}
              onAuxClick={(event) => { if (event.button === 1) { event.preventDefault(); void tool.choose(model, false); } }}
              onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void tool.choose(model, !event.ctrlKey && !event.metaKey); } }}>
              <span className="px-3 py-2.75">{brands.length === 1 ? model.name : model.fullName}{tool.loading.includes(model.key) ? " …" : ""}</span>
              <div role="button" tabIndex={0} className={`phone-item-add relative ml-auto box-border flex h-9 flex-[36px_0_0] items-center justify-center overflow-hidden rounded-md ${active ? "bg-transparent text-inherit" : "bg-(--background-color) text-(--background-color-contrast-more)"}`} aria-label={`${active ? "Remove" : "Add"} ${model.fullName}`}
                onClick={(event) => { event.stopPropagation(); if (active) tool.remove(active.key); else void tool.choose(model, false); }}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); if (active) tool.remove(active.key); else void tool.choose(model, false); } }}>
                <ModelToggleIcon active={!!active} />
              </div>
            </div>;
          })}
          {tool.ready && !filteredModels.length && <p className="no-results px-3 py-0 text-[12px] text-(--font-color-inputs)">No models found.</p>}
        </div></div>
      </div>
    </div>
    <div className="extra-panel box-border flex h-full min-h-0 min-w-0 flex-[0_0_50%] flex-col overflow-auto px-4 pt-4 pb-0" inert={selected !== "extra"} aria-hidden={selected !== "extra"}>{children}</div>
    </div>
    </div>
  </div></div>;
}
