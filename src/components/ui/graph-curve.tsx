"use client";

import { useId, useMemo, useRef } from "react";
import { Bar, LinePath } from "@visx/shape";
import { curveCardinal, curveNatural } from "@visx/curve";
import { useCurveReveal } from "@/src/lib/graphtool/animation";
import { graphDimensions } from "@/src/lib/graphtool/graph";
import type { GraphCurve } from "@/src/lib/graphtool/types";

interface GraphCurvePathProps {
  curve: GraphCurve;
  xScale: (frequency: number) => number;
  yScale: (spl: number) => number;
  smoothing: number;
  present: boolean;
  highlighted: boolean;
  onExit: (id: string) => void;
}

export function GraphCurvePath({ curve, xScale, yScale, smoothing, present, highlighted, onExit }: GraphCurvePathProps) {
  const clipId = `curve-reveal-${useId().replace(/:/g, "")}`;
  const reveal = useRef<SVGRectElement>(null);
  const interpolation = useMemo(() => smoothing ? curveNatural : curveCardinal.tension(0.5), [smoothing]);
  useCurveReveal(reveal, present, graphDimensions.right - graphDimensions.left, curve.id, onExit);
  return <>
    {/* A separate reveal clip preserves the target's dashed stroke throughout. */}
    <defs data-curve-reveal={clipId}>
      <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
        <Bar innerRef={reveal} x={graphDimensions.left} y={0} width={0} height={graphDimensions.height} fill="white" />
      </clipPath>
    </defs>
    <LinePath data={curve.points} x={(point) => xScale(point[0])} y={(point) => yScale(point[1])} curve={interpolation}
      fill="none" strokeLinecap="butt" stroke={curve.color} strokeDasharray={curve.isTarget ? "6, 3" : undefined} strokeWidth={highlighted ? 3.5 : 2.3}
      clipPath={`url(#${clipId})`} data-curve-reveal={clipId} data-curve-id={curve.id} data-curve-exiting={present ? undefined : "true"}
      className={`${curve.isTarget ? "target" : "response"}${highlighted ? " highlight" : ""}`} />
  </>;
}
