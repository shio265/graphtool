"use client";

import { useImperativeHandle, useMemo, useRef, useState, type PointerEvent, type RefObject } from "react";
import { RectClipPath } from "@visx/clip-path";
import { localPoint } from "@visx/event";
import { LinearGradient } from "@visx/gradient";
import { Group } from "@visx/group";
import { Bar, Circle, Line } from "@visx/shape";
import { frequencies } from "@/src/lib/graphtool/config";
import type { FrequencyRangePreset } from "@/src/lib/graphtool/frequency-ranges";
import { useAnimatedGraphView, useAnimatedRange, useCurvePresence } from "@/src/lib/graphtool/animation";
import { graphDimensions as dimensions, nearestFrequencyIndex, zoomRanges } from "@/src/lib/graphtool/graph";
import { createDecibelScale, createFrequencyScale } from "@/src/lib/graphtool/graph-scales";
import type { GraphCurve, PreparedModel } from "@/src/lib/graphtool/types";
import { GraphCurvePath } from "./graph-curve";
import { GraphAxes } from "./graph-axes";
import { FrequencyRangeOverlay } from "./frequency-range-overlay";

interface FrequencyGraphProps {
  graphRef: RefObject<SVGSVGElement | null>;
  baselineTransitionRef: RefObject<(() => void) | null>;
  curves: GraphCurve[];
  models: PreparedModel[];
  zoom: number;
  center: number;
  smoothing: number;
  inspect: boolean;
  labels: boolean;
  baselineKey: string | null;
  highlighted: string | null;
  onHighlight: (key: string | null) => void;
  tutorial: number | null;
  tutorialHover: number | null;
  rangePreset: FrequencyRangePreset;
}

function GraphLabel({ name, color, x, y, value }: { name: string; color: string; x: number; y: number; value?: number }) {
  const text = value === undefined ? name : `${value.toFixed(1)}  ${name}`;
  const width = Math.min(730, text.length * 7.1 + 6);
  return <Group className="lineLabel pointer-events-none" left={value === undefined ? x : Math.min(x, 785 - width)} top={y}>
    <Bar className="fill-(--background-color-graph) opacity-90 blur-[2px]" x={value === undefined ? 2 : -2} y={value === undefined ? 2 : -13} width={width} height={17.5} />
    <text className="font-sans font-bold" x={value === undefined ? 3 : 0} y={value === undefined ? 15.5 : 0} fill={color} fontSize={14}>{text}</text>
  </Group>;
}

