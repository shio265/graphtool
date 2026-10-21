import { getSupportedDevices, type DeviceDescription } from "@shio265/moondrop-hid";

export type DeviceSupportStatus = "Enable" | "Disable" | "Experimental";

export function deviceSupportStatus(device: DeviceDescription | null): DeviceSupportStatus {
  if (!device) return "Disable";
  if (device.experimental) return "Experimental";
  return device.limits.maxFilters > 0 && device.limits.filterTypes.length > 0 && device.slots.length > 0 ? "Enable" : "Disable";
}

export function getDeviceSupportRows() {
  return [...getSupportedDevices()].sort((a, b) => a.model.localeCompare(b.model)).map((device) => ({ ...device, status: deviceSupportStatus(device) }));
}
