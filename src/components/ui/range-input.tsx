"use client";

import type { InputHTMLAttributes } from "react";
import Slider from "@mui/material/Slider";

interface RangeInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "step"> {
  value: number;
  min: number;
  max: number;
  onValueChange: (value: number) => void;
  step?: number;
}

export function RangeInput({ value, min, max, onValueChange, step = 1, style, className = "", ...props }: RangeInputProps) {
  return <Slider value={value} min={min} max={max} step={step} disabled={props.disabled} name={props.name}
    className={className} style={style} slotProps={{ input: props }}
    sx={{
      display: "block", width: "100%", minWidth: 0, height: "6px", p: 0, m: 0, flex: 1, color: "var(--accent-color)",
      "& .MuiSlider-rail": { height: "6px", opacity: 1, backgroundColor: "var(--background-color-contrast)" },
      "& .MuiSlider-track": { height: "6px", border: 0, transition: "none" },
      "& .MuiSlider-thumb": {
        width: "16px", height: "16px", boxSizing: "border-box", border: "2px solid white", boxShadow: "0 2px 4px #0003", transition: "none",
        "&::before": { boxShadow: "none" },
        "&:hover, &.Mui-active": { boxShadow: "0 2px 4px #0003" },
        "&.Mui-focusVisible": { outline: "2px solid var(--accent-color)", outlineOffset: "2px", boxShadow: "none" },
      },
    }}
    onChange={(_, next) => { if (typeof next === "number") onValueChange(next); }} />;
}