export function FrequencyGraph({ graphRef, baselineTransitionRef, curves, models, zoom, center, smoothing, inspect, labels, baselineKey, highlighted, onHighlight, tutorial, tutorialHover, rangePreset }: FrequencyGraphProps) {
  const [pan, setPan] = useState(0), [span, setSpan] = useState(55.5);
  const drag = useRef<{ y: number; pan: number; span: number; scale: boolean } | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number; index: number } | null>(null);
  const [xFrom, xTo] = useAnimatedRange(...zoomRanges[zoom]);
  const { curves: displayedCurves, low, high, transforming, finishBaseline } = useAnimatedGraphView(curves, baselineKey, center + pan - span * 30.5 / 55.5, center + pan + span * 25 / 55.5);
  useImperativeHandle(baselineTransitionRef, () => finishBaseline, [finishBaseline]);
  const { renderedCurves, activeCurveIds, finishExit } = useCurvePresence(displayedCurves);
  const x = useMemo(() => createFrequencyScale(xFrom, xTo), [xFrom, xTo]);
  const y = useMemo(() => createDecibelScale(low, high), [low, high]);
  const hiddenBaseline = models.find((model) => model.key === baselineKey && model.hidden);
  const interact = (event: PointerEvent<SVGRectElement>) => {
    const point = localPoint(event.currentTarget, event);
    if (!point) return;
    const index = nearestFrequencyIndex(frequencies, x.invert(point.x));
    setPointer({ ...point, index });
    if (inspect) return;
    let closest: string | null = null, distance = 30 * 800 / graphRef.current!.getBoundingClientRect().width;
    for (const curve of displayedCurves) for (let i = Math.max(0, index - 8); i < Math.min(curve.points.length, index + 9); i++) {
      const next = Math.hypot(x(curve.points[i][0]) - point.x, y(curve.points[i][1]) - point.y);
      if (next < distance) { closest = curve.modelKey; distance = next; }
    }
    onHighlight(closest);
  };
  const startDrag = (event: PointerEvent<SVGElement>, scale: boolean) => {
    event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { y: event.clientY, pan, span, scale };
  };
  const moveDrag = (event: PointerEvent<SVGElement>) => {
    if (!drag.current) return;
    const delta = (event.clientY - drag.current.y) * 346 / graphRef.current!.getBoundingClientRect().height;
    if (drag.current.scale) setSpan(Math.min(150, Math.max(10, drag.current.span + delta * 0.25)));
    else setPan(drag.current.pan + delta * span / 304);
  };
  const finishDrag = (event: PointerEvent<SVGElement>) => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); };
  const inspected = pointer && inspect ? displayedCurves.map((curve) => ({ curve, value: curve.points[pointer.index]?.[1] ?? 0 })).sort((a, b) => b.value - a.value) : [];
  let lastInspectionY = 18;
  const leftFade = zoom === 1 || zoom === 2 ? 30 : 7, rightFade = zoom === 0 || zoom === 1 ? 30 : 7;
  return <>
    {rangePreset.display === "highlight" && <div className="tutorial-overlay pointer-events-none absolute inset-0 z-1 box-border flex items-center overflow-hidden pt-[1%] pr-[1.8%] pb-[3.2%] pl-[1.9%]">{rangePreset.ranges.map((definition, index) => <div key={definition.id} className="overlay-segment box-border h-full shrink-0 grow-0 bg-(--accent-color) opacity-0" style={{ flexBasis: definition.width ?? `${Math.log10(definition.to / definition.from) / 3 * 100}%`, opacity: tutorial === index ? 0.1 : tutorial === null && tutorialHover === index ? 0.05 : 0 }} />)}</div>}
    <svg ref={graphRef} data-baseline-transition={transforming ? "true" : undefined} className="pointer-events-none relative w-full bg-(--background-color-graph) font-mono text-(--font-color-primary)" id="fr-graph" viewBox="0 0 800 346" role="img" aria-label="Frequency response graph, 20 Hz to 20 kHz">
      <RectClipPath id="plot-clip" x={dimensions.left} y={dimensions.top} width={dimensions.right - dimensions.left} height={dimensions.bottom - dimensions.top} />
      <LinearGradient id="fade-left" from="black" to="white" vertical={false} />
      <LinearGradient id="fade-right" from="white" to="black" vertical={false} />
      <defs><mask id="graphFade" maskUnits="userSpaceOnUse"><Bar x={15} y={10} width={770} height={314} fill="white" /><Bar x={15} y={10} width={leftFade} height={314} fill="url(#fade-left)" /><Bar x={785 - rightFade} y={10} width={rightFade} height={314} fill="url(#fade-right)" /></mask></defs>
      <Bar className="graphBackground opacity-0" x={0} y={2} width={800} height={338} rx={4} />
      <GraphAxes xScale={x} yScale={y} />
      {rangePreset.display === "bands" && <FrequencyRangeOverlay preset={rangePreset} scale={x} selected={tutorial} hovered={tutorialHover} />}
      <Group className="graph-curves" fill="none" strokeWidth={2.3} mask="url(#graphFade)" clipPath="url(#plot-clip)">{renderedCurves.map((curve) => <GraphCurvePath key={curve.id} curve={curve} xScale={x} yScale={y} smoothing={smoothing} present={activeCurveIds.has(curve.id)} highlighted={highlighted === curve.modelKey} onExit={finishExit} />)}</Group>
      <Group className="dBScaler pointer-events-auto cursor-ns-resize touch-none fill-(--background-color-contrast-more)" onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} onClick={(event) => event.stopPropagation()}>
        <Group left={6} top={y(center)}>
          <path d="M9.9 -1V-55h-1l-1 1.5-2.1-2H.2V-54q7-2 8 7v18c1 16-10 15-10 14V-1M9.9 1V55h-1l-1-1.5-2.1 2H.2V54q7 2 8-7V29c1-16-10-15-10-14V1" />
          {[10,7,13].map((height, index) => <Bar key={index} x={index * 2.8} y={-height} width={0.8} height={height * 2} fill="var(--background-color-graph)" />)}
          <Bar className="outline-none" x={-6} y={-18} width={16} height={36} fill="transparent" role="slider" aria-label="Move dB axis" aria-valuenow={Math.round(center + pan)} tabIndex={0} onKeyDown={(event) => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); setPan(pan + (event.key === "ArrowUp" ? 1 : -1)); } }} onPointerDown={(event) => startDrag(event, false)} />
          {[-1, 1].map((side) => <Circle key={side} cx={5} cy={55 * side} r={9} fill="transparent" onPointerDown={(event) => startDrag(event, true)} />)}
        </Group>
      </Group>
      <Bar className="graph-interaction pointer-events-auto" x={15} y={10} width={770} height={314} fill="transparent" onPointerMove={interact} onPointerLeave={() => { setPointer(null); onHighlight(null); }} />
      {labels && curves.map((curve, index) => <GraphLabel key={curve.id} name={curve.name} color={curve.color} x={500} y={Math.max(30, 296 - (curves.length - 1 - index) * 22)} />)}
      {labels && hiddenBaseline && <GraphLabel name={`Baseline: ${hiddenBaseline.fullName}`} color="#888" x={240} y={318} />}
      {inspect && pointer && <Group className="inspector">
        <Line className="stroke-(--background-color-contrast-more)" from={{ x: x(frequencies[pointer.index]), y: 10 }} to={{ x: x(frequencies[pointer.index]), y: 324 }} shapeRendering="auto" />
        <text className="insp_dB fill-(--background-color-contrast-more)" x={Math.min(715, x(frequencies[pointer.index]) + 2)} y={18} fontSize={12}>{frequencies[pointer.index]} Hz</text>
        {inspected.map(({ curve, value }) => { const position = Math.max(lastInspectionY + 21, Math.min(312, y(value))); lastInspectionY = position; return <GraphLabel key={curve.id} name={curve.name} color={curve.color} x={x(frequencies[pointer.index]) + 4} y={position} value={value} />; })}
      </Group>}
    </svg>
  </>;
}
