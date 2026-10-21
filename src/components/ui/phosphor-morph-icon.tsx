"use client";

import { useLayoutEffect, useRef, useSyncExternalStore, type SVGProps } from "react";
import type { Icon, IconWeight } from "@phosphor-icons/react";
import { MorphIcon } from "morphicons/react";
import { useIconMorphProgress } from "@/src/lib/graphtool/animation";
import { cachePhosphorIcon, getPhosphorIconData, subscribePhosphorIcons } from "@/src/lib/graphtool/phosphor-icons";

interface PhosphorMorphIconProps extends Omit<SVGProps<SVGSVGElement>, "ref" | "from" | "to"> {
  from: Icon;
  to: Icon;
  active: boolean;
  weight?: IconWeight;
  size?: number;
}

const serverSnapshot = () => undefined;

export function PhosphorMorphIcon({ from: From, to: To, active, weight = "regular", size = 16, ...props }: PhosphorMorphIconProps) {
  const from = useSyncExternalStore(subscribePhosphorIcons, () => getPhosphorIconData(From, weight), serverSnapshot);
  const to = useSyncExternalStore(subscribePhosphorIcons, () => getPhosphorIconData(To, weight), serverSnapshot);
  const fromRef = useRef<SVGSVGElement>(null), toRef = useRef<SVGSVGElement>(null);
  const progress = useIconMorphProgress(active);

  useLayoutEffect(() => {
    if (fromRef.current) void cachePhosphorIcon(From, weight, fromRef.current.outerHTML);
    if (toRef.current) void cachePhosphorIcon(To, weight, toRef.current.outerHTML);
  }, [From, To, weight, from, to]);

  if (from && to) return <MorphIcon {...props} from={from} to={to} progress={progress}
    spring="smooth" reducedMotion="user" size={size} strokeWidth={2} data-icon-library="phosphor" data-morph-ready="true" />;

  // SSR and the first hydration frame use the actual Phosphor component. The
  // same icon remains visible while its two library-rendered endpoints are read.
  const Current = active ? To : From;
  return <>
    <Current {...props} size={size} weight={weight} fill="currentColor" stroke="none" strokeWidth={2}
      aria-hidden="true" focusable="false" data-icon-library="phosphor" />
    <span hidden aria-hidden="true" data-phosphor-source="">
      <From ref={fromRef} weight={weight} /><To ref={toRef} weight={weight} />
    </span>
  </>;
}
