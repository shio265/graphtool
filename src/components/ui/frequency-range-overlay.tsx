"use client";

import { useId } from "react";
import { Group } from "@visx/group";
import { Bar, Line } from "@visx/shape";
import { frequencyRangeGeometry, type FrequencyRangePreset } from "@/src/lib/graphtool/frequency-ranges";
import { graphDimensions } from "@/src/lib/graphtool/graph";
import type { FrequencyScale } from "@/src/lib/graphtool/graph-scales";

export function FrequencyRangeOverlay({ preset, scale, selected, hovered }: { preset: FrequencyRangePreset; scale: FrequencyScale; selected: number | null; hovered: number | null }) {
  const id = useId().replace(/:/g, "");
  return <Group className="frequency-range-overlay pointer-events-none" data-range-type={preset.id} clipPath="url(#plot-clip)">
    <defs>{preset.ranges.map((range) => <pattern key={range.id} id={`${id}-${range.id}`} patternUnits="userSpaceOnUse" width={6} height={6}>
      <Line from={{ x: 0, y: 6 }} to={{ x: 6, y: 0 }} stroke={range.color ?? "var(--accent-color)"} strokeWidth={1} strokeOpacity={0.3} />
    </pattern>)}</defs>
    {preset.ranges.map((range, index) => {
      const geometry = frequencyRangeGeometry(range, scale);
      if (!geometry) return null;
      const color = range.color ?? "var(--accent-color)", active = selected === index, hover = hovered === index;
      const top = graphDimensions.top, bottom = graphDimensions.bottom, height = bottom - top;
      return <Group key={range.id} className="frequency-range-band" data-range-id={range.id} data-from={range.from} data-to={range.to} data-active={active}>
        <Bar x={geometry.left} y={top} width={geometry.width} height={height} fill={color} fillOpacity={active ? 0.14 : hover ? 0.09 : 0.025} />
        <Bar x={geometry.left} y={top} width={geometry.width} height={height} fill={`url(#${id}-${range.id})`} opacity={active ? 0.9 : hover ? 0.7 : 0.45} />
        <Line from={{ x: geometry.left, y: top }} to={{ x: geometry.left, y: bottom }} stroke={color} strokeWidth={0.8} strokeOpacity={0.8} />
        <Line from={{ x: geometry.right, y: top }} to={{ x: geometry.right, y: bottom }} stroke={color} strokeWidth={0.8} strokeOpacity={0.8} />
        {geometry.width >= range.name.length * 4.5 && <text x={geometry.center} y={bottom - 5} fill={color} textAnchor="middle" fontSize={9} className="font-mono">{range.name}</text>}
      </Group>;
    })}
  </Group>;
}
