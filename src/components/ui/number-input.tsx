"use client";

import { useState, type InputHTMLAttributes } from "react";
import InputBase from "@mui/material/InputBase";
import { roundFilterValue } from "@/src/lib/graphtool/filter-values";

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number;
  onValueChange: (value: number) => void;
  variant?: "normalize" | "smooth" | "offset" | "filter" | "settings" | "convolution";
  decimalPlaces?: number;
}

const variants = {
  normalize: "order-2 h-9 w-[70px] rounded-none border-[var(--background-color-contrast-more)] [border-width:1px_0] py-[10px] px-0 font-mono text-[11px] leading-none text-center",
  smooth: "h-9 w-[70px] rounded-l-[6px] rounded-r-none border-[var(--background-color-contrast-more)] [border-width:1px_0_1px_1px] py-[10px] px-0 font-mono text-[11px] leading-none text-center",
  offset: "h-9 w-[70px] rounded-[6px] border border-[var(--background-color-contrast-more)] pt-[11px] pr-[6px] pb-[11px] pl-0 font-mono text-[11px] leading-none text-center",
  filter: "h-[25px] w-full rounded-[6px] border border-[var(--background-color-contrast)] px-2 py-[5px] font-sans text-[12px] leading-[15px]",
  settings: "h-[26px] w-full rounded-[6px] border border-[var(--background-color-contrast)] px-2 py-[5px] font-sans text-[12px] leading-[normal]",
  convolution: "h-7 w-full rounded-[4px] border border-[var(--background-color-contrast)] px-2 py-1 font-sans text-[12px] leading-[normal]",
};

// Keep an editable draft so users can clear a number or type a leading minus.
export function NumberInput({ value, onValueChange, variant = "settings", className = "", decimalPlaces, ...props }: NumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [previous, setPrevious] = useState(value);
  if (value !== previous) { setPrevious(value); setDraft(null); }
  const toolbar = variant === "normalize" || variant === "smooth" || variant === "offset";
  return <InputBase type="number" value={draft ?? value} disabled={props.disabled} disableInjectingGlobalStyles
    sx={{
      minWidth: 0, width: toolbar ? "70px" : "100%", order: variant === "normalize" ? 2 : undefined, fontSize: "inherit", lineHeight: 1, letterSpacing: "normal",
      "& input": {
        animation: "none", appearance: "textfield", MozAppearance: "textfield",
        "&::-webkit-inner-spin-button, &::-webkit-outer-spin-button": { WebkitAppearance: "none", margin: 0 },
        "&:-webkit-autofill": { animation: "none" },
      },
    }}
    slotProps={{ input: {
      ...props, inputMode: "decimal",
      className: `box-border border-solid bg-[var(--background-color-inputs)] text-[var(--font-color-inputs)] outline-none ${variants[variant]} ${className}`,
      onFocus: (event) => { event.currentTarget.select(); props.onFocus?.(event); },
      onChange: (event) => {
        const input = event.currentTarget;
        setDraft(input.value);
        if (input.value === "" || !Number.isFinite(input.valueAsNumber)) return;
        // Validate the rounded value, so extra pasted decimals are not rejected
        // solely because the original draft does not match step=0.1.
        const candidate = decimalPlaces === undefined ? input : input.cloneNode() as HTMLInputElement;
        if (decimalPlaces !== undefined) candidate.value = String(roundFilterValue(input.valueAsNumber, decimalPlaces));
        if (candidate.validity.valid) onValueChange(candidate.valueAsNumber);
      },
      onBlur: (event) => { setDraft(null); props.onBlur?.(event); },
      onKeyDown: (event) => { if (event.key === "Enter") event.currentTarget.blur(); props.onKeyDown?.(event); },
    } }}
  />;
}
