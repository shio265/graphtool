"use client";

import { useId, useState, type ButtonHTMLAttributes } from "react";
import IconButton from "@mui/material/IconButton";
import { curveColor } from "@/src/lib/graphtool/colors";
import { modelIdentity } from "@/src/lib/graphtool/model-identity";
import type { PreparedModel } from "@/src/lib/graphtool/types";
import type { GraphToolController } from "@/src/lib/graphtool/use-graph-tool";
import { NumberInput } from "./number-input";
import { GraphIcon, type GraphIconName } from "./graph-icon";

function CurveAction({ icon, activeIcon, active = false, outlined = true, muted = true, className = "", ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> & { icon: GraphIconName; activeIcon?: GraphIconName; active?: boolean; outlined?: boolean; muted?: boolean }) {
  return <td className={`relative ml-1.5 box-border flex min-h-12.5 flex-[36px_0_0] items-center justify-center p-0 ${className}`}>
    <IconButton {...props} disableRipple sx={{ transition: "none" }} className={`absolute top-1.5 left-0 box-border flex size-9 cursor-pointer items-center justify-center rounded-md border border-solid bg-(--background-color) p-0 [@media(max-width:1000px)]:bg-(--background-color-contrast) ${outlined ? "border-(--background-color-contrast) [@media(max-width:1000px)]:border-(--background-color)" : "border-transparent"} ${muted ? "text-(--background-color-contrast-more)" : "text-(--font-color-primary)"}`}><GraphIcon name={icon} morphTo={activeIcon} active={active} /></IconButton>
  </td>;
}

function ChannelSelector({ model, tool }: { model: PreparedModel; tool: GraphToolController }) {
  const id = useId().replace(/:/g, "");
  const multichannel = !model.isTarget && model.channels.filter(Boolean).length > 1;
  const average = model.mode === "average";
  const setMode = (mode: PreparedModel["mode"]) => tool.patchModel(model.key, { mode, hidden: false });
  const textStyle = "fill-[var(--background-color-contrast-more)] font-mono text-[8px] uppercase";
  return <svg className="keyLine h-25 max-h-10 w-auto" viewBox="-19 -12 65 24" aria-label={`Channel selection for ${model.fullName}`}>
    <defs>
      <linearGradient id={`channel-${id}`} x1="0" y1="0" x2="0" y2="1">{[0.1,0.4,0.6,0.9].map((offset) => <stop key={offset} offset={offset} stopColor={curveColor(model.colorId, offset < 0.3 ? -1 : offset < 0.7 ? 0 : 1)} />)}</linearGradient>
      <linearGradient id={`selection-${id}`}>{[0,0.25,0.31,0.69,0.75,1].map((offset, index) => <stop key={offset} offset={offset} stopColor={index === 2 || index === 3 ? "white" : "#333"} />)}</linearGradient>
      <mask id={`mask-${id}`}><rect x={-19} y={-12} width={65} height={24} fill="#333" /><rect x={average ? -86 : -36} y={model.mode === "left" ? -24 : model.mode === "right" ? 0 : -12} width={120} height={24} fill={`url(#selection-${id})`} /></mask>
    </defs>
    <g opacity={model.hidden ? 0.5 : 1} mask={multichannel ? `url(#mask-${id})` : undefined}>
      <path d={model.isTarget ? "M15 0H-17" : "M15 -6H9C0 -6,0 0,-9 0H-17M-17 0H-9C0 0,0 6,9 6H15"} fill="none" stroke={average || model.isTarget ? curveColor(model.colorId) : `url(#channel-${id})`} strokeWidth={1.4} />
      {model.isTarget ? <text className={textStyle} x={17} y={0} dy="0.32em" fontSize={8}>Target</text> : <>
        <text className={textStyle} x={17} y={-6} dy="0.32em" opacity={model.mode === "right" ? 0.3 : 1}>L</text>
        <text className={textStyle} x={17} y={6} dy="0.32em" opacity={model.mode === "left" ? 0.3 : 1}>R</text>
      </>}
      {model.imbalanced && <GraphIcon name="warning" className="imbalance text-red-600" size={8} x={5} y={-4} />}
    </g>
    {multichannel && <>
      <rect className="outline-none" x={-19} y={-12} width={44} height={24} fill="transparent" tabIndex={0} role="button" aria-label={`${average ? "Show both channels" : "Average channels"} for ${model.fullName}`} onClick={() => setMode(average ? "both" : "average")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setMode(average ? "both" : "average"); } }} />
      {(["left", "right"] as const).map((mode, index) => <g className="outline-none" key={mode} transform={`translate(25,${index ? 6 : -6})`} role="button" tabIndex={0} aria-label={`Show ${mode} channel only for ${model.fullName}`} onClick={() => setMode(model.mode === mode ? "both" : mode)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setMode(model.mode === mode ? "both" : mode); } }}>
        <rect x={0} y={-6} width={20} height={12} fill="transparent" /><text className={textStyle} y={0} dy="0.28em" fontSize={7.5}>only</text>
      </g>)}
    </>}
  </svg>;
}

