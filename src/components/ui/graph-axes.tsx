"use client";

import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridColumns, GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { Line } from "@visx/shape";
import { graphDimensions as dimensions, xTicks } from "@/src/lib/graphtool/graph";
import { decibelTicks, type DecibelScale, type FrequencyScale } from "@/src/lib/graphtool/graph-scales";

interface GraphAxesProps {
  xScale: FrequencyScale;
  yScale: DecibelScale;
}

export function GraphAxes({ xScale, yScale }: GraphAxesProps) {
  const [low, high] = yScale.domain();
  const yTicks = decibelTicks(low, high);
  const visibleXTicks = xTicks.filter((frequency) => xScale(frequency) >= dimensions.left - 1 && xScale(frequency) <= dimensions.right + 1);

  // Custom renderers retain the legacy label placement and per-tick line weights.
  return <>
    <AxisLeft axisClassName="y-axis fill-current" scale={yScale} tickValues={yTicks} tickFormat={String} hideAxisLine hideTicks>
      {({ ticks }) => <>
        <GridRows className="graph-grid" scale={yScale} tickValues={yTicks} left={dimensions.left} width={dimensions.right - dimensions.left}>
          {({ lines }) => lines.map(({ index, from, to }) => <Line key={yTicks[index]} from={from} to={to} shapeRendering="auto"
            className="stroke-(--background-color-contrast-more) blur-[0.8px]" strokeWidth={yTicks[index] % 5 ? 0.12 : 0.27} />)}
        </GridRows>
        {ticks.map(({ value, from, formattedValue }) => <Group className="tick visx-axis-tick" key={Number(value)} top={from.y}>
          {Number(value) % 5 === 0 && <text x={18} dy={-2} fontSize={10}>{formattedValue}</text>}
        </Group>)}
        <text transform="rotate(-90)" x={-10} y={13} fontSize={10} textAnchor="end" fill="currentColor">dB</text>
      </>}
    </AxisLeft>
    <AxisBottom axisClassName="x-axis fill-current" scale={xScale} top={dimensions.top} tickValues={visibleXTicks} hideAxisLine hideTicks
      tickFormat={(value) => { const frequency = Number(value); return frequency === 20 ? "20Hz" : frequency === 20000 ? "20kHz" : frequency >= 1000 ? `${frequency / 1000}k` : String(frequency); }}>
      {({ ticks }) => <>
        <GridColumns className="graph-grid" scale={xScale} tickValues={visibleXTicks} height={317}>
          {({ lines }) => lines.map(({ index, from, to }) => {
            const originalIndex = xTicks.indexOf(visibleXTicks[index]);
            const thickness = originalIndex === 0 || originalIndex === 24 ? 1.5 : originalIndex % 8 === 0 ? 0.9 : originalIndex % 8 === 6 ? 0.4 : originalIndex % 8 === 3 ? 0.4 : 0.2;
            return <Line key={visibleXTicks[index]} from={from} to={to} shapeRendering="auto" className="stroke-(--background-color-contrast-more)" strokeWidth={thickness} />;
          })}
        </GridColumns>
        {ticks.map(({ value, from, formattedValue }) => {
          const index = xTicks.indexOf(Number(value));
          const minor = [1, 2, 4, 5, 7].includes(index % 8);
          return <Group className="tick visx-axis-tick" key={Number(value)} left={from.x}>
            <text y={320} dy="0.71em" textAnchor="middle" fontSize={minor ? 8.6 : 10} dx={index === 0 ? 4 : index === 24 ? -5 : 0}>{formattedValue}</text>
          </Group>;
        })}
      </>}
    </AxisBottom>
  </>;
}
