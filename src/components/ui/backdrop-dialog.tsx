"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import Backdrop from "@mui/material/Backdrop";
import Modal from "@mui/material/Modal";
import { Button } from "./button";

export function BackdropDialog({ id: dialogId, open, title, children, onClose, wide = false, maxWidth, className = "" }: {
  id?: string; open: boolean; title: string; children: ReactNode; onClose: () => void; wide?: boolean; maxWidth?: CSSProperties["maxWidth"]; className?: string;
}) {
  const id = useId();
  return <Modal open={open} onClose={onClose} disableScrollLock slots={{ backdrop: Backdrop }}
    slotProps={{ backdrop: { transitionDuration: 0, sx: { zIndex: -1, backgroundColor: "#0009" } } }}
    className="grid place-items-center p-4">
    <div id={dialogId} style={{ maxWidth }} className={`box-border max-h-[calc(100dvh-32px)] w-full overflow-y-auto rounded-md border border-solid border-(--background-color-contrast-more) bg-(--background-color) p-6 font-sans text-[14px] leading-[1.6] text-(--font-color-primary) outline-none ${wide ? "max-w-140" : "max-w-105"} ${className}`}
      role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-content`} tabIndex={-1}>
      <h2 id={`${id}-title`} className="m-0 mb-3 text-[18px]">{title}</h2>
      <div id={`${id}-content`}>{children}</div>
      <div className="mt-4 flex justify-end"><Button onClick={onClose}>OK</Button></div>
    </div>
  </Modal>;
}
