"use client";

import type { ButtonHTMLAttributes } from "react";
import MuiButton from "@mui/material/Button";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  compact?: boolean;
  panel?: boolean;
  layout?: "auto" | "half" | "full";
}

const layouts = { auto: "flex-[auto_1_1]", half: "flex-[calc(50%-2px)_0_0]", full: "flex-[100%_0_0]" };

export function Button({ className = "", compact = false, panel = false, layout = "auto", ...props }: ButtonProps) {
  return <MuiButton {...props} variant="outlined" disableRipple disableElevation
    sx={{ minWidth: 0, letterSpacing: "normal", textTransform: "none", transition: "none", boxShadow: "none", verticalAlign: "baseline", "&.Mui-disabled": { color: "var(--accent-color-contrast)", borderColor: "var(--background-color-contrast-more)" } }}
    className={`box-border m-0 cursor-pointer rounded-md border border-solid border-(--background-color-contrast-more) bg-(--background-color) py-2.75 font-sans text-[12px] leading-none font-normal whitespace-nowrap text-(--accent-color-contrast) outline-none aria-pressed:border-(--accent-color) aria-pressed:bg-(--accent-color) aria-pressed:text-(--font-color-secondary) ${compact ? "px-2" : "px-4"} ${panel ? `mb-1 capitalize ${layouts[layout]}` : ""} ${className}`} />;
}
