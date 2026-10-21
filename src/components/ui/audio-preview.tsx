"use client";

import { useRef } from "react";
import { formatTime } from "@/src/lib/graphtool/audio";
import type { useAudioPreview } from "@/src/lib/graphtool/use-audio-preview";
import { RangeInput } from "./range-input";
import { Button } from "./button";
import { PanelHeading } from "./panel-heading";

export function AudioPreview({ audio, eqEnabled, onEnableFilters }: { audio: ReturnType<typeof useAudioPreview>; eqEnabled: boolean; onEnableFilters: (enabled: boolean) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const badge = "inline-block min-w-[35px] rounded-[3px] bg-[var(--accent-color)] px-[0.4em] py-[0.2em] text-center text-[0.9em] font-medium whitespace-nowrap text-[var(--accent-color-contrast-more)]";
  return <div className="extra-audio-preview mb-[1em] text-(--background-color-contrast-more)"><PanelHeading>Audio Preview</PanelHeading>
    <div className="audio-upload-section mb-[1em]"><Button panel className="upload-audio" onClick={() => fileInput.current?.click()} disabled={audio.loading}>{audio.loading ? "Loading…" : "Upload Audio File"}</Button><br /><span><small>Upload an audio file to preview EQ effects in real-time</small></span>
      <input hidden ref={fileInput} type="file" id="file-audio" accept=".mp3,.wav,.flac,.ogg,.m4a,audio/*" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void audio.load(file); event.currentTarget.value = ""; }} />
    </div>
    {audio.filename && <div className="audio-player-section">
      <div className="audio-file-info mb-[0.5em] rounded-sm bg-(--accent-color) p-[0.5em] font-medium text-(--accent-color-contrast-more)"><span>File: <span id="audio-filename">{audio.filename}</span></span></div>
      <div className="audio-controls mb-[0.5em] flex flex-wrap gap-x-1 gap-y-0">
        <Button panel layout="half" id="play-toggle" onClick={() => { void audio.toggle(); }}>{audio.playing ? `Pause (${eqEnabled ? "EQ" : "Original"})` : "Play"}</Button>
        <Button panel layout="half" id="stop-audio" onClick={audio.stop}>Stop</Button>
        <Button panel layout="half" id="enable-all-eq" onClick={() => onEnableFilters(true)}>Enable All EQ</Button>
        <Button panel layout="half" id="disable-all-eq" onClick={() => onEnableFilters(false)}>Disable All EQ</Button>
        <Button panel layout="full" id="remove-audio" onClick={audio.remove}>Remove Audio</Button>
      </div>
      <div className="audio-volume mb-[0.5em] flex items-center gap-[0.5em]"><span className={badge}>Volume: </span><RangeInput id="audio-volume" aria-label="Audio volume" min={0} max={1} step={0.01} value={audio.volume} onValueChange={audio.changeVolume} /><span className={badge} id="volume-display">{Math.round(audio.volume * 100)}%</span></div>
      <div className="audio-progress-section mb-[0.5em] flex items-center gap-[0.5em]"><RangeInput id="audio-progress" aria-label="Audio playback position" min={0} max={Math.max(0.01, audio.duration)} step={0.01} value={audio.currentTime} onValueChange={(seconds) => { void audio.seek(seconds); }} /></div>
      <div className="audio-time-display mb-[0.5em] flex items-center justify-between gap-[0.5em]"><span className={badge} id="current-time">{formatTime(audio.currentTime)}</span><span className={badge} id="total-time">{formatTime(audio.duration)}</span></div>
    </div>}
  </div>;
}
