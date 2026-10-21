"use client";

import { useEffect, useRef, useState } from "react";
import { config } from "@/src/lib/graphtool/config";
import { useDrawerMotion } from "@/src/lib/graphtool/animation";
import { animateDom } from "@/src/lib/graphtool/dom-motion";
import { exportGraph } from "@/src/lib/graphtool/export-graph";
import { useGraphTool } from "@/src/lib/graphtool/use-graph-tool";
import { defaultFrequencyRangePreset, frequencyRangePresets } from "@/src/lib/graphtool/frequency-ranges";
import type { Model } from "@/src/lib/graphtool/types";
import { FrequencyGraph } from "./ui/frequency-graph";
import { GraphToolbar } from "./ui/graph-toolbar";
import { FrequencyGuide } from "./ui/frequency-guide";
import { TargetSelector } from "./ui/target-selector";
import { CurveManager } from "./ui/curve-manager";
import { ModelSelector } from "./ui/model-selector";
import { EqualizerPanel } from "./ui/equalizer-panel";
import { NoticeAlert } from "./ui/notice-alert";
import { AutoEQBackdrop } from "./ui/autoeq-backdrop";

export function GraphTool({ catalog }: { catalog: Model[] }) {
  const tool = useGraphTool(catalog);
  const graphRef = useRef<SVGSVGElement>(null), secondary = useRef<HTMLElement>(null), primary = useRef<HTMLElement>(null);
  const baselineTransition = useRef<(() => void) | null>(null);
  const [focused, setFocused] = useState<"primary" | "secondary">("secondary");
  const [zoom, setZoom] = useState(3), [inspect, setInspect] = useState(false), [labels, setLabels] = useState(false);
  const [previousCurves, setPreviousCurves] = useState(tool.curves);
  if (previousCurves !== tool.curves) {
    setPreviousCurves(tool.curves);
    setLabels(config.stickyLabels && tool.curves.length > 0);
  }
  const [tutorial, setTutorial] = useState<number | null>(null), [tutorialHover, setTutorialHover] = useState<number | null>(null);
  const [rangeType, setRangeType] = useState(defaultFrequencyRangePreset.id);
  const rangePreset = frequencyRangePresets.find((preset) => preset.id === rangeType) ?? defaultFrequencyRangePreset;
  const [highlighted, setHighlighted] = useState<string | null>(null), [dark, setDark] = useState(false);
  useDrawerMotion(secondary, focused);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("dark-mode-pref");
      if (stored) queueMicrotask(() => setDark(true));
    } catch { /* Storage may be unavailable in private/embedded contexts. */ }
    const root = primary.current?.closest<HTMLElement>(".graphtool");
    const animation = root ? animateDom(root, { from: { opacity: "0" }, to: { opacity: "1" }, duration: 100 }) : undefined;
    return () => { animation?.revert(); };
  }, []);
  useEffect(() => { document.body.classList.toggle("dark-mode", dark); }, [dark]);

  const changeTheme = () => {
    setDark(!dark);
    try { if (dark) localStorage.removeItem("dark-mode-pref"); else localStorage.setItem("dark-mode-pref", "true"); } catch { /* Theme still works without persistence. */ }
  };
  const saveGraph = async (format: "png" | "svg") => {
    try {
      baselineTransition.current?.();
      setLabels(true);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (graphRef.current) await exportGraph(graphRef.current, format, tool.prepared);
    } catch (error) { tool.reportError(error); }
  };
  const center = tool.baselineKey && tool.prepared.some((model) => model.key === tool.baselineKey) ? 0 : tool.normalization.mode === "Hz" ? 60 : tool.normalization.db;
  return <div className="graphtool box-border flex h-screen max-h-[-webkit-fill-available] flex-col" onFocusCapture={(event) => { if (event.target instanceof HTMLInputElement) document.body.dataset.inputState = "focus"; }} onBlurCapture={() => { document.body.dataset.inputState = "blur"; }}>
    <main className="main flex min-h-0 flex-[100%_1_1] overflow-hidden [@media(max-width:1000px)]:relative [@media(max-width:1000px)]:block" data-focused-panel={focused}>
      <section ref={primary} className={`parts-primary relative z-1 order-2 box-border flex h-full min-w-0 flex-auto flex-col overflow-y-auto [scrollbar-gutter:stable] bg-(--background-color) [@media(max-width:1000px)]:order-1 [@media(max-width:1000px)]:block [@media(max-width:1000px)]:after:block [@media(max-width:1000px)]:after:h-21 [@media(max-width:1000px)]:after:content-[''] [@media(max-height:500px)_and_(min-aspect-ratio:3/2)]:[body:not([data-input-state=focus])_&]:z-3 [@media(max-height:500px)_and_(min-aspect-ratio:3/2)]:[body:not([data-input-state=focus])_&]:flex-[100vh_1_1] ${focused === "secondary" ? "[@media(max-width:1000px)]:overflow-hidden" : ""}`} data-tutorial-active={tutorial !== null}>
        <div className={`graphBox top-0 z-1 flex h-auto shrink-0 flex-col border-b border-(--background-color-contrast) bg-(--background-color-graph) pb-4 [@media(max-width:1000px)]:z-2 [@media(max-width:1000px)]:pb-2 ${config.stickyGraph ? "sticky" : "relative"}`} data-sticky-graph={config.stickyGraph} data-animated="true">
          <div className="graph-sizer relative order-2 mx-auto mt-4 w-full max-w-[calc((100vh-300px)*2.2)] flex-[auto_0] [@media(max-width:1000px)]:mt-2 [@media(max-height:500px)_and_(min-aspect-ratio:3/2)]:[body:not([data-input-state=focus])_&]:fixed [@media(max-height:500px)_and_(min-aspect-ratio:3/2)]:[body:not([data-input-state=focus])_&]:inset-0 [@media(max-height:500px)_and_(min-aspect-ratio:3/2)]:[body:not([data-input-state=focus])_&]:z-5 [@media(max-height:500px)_and_(min-aspect-ratio:3/2)]:[body:not([data-input-state=focus])_&]:m-0 [@media(max-height:500px)_and_(min-aspect-ratio:3/2)]:[body:not([data-input-state=focus])_&]:box-border [@media(max-height:500px)_and_(min-aspect-ratio:3/2)]:[body:not([data-input-state=focus])_&]:flex [@media(max-height:500px)_and_(min-aspect-ratio:3/2)]:[body:not([data-input-state=focus])_&]:h-screen [@media(max-height:500px)_and_(min-aspect-ratio:3/2)]:[body:not([data-input-state=focus])_&]:w-screen [@media(max-height:500px)_and_(min-aspect-ratio:3/2)]:[body:not([data-input-state=focus])_&]:max-w-none [@media(max-height:500px)_and_(min-aspect-ratio:3/2)]:[body:not([data-input-state=focus])_&]:items-center [@media(max-height:500px)_and_(min-aspect-ratio:3/2)]:[body:not([data-input-state=focus])_&]:justify-center [@media(max-height:500px)_and_(min-aspect-ratio:3/2)]:[body:not([data-input-state=focus])_&]:bg-(--background-color)" onClick={() => setFocused(focused === "primary" ? "secondary" : "primary")}>
            <FrequencyGraph graphRef={graphRef} baselineTransitionRef={baselineTransition} curves={tool.curves} models={tool.prepared} zoom={zoom} center={center} smoothing={tool.smoothing} inspect={inspect} labels={labels} baselineKey={tool.baselineKey} highlighted={highlighted} onHighlight={setHighlighted} tutorial={tutorial} tutorialHover={tutorialHover} rangePreset={rangePreset} />
          </div>
          <GraphToolbar tool={tool} zoom={zoom} onZoom={(value) => { setZoom(value); if (value !== 3) setTutorial(null); }} inspect={inspect} onInspect={() => { setInspect(!inspect); setLabels(false); }} labels={labels} onLabels={() => setLabels(!labels)} dark={dark} onTheme={changeTheme} onExport={(format) => { void saveGraph(format); }} />
        </div>
        <div className={`manage flex flex-1 flex-col [@media(max-width:1000px)]:relative [@media(max-width:1000px)]:bg-(--background-color-contrast) [@media(max-width:1000px)]:before:pointer-events-none [@media(max-width:1000px)]:before:absolute [@media(max-width:1000px)]:before:inset-0 [@media(max-width:1000px)]:before:z-1 [@media(max-width:1000px)]:before:bg-(--background-color-contrast-more) [@media(max-width:1000px)]:before:content-[''] ${focused === "secondary" ? "[@media(max-width:1000px)]:before:opacity-80" : "[@media(max-width:1000px)]:before:opacity-0"}`}>
          <FrequencyGuide preset={rangePreset} selected={tutorial} onSelect={(index) => { setTutorial(index); if (index !== null) setZoom(3); }} onHover={setTutorialHover} onRangeTypeChange={(id) => { if (id !== rangePreset.id && frequencyRangePresets.some((preset) => preset.id === id)) { setRangeType(id); setTutorial(null); setTutorialHover(null); } }} />
          <TargetSelector tool={tool} />
          <CurveManager tool={tool} highlighted={highlighted} onHighlight={setHighlighted} onBrowse={() => setFocused("secondary")} />
        </div>
      </section>
      <section ref={secondary} className="parts-secondary order-1 box-border h-full min-w-0 flex-[350px_0_0] border-r border-(--background-color) [@media(max-width:1000px)]:absolute [@media(max-width:1000px)]:top-0 [@media(max-width:1000px)]:z-1 [@media(max-width:1000px)]:order-2 [@media(max-width:1000px)]:h-[calc(100%-(44vw+92px))] [@media(max-width:1000px)]:min-h-50 [@media(max-width:1000px)]:w-full [@media(max-width:1000px)]:rounded-t-2xl [@media(max-width:1000px)]:border-t [@media(max-width:1000px)]:border-r-0 [@media(max-width:1000px)]:border-(--background-color-contrast-more) [@media(max-width:1000px)]:transform-[translateY(calc((100vw*0.44)+92px))] [@media(min-width:1500px)_and_(min-aspect-ratio:2/1)]:flex-[600px_0_0] [@media(max-height:500px)_and_(min-aspect-ratio:3/2)]:[body:not([data-input-state=focus])_&]:hidden" onClick={() => setFocused("secondary")}>
        <ModelSelector tool={tool} onHighlight={setHighlighted} onPanelFocus={setFocused}><EqualizerPanel tool={tool} /></ModelSelector>
      </section>
      <AutoEQBackdrop open={tool.autoEQRunning} />
    </main>
    <NoticeAlert message={tool.error} onClose={() => tool.setError("")} />
    <noscript>Turn on Javascript to view and compare frequency response graphs.</noscript>
  </div>;
}
