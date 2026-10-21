"use client";

import Backdrop from "@mui/material/Backdrop";
import Modal from "@mui/material/Modal";

export function AutoEQBackdrop({ open }: { open: boolean }) {
  return <Modal open={open} disableScrollLock slots={{ backdrop: Backdrop }}
    slotProps={{ backdrop: { transitionDuration: 0, sx: { zIndex: -1, backgroundColor: "#000b" } } }}
    className="autoeq-modal grid place-items-center p-4">
    <div className="extra-eq-overlay box-border p-4 text-center font-sans font-bold text-white outline-none" role="status" aria-live="polite" tabIndex={-1}>
      AutoEQ is running, it could take 5~20 seconds or more.
    </div>
  </Modal>;
}
