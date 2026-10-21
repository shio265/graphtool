"use client";

import { useEffect, useRef, useState } from "react";
import ButtonBase from "@mui/material/ButtonBase";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { animateDom } from "@/src/lib/graphtool/dom-motion";
import { copyShareURL } from "@/src/lib/graphtool/share";
import type { GraphToolController } from "@/src/lib/graphtool/use-graph-tool";
import { NumberInput } from "./number-input";
import { Button } from "./button";
import { GraphIcon } from "./graph-icon";

interface GraphToolbarProps {
  tool: GraphToolController;
  zoom: number;
  onZoom: (zoom: number) => void;
  inspect: boolean;
  onInspect: () => void;
  labels: boolean;
  onLabels: () => void;
  dark: boolean;
  onTheme: () => void;
  onExport: (format: "png" | "svg") => void;
}

export function GraphToolbar({ tool, zoom, onZoom, inspect, onInspect, labels, onLabels, onTheme, dark, onExport }: GraphToolbarProps) {
  const [copied, setCopied] = useState(false);
  const copyFeedback = useRef<HTMLSpanElement>(null);
  const [exportMenu, setExportMenu] = useState<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!copyFeedback.current) return;
    const animation = animateDom(copyFeedback.current, { to: { opacity: copied ? "1" : "0" }, duration: copied ? 0 : 200, ease: "outQuad" });
    return () => { animation.cancel(); };
  }, [copied]);
  const copy = async () => {
    try { await copyShareURL(); setCopied(true); window.setTimeout(() => setCopied(false), 600); }
    catch (error) { tool.reportError(error); }
  };
  const caption = "mr-[10px] font-mono text-[11px] leading-none text-[var(--background-color-contrast-more)] uppercase";
  const endCap = "after:order-3 after:box-border after:block after:h-9 after:w-[6px] after:rounded-r-[6px] after:border after:border-l-0 after:border-solid after:border-[var(--background-color-contrast-more)] after:bg-[var(--background-color-inputs)] after:content-['']";
  return <div className="tools collapseTools order-1 box-border flex max-h-17.25 flex-[auto_0_0] items-start overflow-x-auto overflow-y-hidden border-b border-(--background-color-contrast) bg-(--background-color) py-4">
    <div className="copy-url relative mr-4 flex pl-4">
      <Button id="copy-url" className="relative overflow-hidden active:border-(--accent-color) active:bg-(--accent-color) active:text-(--font-color-secondary)" onClick={copy}>Copy URL<span ref={copyFeedback} className="copy-feedback pointer-events-none absolute inset-0 flex items-center justify-center bg-(--accent-color) text-(--font-color-secondary) opacity-0" aria-hidden="true"><GraphIcon name="thumbsUp" small /></span></Button>
      <Button id="download-faux" className="ml-1.5 active:border-(--accent-color) active:bg-(--accent-color) active:text-(--font-color-secondary)"
        aria-haspopup="menu" aria-expanded={Boolean(exportMenu)} aria-controls={exportMenu ? "graph-export-menu" : undefined}
        onClick={() => onExport("png")} onContextMenu={(event) => { event.preventDefault(); setExportMenu(event.currentTarget); }}
        onKeyDown={(event) => { if (event.key === "ContextMenu" || event.key === "F10" && event.shiftKey) { event.preventDefault(); setExportMenu(event.currentTarget); } }}>Screenshot</Button>
      <Menu anchorEl={exportMenu} open={Boolean(exportMenu)} onClose={() => setExportMenu(null)} transitionDuration={0} disableScrollLock
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }} transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: { className: "export-menu", elevation: 0, sx: { mt: "4px", border: "1px solid var(--background-color-contrast-more)", borderRadius: "6px", backgroundColor: "var(--background-color-inputs)", color: "var(--font-color-primary)", backgroundImage: "none", boxShadow: "0 4px 12px #0003" } },
          list: { id: "graph-export-menu", "aria-label": "Graph image export", dense: true, sx: { p: "4px" } },
        }}>
        {(["png", "svg"] as const).map((format) => <MenuItem key={format} disableRipple onClick={() => { setExportMenu(null); onExport(format); }}
          sx={{ minHeight: "28px", borderRadius: "4px", px: "12px", py: "4px", fontSize: "12px", lineHeight: "20px", transition: "none", "&:hover, &.Mui-focusVisible": { backgroundColor: "color-mix(in srgb, var(--background-color-inputs) 88%, var(--font-color-primary))" } }}>As .{format}</MenuItem>)}
      </Menu>
    </div>
    <div className="zoom order-4 ml-4 flex items-center border-l border-(--background-color-contrast-more) px-4"><span className={caption}>Zoom:</span>{["Bass", "Mids", "Treble"].map((label, index) => <Button key={label} className={`first-of-type:rounded-r-none first-of-type:border-r-0 last:rounded-l-none last:border-l-0 nth-of-type-2:rounded-none nth-of-type-2:border-x-0 ${zoom === index ? "selected" : ""}`} aria-pressed={zoom === index} onClick={() => onZoom(zoom === index ? 3 : index)}>{label}</Button>)}</div>
    <div className="normalize order-2 flex items-center border-l border-(--background-color-contrast-more) pl-4"><span className={caption}>Normalize:</span>
      <div className={`flex items-center ${endCap} ${tool.normalization.mode === "dB" ? "selected" : ""}`}>
        <NumberInput variant="normalize" id="norm-phon" aria-label="Normalize loudness in dB" min={0} max={100} step={1} value={tool.normalization.db} onValueChange={(db) => tool.setNormalization({ ...tool.normalization, db, mode: "dB" })} />
        <ButtonBase disableRipple className={`order-1 box-border cursor-pointer rounded-l-md border border-r-0 border-solid px-4 py-2.75 font-sans text-[12px] leading-none font-normal whitespace-nowrap ${tool.normalization.mode === "dB" ? "border-(--accent-color) bg-(--accent-color) text-(--font-color-secondary)" : "border-(--background-color-contrast-more) bg-(--background-color) text-(--accent-color-contrast)"}`} aria-pressed={tool.normalization.mode === "dB"} onClick={() => tool.setNormalization({ ...tool.normalization, mode: "dB" })}>dB</ButtonBase>
      </div>
      <div className={`ml-1.5 flex items-center ${endCap} ${tool.normalization.mode === "Hz" ? "selected" : ""}`}>
        <NumberInput variant="normalize" id="norm-fr" aria-label="Normalization frequency in Hz" min={20} max={20000} step={1} value={tool.normalization.hz} onValueChange={(hz) => tool.setNormalization({ ...tool.normalization, hz, mode: "Hz" })} />
        <ButtonBase disableRipple className={`order-1 box-border cursor-pointer rounded-l-md border border-r-0 border-solid px-4 py-2.75 font-sans text-[12px] leading-none font-normal whitespace-nowrap ${tool.normalization.mode === "Hz" ? "border-(--accent-color) bg-(--accent-color) text-(--font-color-secondary)" : "border-(--background-color-contrast-more) bg-(--background-color) text-(--accent-color-contrast)"}`} aria-pressed={tool.normalization.mode === "Hz"} onClick={() => tool.setNormalization({ ...tool.normalization, mode: "Hz" })}>Hz</ButtonBase>
      </div>
    </div>
    <div className={`smooth order-3 ml-4 flex items-center border-l border-(--background-color-contrast-more) pl-4 ${endCap}`}><span className={caption}>Smooth:</span><NumberInput variant="smooth" id="smooth-level" aria-label="Smoothing level" min={0} step="any" value={tool.smoothing} onValueChange={tool.setSmoothing} /></div>
    <div className="miscTools order-4 flex gap-1.5 border-l border-(--background-color-contrast-more) bg-(--background-color) px-4">
      <Button compact id="inspector" className={`order-1 flex-[auto_1_1] capitalize ${inspect ? "selected" : ""}`} aria-pressed={inspect} onClick={onInspect}>inspect</Button>
      <Button compact id="label" className={`order-1 flex-[auto_1_1] capitalize ${labels ? "selected" : ""}`} aria-pressed={labels} onClick={onLabels}>label</Button>
      <Button compact id="recolor" className="order-1 flex-[auto_1_1] capitalize active:border-(--accent-color) active:bg-(--accent-color) active:text-(--font-color-secondary)" onClick={() => tool.recolor()}>recolor</Button>
      <Button compact id="theme" className="order-1 flex-[auto_1_1] capitalize" aria-pressed={dark} onClick={onTheme}>dark mode</Button>
    </div>
  </div>;
}
