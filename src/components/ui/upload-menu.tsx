"use client";

import { useId, useRef, useState } from "react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import type { GraphToolController } from "@/src/lib/graphtool/use-graph-tool";
import { Button } from "./button";
import { GraphIcon } from "./graph-icon";

export function UploadMenu({ upload }: { upload: GraphToolController["upload"] }) {
  const id = useId();
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const target = useRef(false);
  const choose = (isTarget: boolean) => {
    target.current = isTarget;
    setAnchor(null);
    input.current?.click();
  };
  return <>
    <Button id={`upload-${id}`} compact className="upload-menu h-9 shrink-0 gap-1.5" aria-haspopup="menu" aria-expanded={!!anchor} aria-controls={anchor ? `upload-options-${id}` : undefined} onClick={(event) => setAnchor(event.currentTarget)}>
      <GraphIcon name="upload" size={16} />Upload
    </Button>
    <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} transitionDuration={0} disableScrollLock
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}
      slotProps={{
        paper: { elevation: 0, sx: { mt: "4px", maxWidth: "calc(100vw - 16px)", border: "1px solid var(--background-color-contrast-more)", borderRadius: "6px", backgroundColor: "var(--background-color-inputs)", color: "var(--font-color-primary)", backgroundImage: "none", boxShadow: "0 4px 12px #0003" } },
        list: { id: `upload-options-${id}`, "aria-labelledby": `upload-${id}`, dense: true, sx: { p: "4px", outline: "none" } },
      }}>
      {[{ label: "Upload FR", target: false }, { label: "Upload Target", target: true }].map((option) => <MenuItem key={option.label} disableRipple onClick={() => choose(option.target)}
        sx={{ minHeight: "28px", borderRadius: "4px", px: "8px", py: "4px", fontSize: "12px", lineHeight: "20px", fontFamily: "var(--font-primary)", transition: "none", "&:hover, &.Mui-focusVisible": { backgroundColor: "color-mix(in srgb, var(--background-color-inputs) 88%, var(--font-color-primary))" } }}>{option.label}</MenuItem>)}
      <li role="presentation" className="px-2 py-1 text-[10px] leading-normal text-(--font-color-inputs)">Uploads last for this session only.</li>
    </Menu>
    <input ref={input} hidden type="file" id="file-fr" accept=".csv,.txt" onChange={(event) => {
      const file = event.currentTarget.files?.[0];
      if (file) void upload(file, target.current);
      event.currentTarget.value = "";
    }} />
  </>;
}
