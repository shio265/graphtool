"use client";

import { useMemo } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { getDeviceSupportRows, type DeviceSupportStatus } from "@/src/lib/graphtool/device-support";
import { BackdropDialog } from "./backdrop-dialog";

const statusColors: Record<DeviceSupportStatus, string> = {
  Enable: "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Disable: "border-(--background-color-contrast-more) bg-(--background-color-contrast) text-(--font-color-inputs)",
  Experimental: "border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
};

export function DeviceSupportDialog({ id, open, onClose }: { id: string; open: boolean; onClose: () => void }) {
  const devices = useMemo(() => getDeviceSupportRows(), []);
  return <BackdropDialog id={id} open={open} title="Device support list" onClose={onClose} wide maxWidth={960} className="device-support-list">
    <p className="mt-0 mb-3 text-[12px] leading-normal text-(--font-color-inputs)">We tool work with {devices.length} USB/DAC models below, but not all devices are fully supported.</p>
    <TableContainer tabIndex={0} role="region" aria-label="Scrollable device support table" className="device-support-table-container"
      sx={{ maxHeight: "min(440px, calc(100dvh - 280px))", border: "1px solid var(--background-color-contrast-more)", borderRadius: "6px", boxSizing: "border-box" }}>
      <Table stickyHeader size="small" aria-label="USB/DAC EQ support" sx={{
        minWidth: "640px",
        "& .MuiTableCell-root": { px: "12px", py: "10px", fontFamily: "var(--font-primary)", fontSize: "12px", lineHeight: 1.5, color: "var(--font-color-primary)", borderColor: "var(--background-color-contrast)" },
        "& .MuiTableCell-head": { fontWeight: 700, whiteSpace: "nowrap", backgroundColor: "var(--background-color-inputs)" },
        "& .MuiTableBody-root .MuiTableRow-root:last-child .MuiTableCell-root": { borderBottom: 0 },
      }}>
        <caption className="sr-only">USB/DAC EQ bands, supported filter types, config access and SDK support status.</caption>
        <TableHead><TableRow>
          <TableCell scope="col">Device</TableCell>
          <TableCell scope="col" align="right">EQ bands</TableCell>
          <TableCell scope="col">Filter types</TableCell>
          <TableCell scope="col">Config access</TableCell>
          <TableCell scope="col">Status</TableCell>
        </TableRow></TableHead>
        <TableBody>{devices.map((device) => <TableRow key={device.model} data-support-status={device.status.toLowerCase()}>
          <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>{device.model}</TableCell>
          <TableCell align="right">{device.limits.maxFilters}</TableCell>
          <TableCell sx={{ whiteSpace: "nowrap" }}>{device.limits.filterTypes.join(" / ") || "—"}</TableCell>
          <TableCell sx={{ whiteSpace: "nowrap" }}>{device.status === "Disable" ? device.capabilities.supportsRead ? "Read only" : "Unavailable" : device.capabilities.supportsRead ? "Read / Write" : "Write only"}</TableCell>
          <TableCell><span className={`inline-flex rounded-full border border-solid px-2 py-0.5 text-[11px] leading-normal font-semibold whitespace-nowrap ${statusColors[device.status]}`}>{device.status}</span></TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </TableContainer>
    <p className="mt-3 mb-0 text-[11px] leading-normal text-(--font-color-inputs)">Status: Enable: writable EQ available. Disable / Experimental: no writable EQ or device not listed.Write-only devices can save EQ but cannot read config.</p>
  </BackdropDialog>;
}
