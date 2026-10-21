"use client";

import { useId } from "react";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import { GraphIcon } from "./graph-icon";

function CloseNoticeIcon() {
  return <GraphIcon name="remove" size={18} />;
}

export function NoticeAlert({ message, onClose }: { message: string; onClose: () => void }) {
  const titleId = useId();
  return <Snackbar key={message} open={Boolean(message)} onClose={onClose} autoHideDuration={null} anchorOrigin={{ vertical: "top", horizontal: "center" }} transitionDuration={0}
    slotProps={{ transition: { appear: false } }}
    sx={{ top: "max(16px, env(safe-area-inset-top))", left: { xs: "16px", sm: "50%" }, right: { xs: "16px", sm: "auto" }, width: { xs: "auto", sm: "min(560px, calc(100vw - 32px))" }, maxWidth: "calc(100vw - 32px)" }}>
    <Alert severity="error" variant="filled" onClose={onClose} closeText="Dismiss notification" className="notice-alert" aria-labelledby={titleId} icon={<GraphIcon name="warning" size={22} />}
      slots={{ closeIcon: CloseNoticeIcon }}
      slotProps={{ closeButton: { disableRipple: true, sx: { transition: "none", "&.Mui-focusVisible": { outline: "2px solid currentColor", outlineOffset: "2px" } } } }}
      sx={{ boxSizing: "border-box", width: "100%", fontSize: "14px", lineHeight: 1.6, "& .MuiAlert-message": { minWidth: 0, whiteSpace: "pre-line", overflowWrap: "anywhere", maxHeight: "calc(100dvh - 80px)", overflowY: "auto" } }}>
      {message}
    </Alert>
  </Snackbar>;
}
