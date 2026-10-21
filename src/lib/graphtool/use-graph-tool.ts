"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { config, emptyFilter, frequencies } from "./config";
import { targetModels } from "./targets";
import { modelIdentity, sameModel } from "./model-identity";
import { nextColorId } from "./colors";
import { loadResponse, parseUpload } from "./data";
import { enabledFilters, applyEQ, calculatePreamp, defaultAutoEQOptions } from "./equalizer";
import { buildGraphCurves, prepareModels } from "./graph";
import { averageCurves, validChannels } from "./normalization";
import { readSharedModels, sharedModel, updateShareURL } from "./share";
import { activateModel, createActiveModel, removeModel } from "./model-state";
import { deviceAutoEQOptions, deviceBandLimit, eqFilterRanges, limitEQFilters } from "./device-eq";
import { roundEQFilters } from "./filter-values";
import { useDeviceEQ } from "./use-device-eq";
import type { AutoEQRequest } from "./autoeq.worker";
import type { ActiveModel, AutoEQOptions, Filter, Model, Normalization } from "./types";

export function useGraphTool(catalog: Model[]) {
  const [uploaded, setUploaded] = useState<Model[]>([]);
  const [active, setActive] = useState<ActiveModel[]>([]);
  const [normalization, setNormalization] = useState<Normalization>({ ...config.normalization });
  const [smoothing, setSmoothing] = useState<number>(config.smoothing);
  const [baselineKey, setBaselineKey] = useState<string | null>(null);
  const [filters, setFilterState] = useState<Filter[]>(() => Array.from({ length: config.eqBands }, emptyFilter));
  const filtersRef = useRef(filters);
  const [eqModelKey, setEQModelKey] = useState("");
  const [savedAutoEQOptions, setSavedAutoEQOptions] = useState<AutoEQOptions>(defaultAutoEQOptions);
  const [deviceAutoEQSettings, setDeviceAutoEQSettings] = useState<AutoEQOptions | null>(null);
  const [autoEQRunning, setAutoEQRunning] = useState(false);
  const [loading, setLoading] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const colorCounter = useRef(0);
  const savedColors = useRef(new Map<string, number>());
  const exclusiveRequest = useRef({ phone: 0, target: 0 });
  const workerRef = useRef<Worker | null>(null);
  const mounted = useRef(false);

  const models = useMemo(() => [...catalog, ...uploaded], [catalog, uploaded]);
  const prepared = useMemo(() => prepareModels(active, smoothing, normalization), [active, smoothing, normalization]);
  const curves = useMemo(() => buildGraphCurves(prepared, baselineKey), [prepared, baselineKey]);
  const eqModels = useMemo(() => active.filter((model) => !model.isTarget && !model.eqParent), [active]);
  const selectedEQModel = eqModels.find((model) => model.key === eqModelKey);
  const preamp = useMemo(() => calculatePreamp(filters, frequencies), [filters]);

  const reportError = useCallback((error: unknown) => setError(error instanceof Error ? error.message : String(error)), []);
  const deviceEQ = useDeviceEQ(reportError, preamp);
  const { getDevice } = deviceEQ;
  const filterLimit = deviceBandLimit(deviceEQ.device);
  const autoEQOptions = useMemo(() => deviceEQ.device
    ? deviceAutoEQOptions(deviceAutoEQSettings ?? eqFilterRanges(deviceEQ.device.limits), deviceEQ.device.limits)
    : savedAutoEQOptions, [savedAutoEQOptions, deviceAutoEQSettings, deviceEQ.device]);
  const setAutoEQOptions = useCallback((next: AutoEQOptions) => {
    const device = getDevice();
    if (device) setDeviceAutoEQSettings(deviceAutoEQOptions(next, device.limits));
    else setSavedAutoEQOptions(next);
  }, [getDevice]);

  useEffect(() => {
    mounted.current = true;
    const names = readSharedModels(window.location.search);
    const requested = [...new Map(names.map((name) => sharedModel([...catalog, ...targetModels], name))
      .filter((model): model is Model => !!model).map((model) => [modelIdentity(model), model])).values()];
    let cancelled = false;
    Promise.all(requested.map(async (model): Promise<ActiveModel | null> => {
      try {
        return createActiveModel(model, await loadResponse(model), 0);
      } catch (error) { if (!cancelled) reportError(error); return null; }
    })).then((results) => {
      if (cancelled) return;
      let color = 0;
      const loaded = results.filter((model): model is ActiveModel => !!model).map((model) => ({ ...model, colorId: model.isTarget ? -targetModels.findIndex((entry) => sameModel(entry, model)) - 1 : color++ }));
      colorCounter.current = color;
      loaded.forEach((model) => savedColors.current.set(modelIdentity(model), model.colorId));
      const average = loaded.filter((model) => !model.isTarget).length > 1;
      setActive(loaded.map((model) => ({ ...model, mode: average && !model.isTarget ? "average" : "both" })));
      setReady(true);
    });
    return () => { cancelled = true; mounted.current = false; workerRef.current?.terminate(); };
  }, [catalog, reportError]);

  useEffect(() => { if (ready) updateShareURL(active); }, [active, ready]);

  const remove = useCallback((key: string) => {
    setActive((previous) => removeModel(previous, key));
    setBaselineKey((current) => current === key ? null : current);
  }, []);

  const choose = useCallback(async (model: Model, exclusive = true) => {
    const category = model.isTarget ? "target" : "phone";
    const request = exclusive ? ++exclusiveRequest.current[category] : exclusiveRequest.current[category];
    if (model.isTarget && active.some((entry) => sameModel(entry, model))) { remove(active.find((entry) => sameModel(entry, model))!.key); return; }
    setLoading((previous) => [...previous, model.key]);
    try {
      const existing = active.find((entry) => sameModel(entry, model));
      const rawChannels = existing?.rawChannels ?? await loadResponse(model);
      if (!mounted.current || exclusive && request !== exclusiveRequest.current[category]) return;
      const saved = savedColors.current.get(modelIdentity(model));
      const colorId = existing?.colorId ?? saved ?? (model.isTarget ? -targetModels.findIndex((entry) => sameModel(entry, model)) - 1 : nextColorId(colorCounter.current, active.filter((entry) => entry.pinned).map((entry) => entry.colorId)));
      if (!existing && saved === undefined && !model.isTarget) colorCounter.current = colorId + 1;
      savedColors.current.set(modelIdentity(model), colorId);
      const next = existing ?? createActiveModel(model, rawChannels, colorId);
      setActive((previous) => activateModel(previous, next, exclusive));
      setBaselineKey((key) => {
        const baseline = active.find((entry) => entry.key === key);
        return exclusive && baseline && !baseline.pinned && !!baseline.isTarget === !!model.isTarget && key !== existing?.key ? null : key;
      });
    } catch (error) { if (mounted.current) reportError(error); }
    finally { if (mounted.current) setLoading((previous) => previous.filter((key) => key !== model.key)); }
  }, [active, remove, reportError]);

  const patchModel = useCallback((key: string, patch: Partial<Pick<ActiveModel, "mode" | "hidden" | "pinned" | "offset" | "colorId">>) => {
    setActive((previous) => previous.map((model) => model.key === key ? { ...model, ...patch } : model));
  }, []);

  const recolor = useCallback((key?: string) => {
    const colors = new Map(active.filter((model) => !model.isTarget && (!key || model.key === key)).map((model) => [model.key, colorCounter.current++]));
    active.forEach((model) => { if (colors.has(model.key)) savedColors.current.set(modelIdentity(model), colors.get(model.key)!); });
    setActive((previous) => previous.map((model) => colors.has(model.key) ? { ...model, colorId: colors.get(model.key)! } : model));
  }, [active]);

  const changeVariant = useCallback(async (key: string, filename: string, additional = false) => {
    const model = active.find((entry) => entry.key === key);
    const variant = model?.variants?.find((entry) => entry.fileName === filename);
    if (!model || !variant) return;
    const next = { ...model, fileName: filename, name: variant.name, fullName: `${model.brand}${model.collab ? ` x ${model.collab}` : ""} ${variant.name}` };
    if (additional) { await choose({ ...next, key: `${model.key}:${filename}` }, false); return; }
    try {
      const rawChannels = await loadResponse(next);
      if (mounted.current) setActive((previous) => previous.map((entry) => entry.key === key ? { ...next, rawChannels } : entry));
    } catch (error) { reportError(error); }
  }, [active, choose, reportError]);

  const upload = useCallback(async (file: File, isTarget: boolean) => {
    try {
      const curve = parseUpload(await file.text());
      const name = file.name.replace(/\.[^.]+$/, "");
      const fullName = isTarget ? `${name.replace(/ Target$/i, "")} Target` : `Uploaded ${name}`;
      if (isTarget && targetModels.some((model) => model.fullName === fullName)) throw new Error("This target already exists on this tool, please select it instead of upload.");
      const model: ActiveModel = {
        key: `upload:${isTarget ? "target:" : ""}${name}`, brand: isTarget ? "Targets" : "Uploaded", name,
        fullName, fileName: name, isDynamic: true, isTarget,
        rawChannels: !isTarget && / R$/.test(name) ? [null, curve] : [curve],
        colorId: isTarget ? -targetModels.length - 1 : colorCounter.current++, mode: "both", offset: 0, hidden: false, pinned: false,
      };
      if (!isTarget) setUploaded((previous) => [...previous.filter((entry) => entry.key !== model.key), model]);
      setActive((previous) => isTarget ? [model, ...previous.filter((entry) => !entry.isTarget || entry.pinned)] : [...previous.filter((entry) => entry.key !== model.key), model]);
    } catch (error) { reportError(error); }
  }, [reportError]);

  const applyFilters = useCallback((next: Filter[], requestedKey = eqModelKey) => {
    const limit = deviceBandLimit(getDevice());
    const limited = roundEQFilters(limitEQFilters(next, limit));
    if (next.length > limit && next.slice(limit).some((filter) => filter.freq || filter.gain || filter.q)) reportError(new Error(`The current EQ limit is ${limit} bands. Only the first ${limit} bands were kept.`));
    filtersRef.current = limited;
    setFilterState(limited);
    const parent = active.find((model) => model.key === requestedKey && !model.eqParent && !model.isTarget) ?? eqModels[0];
    if (!parent) return;
    const key = `${parent.key}:eq`, existing = active.find((model) => model.key === key);
    if (!enabledFilters(limited).length && !existing) return;
    const eq: ActiveModel = {
      ...parent, ...existing, key, fileName: `${parent.fileName} EQ`, name: `${parent.name} EQ`, fullName: `${parent.fullName} EQ`,
      variants: undefined, isDynamic: true, eqParent: parent.key, mode: existing?.mode ?? "average",
      rawChannels: parent.rawChannels.map((curve) => curve && applyEQ(curve, limited)),
      colorId: existing?.colorId ?? colorCounter.current++, hidden: existing?.hidden ?? false, pinned: existing?.pinned ?? false, offset: existing?.offset ?? 0,
    };
    setActive((previous) => {
      if (!previous.some((model) => model.key === parent.key)) return previous;
      return previous.some((model) => model.key === key) ? previous.map((model) => model.key === key ? eq : model) : [...previous.map((model) => model.key === parent.key ? { ...model, mode: "average" as const } : model), eq];
    });
    if (!requestedKey || !eqModels.some((model) => model.key === requestedKey)) setEQModelKey(parent.key);
  }, [eqModelKey, eqModels, active, getDevice, reportError]);

  const connectDevice = async () => {
    const connected = await deviceEQ.connect();
    if (connected) {
      setDeviceAutoEQSettings(eqFilterRanges(connected.limits));
      applyFilters(filtersRef.current);
    }
  };

  const loadDeviceConfig = async () => {
    const loaded = await deviceEQ.readConfig();
    if (loaded) applyFilters(loaded.filters.map((filter) => ({ ...filter })));
  };

  const selectEQModel = (key: string) => { setEQModelKey(key); if (key) applyFilters(filters, key); };

  const runAutoEQ = () => {
    const parent = prepared.find((model) => model.key === eqModelKey && !model.eqParent) ?? prepared.find((model) => !model.isTarget && !model.eqParent);
    const target = prepared.find((model) => model.isTarget) ?? prepared.find((model) => model.key !== parent?.key && !model.eqParent && !model.isTarget);
    if (!parent || !target) { setError("Please select model and target. If there is no target, the second displayed model will be selected as target."); return; }
    if (autoEQOptions.freqRange[0] > autoEQOptions.freqRange[1] || autoEQOptions.gainRange[0] > autoEQOptions.gainRange[1] || autoEQOptions.qRange[0] > autoEQOptions.qRange[1]) { setError("AutoEQ range minimum must not exceed maximum."); return; }
    setEQModelKey(parent.key);
    setAutoEQRunning(true);
    workerRef.current?.terminate();
    const worker = new Worker(new URL("./autoeq.worker.ts", import.meta.url));
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<{ filters?: Filter[]; error?: string }>) => {
      worker.terminate(); workerRef.current = null;
      if (!mounted.current) return;
      setAutoEQRunning(false);
      if (event.data.error) setError(event.data.error);
      else if (event.data.filters) {
        const generated = [...event.data.filters];
        while (generated.length < filters.length) generated.push(emptyFilter());
        applyFilters(generated, parent.key);
      }
    };
    worker.onerror = () => { worker.terminate(); workerRef.current = null; setAutoEQRunning(false); setError("AutoEQ could not complete. Please try again."); };
    const request: AutoEQRequest = {
      curve: averageCurves(validChannels(parent.rawChannels)).map(([f, value]) => [f, value + parent.normalization]),
      target: validChannels(target.rawChannels)[0].map(([f, value]) => [f, value + target.normalization]),
      bands: Math.min(filters.length, deviceBandLimit(getDevice())), options: autoEQOptions,
    };
    worker.postMessage(request);
  };

  return {
    models, active, prepared, curves, loading, ready, error, setError, reportError,
    normalization, setNormalization, smoothing, setSmoothing, baselineKey, setBaselineKey,
    choose, remove, patchModel, recolor, changeVariant, upload,
    filters, applyFilters, filterLimit, eqModels, eqModelKey: selectedEQModel?.key ?? "", selectEQModel,
    deviceEQ, connectDevice, loadDeviceConfig,
    preamp, autoEQOptions, setAutoEQOptions, runAutoEQ, autoEQRunning,
  };
}

export type GraphToolController = ReturnType<typeof useGraphTool>;
