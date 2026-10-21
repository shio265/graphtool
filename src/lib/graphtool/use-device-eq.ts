"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient, HidError, type Client, type DeviceInfo } from "@shio265/moondrop-hid";
import { deviceEQConfig, deviceEQError } from "./device-eq";
import type { Filter } from "./types";

type DeviceOperation = "connecting" | "loading" | "saving" | "disconnecting";
type DeviceEQNotice = { operation: "Load" | "Save"; severity: "success" | "error" };

export function useDeviceEQ(reportError: (error: unknown) => void, preamp: number) {
  const clientRef = useRef<Client | null>(null);
  const operation = useRef<DeviceOperation | null>(null);
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [busy, setBusy] = useState<DeviceOperation | null>(null);
  const [notice, setNotice] = useState<DeviceEQNotice | null>(null);
  const [slot, setSlot] = useState<number | undefined>();
  const [supportListOpen, setSupportListOpen] = useState(false);

  useEffect(() => {
    const client = createClient(); // Experimental devices remain blocked by the SDK.
    clientRef.current = client;
    const unsubscribe = client.subscribe((event) => {
      if (event.type === "connected") {
        setDevice(event.device);
        setSlot(event.device.slots[0]?.id);
        setNotice(null);
      } else {
        setDevice(null);
        setSlot(undefined);
        setNotice(null);
      }
    });
    return () => {
      unsubscribe();
      if (clientRef.current === client) clientRef.current = null;
      void client.disconnect().catch(() => {});
    };
  }, []);

  // The live client, rather than a render snapshot, also protects delayed imports
  // and AutoEQ callbacks when a device has connected/disconnected in the meantime.
  const getDevice = useCallback(() => clientRef.current?.device ?? null, []);
  const clearNotice = useCallback(() => setNotice(null), []);

  const run = useCallback(async <T,>(name: DeviceOperation, action: (client: Client) => Promise<T>): Promise<T | undefined> => {
    const client = clientRef.current;
    if (!client || operation.current) return;
    operation.current = name;
    setBusy(name);
    setNotice(null);
    try {
      const result = await action(client);
      if (clientRef.current === client) return result;
      // A chooser may finish after the component has unmounted.
      await client.disconnect().catch(() => {});
    } catch (error) {
      if (clientRef.current !== client) return;
      if (error instanceof HidError && (error.code === "UNSUPPORTED_DEVICE" || error.code === "EXPERIMENTAL_DEVICE")) setSupportListOpen(true);
      if (name === "loading" || name === "saving") setNotice({ operation: name === "loading" ? "Load" : "Save", severity: "error" });
      else reportError(deviceEQError(error));
    } finally {
      if (clientRef.current === client) { operation.current = null; setBusy(null); }
    }
  }, [reportError]);

  const connect = useCallback(() => run("connecting", async (client) => {
    // No await before connect(): preserve the browser's user activation.
    return client.connect();
  }), [run]);

  const disconnect = useCallback(() => run("disconnecting", (client) => client.disconnect()), [run]);

  const readConfig = useCallback(() => run("loading", async (client) => {
    const loaded = await client.readConfig();
    if (clientRef.current !== client || !client.connected) return;
    setNotice({ operation: "Load", severity: "success" });
    return loaded;
  }), [run]);

  const writeConfig = useCallback((filters: Filter[]) => run("saving", async (client) => {
    const current = client.device;
    if (!current) throw new Error("Connect a device before saving EQ.");
    const result = await client.writeConfig(deviceEQConfig(filters, current, preamp), { slot });
    if (clientRef.current === client) setNotice({ operation: "Save", severity: "success" });
    return result;
  }), [preamp, run, slot]);

  return { device, busy, notice, clearNotice, slot, setSlot, supportListOpen, setSupportListOpen, getDevice, connect, disconnect, readConfig, writeConfig };
}
