"use client";

import { useId } from "react";
import Alert from "@mui/material/Alert";
import Tooltip from "@mui/material/Tooltip";
import type { GraphToolController } from "@/src/lib/graphtool/use-graph-tool";
import { Button } from "./button";
import { GraphIcon, type GraphIconName } from "./graph-icon";
import { PanelHeading } from "./panel-heading";
import { SelectInput } from "./select-input";
import { DeviceSupportDialog } from "./device-support-dialog";

function DeviceEQAction({ label, text, icon, disabled, busy, onClick }: { label: string; text: string; icon: GraphIconName; disabled: boolean; busy: boolean; onClick: () => void }) {
  return <Tooltip title={label} describeChild placement="top" slotProps={{
    transition: { timeout: 0 },
    tooltip: { sx: { fontFamily: "var(--font-primary)", fontSize: "11px", lineHeight: 1.5 } },
  }}>
    <span className="flex min-w-0"><Button compact type="button" className="h-9 w-full gap-1" aria-label={label} aria-busy={busy} disabled={disabled} onClick={onClick}>
      <GraphIcon name={icon} size={18} /><span className="device-action-label">{text}</span>
    </Button></span>
  </Tooltip>;
}

function CloseDeviceEQNoticeIcon() {
  return <GraphIcon name="remove" size={16} />;
}

export function DeviceEQPanel({ tool }: { tool: GraphToolController }) {
  const { deviceEQ } = tool;
  const { device, busy, notice, supportListOpen } = deviceEQ;
  const listId = useId();
  const locked = busy !== null || tool.autoEQRunning;
  return <div className="extra-device mb-[1em] text-(--background-color-contrast-more)">
    <PanelHeading>Connect Device</PanelHeading>
    <div className="device-toolbar grid grid-cols-2 gap-x-1">
      {device ? <Button panel compact className="disconnect-device" disabled={locked} onClick={() => { void deviceEQ.disconnect(); }}>Disconnect</Button>
        : <Button panel compact className="connect-device gap-1.5" disabled={locked} onClick={() => { void tool.connectDevice(); }}><GraphIcon name="usb" size={15} />{busy === "connecting" ? "Connecting…" : "Connect USB/DAC"}</Button>}
      <Button panel compact aria-haspopup="dialog" aria-expanded={supportListOpen} aria-controls={supportListOpen ? listId : undefined} onClick={() => deviceEQ.setSupportListOpen(true)}>Support list</Button>
    </div>
    {device && <>
      <div className="device-connection-row my-1 grid min-w-0 grid-cols-2 items-center gap-x-1">
        <p className="device-connection m-0 min-w-0 truncate text-[12px] leading-normal text-(--font-color-primary)" title={`Connected: ${device.model}`}>Connected: {device.model}</p>
        <div className="device-eq-actions grid min-w-0 grid-cols-2 gap-1">
          <DeviceEQAction label="Load EQ" text="Load" icon="load" disabled={locked || !device.capabilities.supportsRead} busy={busy === "loading"} onClick={() => { void tool.loadDeviceConfig(); }} />
          <DeviceEQAction label="Save EQ" text="Save" icon="save" disabled={locked || !device.slots.length} busy={busy === "saving"} onClick={() => { void deviceEQ.writeConfig(tool.filters); }} />
        </div>
      </div>
      {!device.capabilities.supportsRead && <p className="my-1 text-[11px] leading-normal">Write-only device: loading its configuration is not supported.</p>}
      {device.slots.length > 1 && <SelectInput aria-label="Device write slot" value={deviceEQ.slot ?? ""} disabled={locked} options={device.slots.map((slot) => ({ value: slot.id, label: slot.name }))} onValueChange={(value) => deviceEQ.setSlot(Number(value))} />}
      {!device.limits.supportsManualGlobalGain && <p className="my-1 text-[11px] leading-normal">{device.limits.deviceHandlesPregain ? "Preamp is managed by the device." : "Writing preamp is not supported by this device."}</p>}
    </>}
    {notice && <Alert severity={notice.severity} variant="filled" className="device-eq-alert" onClose={deviceEQ.clearNotice} closeText="Dismiss EQ notification"
      icon={<GraphIcon name={notice.severity === "success" ? "success" : "warning"} size={18} />} slots={{ closeIcon: CloseDeviceEQNoticeIcon }}
      slotProps={{ closeButton: { disableRipple: true, sx: { transition: "none" } } }}
      sx={{ my: 1, px: "8px", py: "4px", fontSize: "12px", lineHeight: 1.5, "& .MuiAlert-icon": { py: "4px", mr: "8px" }, "& .MuiAlert-message": { py: "4px", overflowWrap: "anywhere" }, "& .MuiAlert-action": { pt: 0, alignItems: "center" } }}>
      {notice.operation} EQ {notice.severity === "success" ? "successful." : "failed."}
    </Alert>}
    <DeviceSupportDialog id={listId} open={supportListOpen} onClose={() => deviceEQ.setSupportListOpen(false)} />
  </div>;
}
