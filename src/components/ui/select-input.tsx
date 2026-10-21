"use client";

import { useId, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import ButtonBase from "@mui/material/ButtonBase";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { SelectChevronContext, SelectChevronIcon } from "./select-chevron-icon";
import { GraphIcon } from "./graph-icon";

interface SelectInputProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type" | "value" | "onChange" | "onClick"> {
  variant?: "model" | "filter" | "convolution" | "channel" | "range";
  value: string | number;
  options: readonly { value: string | number; label: string; disabled?: boolean; icon?: ReactNode }[];
  onValueChange: (value: string) => void;
}

const variants = {
  model: "h-[34px] rounded-[6px] border-[var(--background-color-contrast-more)] pr-8 pl-[10px] py-2 text-[var(--font-color-primary)]",
  filter: "h-[25px] appearance-none rounded-[6px] border-[var(--background-color-contrast)] pr-[18px] pl-[6px] py-0 leading-[25px] text-[var(--font-color-inputs)]",
  convolution: "h-7 rounded-[4px] border-[var(--background-color-contrast)] pr-7 pl-2 py-1 text-[var(--font-color-inputs)]",
  channel: "h-7 rounded-[4px] border-[var(--background-color-contrast)] pr-7 pl-2 py-1 text-[var(--font-color-inputs)]",
  range: "h-full rounded-none border-0 border-l border-(--background-color-contrast) pr-8 pl-4 py-2.5 text-(--font-color-primary)",
};

export function SelectInput({ variant = "model", options, className = "", value, onValueChange, name, disabled, id, onKeyDown, ...props }: SelectInputProps) {
  const generatedId = useId();
  const triggerId = id ?? `select-${generatedId}`;
  const menuId = `${triggerId}-menu`;
  const [anchor, setAnchor] = useState<{ element: HTMLButtonElement; width: number } | null>(null);
  const open = anchor !== null;
  const filter = variant === "filter";
  const range = variant === "range";
  const selectedValue = String(value);
  const selected = options.find((option) => String(option.value) === selectedValue);
  const valueId = `${triggerId}-value`;
  const description = [props["aria-describedby"], selectedValue ? valueId : undefined].filter(Boolean).join(" ") || undefined;
  const showMenu = (element: HTMLButtonElement) => setAnchor({ element, width: element.getBoundingClientRect().width });
  const closeMenu = () => setAnchor(null);
  const iconColor = filter ? "text-(--background-color-contrast-more) dark:text-(--font-color-inputs)" : variant === "model" || range ? "text-(--font-color-primary)" : "text-(--font-color-inputs)";

  return <SelectChevronContext value={{ open, filled: filter }}>
    <ButtonBase {...props} id={triggerId} type="button" disabled={disabled} disableRipple
      data-select-trigger="" data-value={selectedValue}
      aria-haspopup="menu" aria-expanded={open} aria-controls={open ? `${menuId}-list` : undefined} aria-describedby={description}
      onClick={(event) => showMenu(event.currentTarget)}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (!event.defaultPrevented && (event.key === "ArrowDown" || event.key === "ArrowUp")) { event.preventDefault(); showMenu(event.currentTarget); }
      }}
      sx={{ minWidth: 0, flex: filter ? "1 1 auto" : undefined, transition: "none", letterSpacing: "normal" }}
      className={`select-input-trigger relative m-0 box-border flex w-full min-w-0 justify-start border border-solid ${range ? "bg-(--background-color-graph)" : "bg-(--background-color-inputs)"} text-left font-sans text-[12px] leading-[normal] outline-none ${variants[variant]} ${className}`}>
      {selected?.icon && <span className="select-trigger-icon mr-2 flex size-4 shrink-0 items-center justify-center" aria-hidden="true">{selected.icon}</span>}
      <span id={valueId} className="block min-w-0 flex-1 truncate">{selected?.label ?? options[0]?.label ?? ""}</span>
      <SelectChevronIcon className={`absolute ${filter ? "right-px top-[calc(50%-7px)]" : variant === "model" ? "right-2.25 top-[calc(50%-8px)]" : "right-1.25 top-[calc(50%-8px)]"} ${iconColor}`} />
    </ButtonBase>
    {name && <input type="hidden" name={name} value={selectedValue} disabled={disabled} />}
    <Menu id={menuId} anchorEl={anchor?.element ?? null} open={open} onClose={closeMenu}
      anchorOrigin={{ vertical: "bottom", horizontal: range ? "right" : "left" }} transformOrigin={{ vertical: "top", horizontal: range ? "right" : "left" }}
      marginThreshold={8} transitionDuration={0} disableScrollLock
      slotProps={{
        paper: {
          elevation: 0,
          sx: { mt: "4px", boxSizing: "border-box", minWidth: Math.max(anchor?.width ?? 0, range ? 220 : 0), maxWidth: "calc(100vw - 16px)", maxHeight: "min(320px, calc(100dvh - 16px))", border: "1px solid var(--background-color-contrast-more)", borderRadius: "6px", backgroundColor: "var(--background-color-inputs)", color: "var(--font-color-primary)", backgroundImage: "none", boxShadow: "0 4px 12px #0003" },
        },
        list: { id: `${menuId}-list`, "aria-labelledby": triggerId, dense: true, sx: { p: "4px", outline: "none" } },
      }}>
      {options.map((option) => {
        const isSelected = String(option.value) === selectedValue;
        return <MenuItem key={option.value} role="menuitemradio" selected={isSelected} aria-checked={isSelected}
        disabled={option.disabled} disableRipple onClick={() => {
          closeMenu();
          const next = String(option.value);
          if (next !== selectedValue) onValueChange(next);
        }}
        sx={{ minHeight: "28px", borderRadius: "4px", px: "8px", py: "4px", fontSize: "12px", lineHeight: "20px", fontFamily: "var(--font-primary)", transition: "none", color: "var(--font-color-primary)", "&.Mui-selected": { backgroundColor: "transparent", color: "var(--font-color-primary)" }, "&:hover, &.Mui-focusVisible, &.Mui-selected:hover, &.Mui-selected.Mui-focusVisible": { backgroundColor: "color-mix(in srgb, var(--background-color-inputs) 88%, var(--font-color-primary))", color: "var(--font-color-primary)" } }}>
        {option.icon && <span className="mr-2 flex size-4 shrink-0 items-center justify-center" aria-hidden="true">{option.icon}</span>}
        <span className="block min-w-0 flex-1 truncate">{option.label}</span>
        <span className="ml-3 flex size-4 shrink-0 items-center justify-center">{isSelected && <GraphIcon name="check" size={16} className="select-option-check" />}</span>
      </MenuItem>;
      })}
    </Menu>
  </SelectChevronContext>;
}
