"use client";

import { Plus, X } from "@/src/lib/graphtool/icons";
import { PhosphorMorphIcon } from "./phosphor-morph-icon";

export function ModelToggleIcon({ active }: { active: boolean }) {
  return <PhosphorMorphIcon from={Plus} to={X} active={active} size={16}
    className="model-toggle-icon pointer-events-none block shrink-0" />;
}
