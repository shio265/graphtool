"use client";

import { useEffect, useRef, useState } from "react";
import { AudioPreviewEngine, type AudioPlaybackState, ToneGenerator } from "./audio";
import type { Filter } from "./types";

export function useAudioPreview(filters: Filter[], reportError: (error: unknown) => void) {
  const engine = useRef<AudioPreviewEngine | null>(null);
  const [playback, setPlayback] = useState<AudioPlaybackState>({ playing: false, currentTime: 0, duration: 0 });
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(0.5);

  useEffect(() => {
    engine.current = new AudioPreviewEngine(setPlayback);
    return () => { engine.current?.dispose(); engine.current = null; };
  }, []);
  useEffect(() => { engine.current?.setFilters(filters); }, [filters]);

  const load = async (file: File) => {
    setLoading(true);
    try { await engine.current?.load(file); setFilename(file.name); }
    catch (error) { reportError(error); }
    finally { setLoading(false); }
  };
  const toggle = async () => {
    try { if (playback.playing) engine.current?.pause(); else await engine.current?.play(); }
    catch (error) { reportError(error); }
  };
  const seek = async (seconds: number) => { try { await engine.current?.seek(seconds); } catch (error) { reportError(error); } };
  const changeVolume = (value: number) => { setVolume(value); engine.current?.setVolume(value); };
  const remove = () => { engine.current?.remove(); setFilename(""); setVolume(0.5); };
  return { ...playback, filename, loading, volume, load, toggle, seek, changeVolume, remove, stop: () => engine.current?.stop() };
}

export function useToneGenerator(reportError: (error: unknown) => void, disabled = false) {
  const generator = useRef<ToneGenerator | null>(null);
  const [playing, setPlaying] = useState(false);
  if (disabled && playing) setPlaying(false);
  const [from, setFrom] = useState(20), [to, setTo] = useState(20000), [frequency, setFrequency] = useState(20);
  useEffect(() => { generator.current = new ToneGenerator(); return () => { generator.current?.dispose(); generator.current = null; }; }, []);
  useEffect(() => { generator.current?.setFrequency(frequency); }, [frequency]);
  useEffect(() => { if (disabled) generator.current?.stop(); }, [disabled]);

  const changeRange = (minimum: number, maximum: number) => {
    minimum = Math.max(20, Math.min(20000, minimum)); maximum = Math.max(minimum, Math.min(20000, maximum));
    setFrom(minimum); setTo(maximum); setFrequency((current) => Math.min(maximum, Math.max(minimum, current)));
  };
  const changeFrequency = (value: number) => setFrequency(Math.min(to, Math.max(from, value)));
  const stepFrequency = (direction: number) => changeFrequency(frequency + direction * (frequency < 100 ? 1 : frequency < 1000 ? 10 : frequency < 10000 ? 100 : 500));
  const toggle = async () => {
    if (playing) { generator.current?.stop(); setPlaying(false); }
    else { try { await generator.current?.start(frequency); setPlaying(true); } catch (error) { reportError(error); } }
  };
  return { playing: playing && !disabled, from, to, frequency, changeRange, changeFrequency, stepFrequency, toggle };
}
