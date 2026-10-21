"use client";

import { createContext, useContext, type SVGProps } from "react";
import { CaretDown, CaretUp } from "@/src/lib/graphtool/icons";
import { PhosphorMorphIcon } from "./phosphor-morph-icon";

export const SelectChevronContext = createContext({ open: false, filled: false });

export function SelectChevronIcon({ className = "", ...props }: Omit<SVGProps<SVGSVGElement>, "ref" | "from" | "to">) {
  const { open, filled } = useContext(SelectChevronContext);
  return <PhosphorMorphIcon {...props} from={CaretDown} to={CaretUp} active={open} weight={filled ? "fill" : "regular"} size={filled ? 14 : 16}
    fill={filled ? "currentColor" : "none"} stroke={filled ? "none" : "currentColor"}
    className={`select-chevron-icon pointer-events-none block shrink-0 ${className}`} />;
}