export function CurveManager({ tool, highlighted, onHighlight, onBrowse }: { tool: GraphToolController; highlighted: string | null; onHighlight: (key: string | null) => void; onBrowse: () => void }) {
  const [variants, setVariants] = useState<string | null>(null);
  const cell = "relative box-border flex min-h-[50px] items-center justify-center p-0";
  return <table className="manageTable flex w-full flex-1 flex-col border-spacing-0.5 [@media(max-width:1000px)]:min-h-[calc(100vh-(44vw+92px))]"><tbody className="curves block flex-1 empty:flex empty:min-h-12.5 empty:items-center empty:justify-center empty:border-t empty:border-(--background-color-contrast) empty:before:px-4 empty:before:py-3.5 empty:before:text-center empty:before:text-[14px] empty:before:leading-[1.6] empty:before:content-['Select_a_model_from_the_list_to_the_left_to_graph_its_frequency_response'] [@media(max-width:1000px)]:empty:before:content-['Select_a_model_from_the_list_below_to_graph_its_frequency_response']">{tool.prepared.map((model) => <tr key={model.key} className={`flex items-start border-t border-(--background-color-contrast) [@media(max-width:1200px)]:flex-wrap [@media(max-width:1000px)]:border-(--background-color) [@media(max-width:500px)]:before:order-5 [@media(max-width:500px)]:before:block [@media(max-width:500px)]:before:h-0 [@media(max-width:500px)]:before:flex-[100%_1_1] [@media(max-width:500px)]:before:content-[''] ${highlighted === model.key ? "highlight bg-[color-mix(in_srgb,var(--background-color-contrast)_40%,transparent)]" : ""}`} onMouseEnter={() => onHighlight(model.key)} onMouseLeave={() => onHighlight(null)}>
    <CurveAction icon="remove" className="remove order-6 mr-4" aria-label={`Remove ${model.fullName}`} onClick={() => tool.remove(model.key)} />
    <td className={`item-line ${cell} order-1 flex-[auto_1_1] justify-start font-bold text-(--background-color-contrast-more) [@media(max-width:1200px)]:flex-[100%_0_0] [@media(max-width:1200px)]:px-4 ${model.isTarget ? "item-target" : "item-phone"}`}>
      <span className={`brand order-2 flex min-h-12.5 flex-[auto_0_0] items-center self-start text-(--font-color-primary) ${model.isTarget ? "after:content-[':']" : ""}`}>{model.isTarget ? "Target" : `${model.brand}${model.collab ? ` x ${model.collab}` : ""}`}</span>
      <div className="phonename order-4 flex min-h-12.5 flex-[auto_1_1] flex-col justify-center px-1.5 py-0 text-(--font-color-primary)">{variants === model.key ? model.variants?.map((variant) => <div className="variant-option flex items-center gap-2.5" key={variant.fileName}>
        <button className="variantName min-h-12.5 cursor-pointer border-0 bg-transparent text-left text-[14px] text-(--font-color-primary) hover:underline" onClick={() => { void tool.changeVariant(model.key, variant.fileName); setVariants(null); }}>{variant.name}</button>
        {!tool.active.some((entry) => modelIdentity(entry) === modelIdentity({ ...model, fileName: variant.fileName })) && <button className="variant-add min-h-12.5 cursor-pointer border-0 bg-transparent text-left text-[14px] text-(--font-color-primary)" aria-label={`Add variant ${variant.name}`} onClick={() => { void tool.changeVariant(model.key, variant.fileName, true); setVariants(null); }}><GraphIcon name="plus" small /></button>}
      </div>) : model.variants?.find((entry) => entry.fileName === model.fileName)?.name ?? model.name}</div>
      {(model.variants?.length ?? 0) > 1 && <div className="variants relative order-2 ml-1.5 flex h-12.5 flex-[20px_0_0] cursor-pointer items-center self-start" role="button" tabIndex={0} aria-label={`Choose variant for ${model.fullName}`} aria-expanded={variants === model.key} onClick={() => setVariants(variants === model.key ? null : model.key)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setVariants(variants === model.key ? null : model.key); } }}><span className="box-border flex size-5 items-center justify-center rounded-full border border-solid border-current"><GraphIcon name="plus" morphTo="minus" active={variants === model.key} small /></span></div>}
    </td>
    <td className={`curve-color ${cell} order-0 flex-[38px_0_0] cursor-pointer justify-end self-start [@media(max-width:1200px)]:order-2`}><button className="mr-1.5 box-border h-4 flex-[16px_0_0] cursor-pointer rounded-lg border-0 p-0 outline-none" style={{ backgroundColor: curveColor(model.colorId) }} aria-label={`Recolor ${model.fullName}`} onClick={() => tool.recolor(model.key)} /></td>
    <td className={`channels ${cell} order-2 flex-[100px_0_0] [@media(max-width:1200px)]:mr-auto [@media(max-width:500px)]:order-3`}><ChannelSelector model={model} tool={tool} /></td>
    <td className={`levels ${cell} order-2 flex-[50px_0_0] pl-4 [@media(max-width:1200px)]:ml-auto [@media(max-width:500px)]:order-4 [@media(max-width:500px)]:mr-4`}><NumberInput variant="offset" value={model.offset} step="any" aria-label={`dB offset for ${model.fullName}`} onValueChange={(offset) => tool.patchModel(model.key, { offset })} /></td>
    <CurveAction icon="squiggle" activeIcon="baseline" active={tool.baselineKey === model.key} outlined={false} muted={false} className={`button button-baseline order-3 [@media(max-width:500px)]:order-5 [@media(max-width:500px)]:ml-auto ${tool.baselineKey === model.key ? "selected" : ""}`} aria-label={`Baseline ${model.fullName}`} aria-pressed={tool.baselineKey === model.key} onClick={() => tool.setBaselineKey(tool.baselineKey === model.key ? null : model.key)} />
    <CurveAction icon="hide" activeIcon="hidden" active={model.hidden} outlined={model.hidden} muted={model.hidden} className={`button hideIcon order-4 [@media(max-width:500px)]:order-5 ${model.hidden ? "selected" : ""}`} aria-label={`${model.hidden ? "Show" : "Hide"} ${model.fullName}`} aria-pressed={model.hidden} onClick={() => tool.patchModel(model.key, { hidden: !model.hidden })} />
    <CurveAction icon="pin" activeIcon="unpin" active={model.pinned} outlined={!model.pinned} muted={!model.pinned} className="button button-pin order-5" data-pinned={model.pinned} aria-label={`${model.pinned ? "Unpin" : "Pin"} ${model.fullName}`} aria-pressed={model.pinned} onClick={() => tool.patchModel(model.key, { pinned: !model.pinned })} />
  </tr>)}</tbody><tbody><tr className="mobile-helper relative hidden p-4 [@media(max-width:1000px)]:block" role="button" tabIndex={0} aria-label="Browse all graphs" onClick={onBrowse} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onBrowse(); } }}><td className="relative box-border block h-9 w-full cursor-pointer rounded-md border border-solid border-(--background-color-contrast-more) bg-(--background-color) px-4 py-2.75 text-center text-[12px] leading-none text-(--font-color-primary)">Browse all graphs<GraphIcon name="plus" small className="absolute top-2.5 right-2.5 text-(--background-color-contrast-more)" /></td></tr></tbody></table>;
}
