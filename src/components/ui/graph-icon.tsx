"use client";

import { memo, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import type { Icon, IconProps } from "@phosphor-icons/react";
import { MorphIcon } from "morphicons/react";
import { useIconMorphProgress } from "@/src/lib/graphtool/animation";
import { getMorphSource, graphIcons, type GraphIconName } from "@/src/lib/graphtool/icons";

export type { GraphIconName } from "@/src/lib/graphtool/icons";

interface GraphIconProps extends Omit<IconProps, "ref" | "size"> {
  name: GraphIconName;
  small?: boolean;
  size?: number;
  morphTo?: GraphIconName;
  active?: boolean;
}

export const GraphIcon = memo(function GraphIcon({ name, className = "", small = false, size = small ? 16 : 20, morphTo, active = false, weight = "regular", ...props }: GraphIconProps) {
  const Icon = graphIcons[name];
  const iconClass = `graph-icon pointer-events-none block shrink-0 ${className}`;
  if (morphTo) return <PhosphorMorphIcon {...props} from={Icon} to={graphIcons[morphTo]} active={active} size={size} weight={weight}
    className={iconClass} aria-hidden="true" focusable="false" />;
  return <Icon {...props} size={size} weight={weight} className={iconClass} aria-hidden="true" focusable="false" data-icon-library="phosphor" />;
});

const serverSnapshot = () => undefined;

function PhosphorMorphIcon({ from: From, to: To, active, weight = "regular", size, ...props }: Omit<IconProps, "ref" | "from" | "to"> & { from: Icon; to: Icon; active: boolean }) {
  const fromSource = getMorphSource(From, weight), toSource = getMorphSource(To, weight);
  // Stable, per-icon subscriptions avoid notifying every row when an unrelated
  // icon finishes preparing, and share parsing/WASM setup across all instances.
  const from = useSyncExternalStore(fromSource.subscribe, fromSource.getSnapshot, serverSnapshot);
  const to = useSyncExternalStore(toSource.subscribe, toSource.getSnapshot, serverSnapshot);
  const fromRef = useRef<SVGSVGElement>(null), toRef = useRef<SVGSVGElement>(null);
  const progress = useIconMorphProgress(active);

  useLayoutEffect(() => {
    if (fromRef.current) void fromSource.prepare(fromRef.current.outerHTML);
    if (toRef.current) void toSource.prepare(toRef.current.outerHTML);
  }, [fromSource, toSource]);

  if (from && to) return <MorphIcon {...props} from={from} to={to} progress={progress}
    spring="smooth" reducedMotion="user" size={size} strokeWidth={2} data-icon-library="phosphor" data-morph-ready="true" />;

  // Keep the real Phosphor endpoint visible during SSR/hydration and WASM setup.
  const Current = active ? To : From;
  return <>
    <Current {...props} size={size} weight={weight} fill="currentColor" stroke="none" strokeWidth={2}
      aria-hidden="true" focusable="false" data-icon-library="phosphor" />
    <span hidden aria-hidden="true" data-phosphor-source="">
      <From ref={fromRef} weight={weight} /><To ref={toRef} weight={weight} />
    </span>
  </>;
}
