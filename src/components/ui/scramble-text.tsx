"use client";

import { useRef } from "react";
import { useScrambleText } from "@/src/lib/graphtool/text-motion";

export function ScrambleText({ text, active }: { text: string; active: boolean }) {
  const root = useRef<HTMLSpanElement>(null);
  useScrambleText(root, text, active);

  return <span ref={root} className="group/scramble relative block">
    <span data-scramble-text className="group-data-[scrambling=true]/scramble:text-transparent">{text}</span>
    <span data-scramble-visual aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" />
  </span>;
}
