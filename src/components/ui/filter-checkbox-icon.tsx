"use client";

import { CheckSquare, Square } from "@/src/lib/graphtool/icons";
import { PhosphorMorphIcon } from "./phosphor-morph-icon";

export function FilterCheckboxIcon({ checked }: { checked: boolean }) {
  return <PhosphorMorphIcon from={Square} to={CheckSquare} active={checked} size={20}
    className="filter-checkbox-icon pointer-events-none block shrink-0" />;
}
