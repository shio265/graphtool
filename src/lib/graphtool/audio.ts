import { enabledFilters } from "./equalizer";
import type { Filter } from "./types";

export interface AudioPlaybackState {
  playing: boolean;
  currentTime: number;
  duration: number;
}

export class AudioPreviewEngine {
  private context: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private nodes: BiquadFilterNode[] = [];
  private offset = 0;
  private startedAt = 0;
  private volume = 0.5;
  private filters: Filter[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private loadVersion = 0;

  constructor(private onChange: (state: AudioPlaybackState) => void) {}

  private getContext(): AudioContext {
    if (!this.context) {
      if (!window.AudioContext) throw new Error("Web Audio API is disabled or unavailable in this browser.");
      this.context = new AudioContext();
    }
    return this.context;
  }

  get duration(): number { return this.buffer?.duration ?? 0; }
  get playing(): boolean { return !!this.source; }
  get position(): number { return Math.min(this.duration, this.offset + (this.source && this.context ? this.context.currentTime - this.startedAt : 0)); }

  private notify(): void {
    this.onChange({ playing: this.playing, currentTime: this.position, duration: this.duration });
  }

  async load(file: File): Promise<void> {
    if (file.size > 500 * 1024 * 1024) throw new Error("File is too large. Please select a file smaller than 500MB.");
    const version = ++this.loadVersion;
    const context = this.getContext();
    this.stop();
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    if (version !== this.loadVersion) return;
    this.buffer = buffer;
    this.notify();
  }

  private disconnectSource(): void {
    if (this.source) { this.source.onended = null; this.source.stop(); this.source.disconnect(); this.source = null; }
    this.nodes.forEach((node) => node.disconnect());
    this.nodes = [];
    this.gain?.disconnect(); this.gain = null;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  private connectFilters(): void {
    if (!this.source || !this.gain || !this.context) return;
    this.source.disconnect();
    this.nodes.forEach((node) => node.disconnect());
    this.nodes = enabledFilters(this.filters).map((filter) => {
      const node = this.context!.createBiquadFilter();
      node.type = filter.type === "PK" ? "peaking" : filter.type === "LSQ" ? "lowshelf" : "highshelf";
      node.frequency.value = Math.min(filter.freq, this.context!.sampleRate / 2 - 1);
      node.Q.value = filter.q; node.gain.value = filter.gain;
      return node;
    });
    let last: AudioNode = this.source;
    for (const node of this.nodes) { last.connect(node); last = node; }
    last.connect(this.gain);
  }

  async play(): Promise<void> {
    if (!this.buffer || this.source) return;
    const context = this.getContext();
    await context.resume();
    if (!this.buffer || this.source) return;
    if (this.offset >= this.duration - 0.01) this.offset = 0;
    this.source = context.createBufferSource(); this.source.buffer = this.buffer;
    this.gain = context.createGain(); this.gain.gain.value = this.volume;
    this.gain.connect(context.destination);
    this.connectFilters();
    this.source.onended = () => { this.disconnectSource(); this.offset = this.duration; this.notify(); };
    this.startedAt = context.currentTime;
    this.source.start(0, this.offset);
    this.timer = setInterval(() => this.notify(), 100);
    this.notify();
  }

  pause(): void { this.offset = this.position; this.disconnectSource(); this.notify(); }
  stop(): void { this.disconnectSource(); this.offset = 0; this.notify(); }
  async seek(seconds: number): Promise<void> {
    const resume = this.playing;
    this.disconnectSource();
    this.offset = Math.max(0, Math.min(seconds, this.duration));
    if (resume && this.offset < this.duration) await this.play();
    this.notify();
  }
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gain && this.context) this.gain.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.01);
  }
  setFilters(filters: Filter[]): void { this.filters = filters; this.connectFilters(); }
  remove(): void { this.loadVersion++; this.stop(); this.buffer = null; this.setVolume(0.5); this.notify(); }
  dispose(): void { this.loadVersion++; this.disconnectSource(); void this.context?.close(); this.context = null; this.buffer = null; }
}

export class ToneGenerator {
  private context: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gain: GainNode | null = null;

  async start(frequency: number): Promise<void> {
    if (!window.AudioContext) throw new Error("Web Audio API is disabled or unavailable in this browser.");
    this.context ??= new AudioContext();
    await this.context.resume();
    if (this.oscillator) return;
    this.oscillator = this.context.createOscillator();
    this.oscillator.type = "sine"; this.oscillator.frequency.value = frequency;
    this.gain = this.context.createGain();
    // Start quietly; the legacy generator drove the output at full scale.
    this.gain.gain.value = 0.08;
    this.oscillator.connect(this.gain); this.gain.connect(this.context.destination); this.oscillator.start();
  }
  setFrequency(frequency: number): void {
    if (this.context && this.oscillator) this.oscillator.frequency.setTargetAtTime(frequency, this.context.currentTime, 0.2);
  }
  stop(): void { this.oscillator?.stop(); this.oscillator?.disconnect(); this.gain?.disconnect(); this.oscillator = null; this.gain = null; }
  dispose(): void { this.stop(); void this.context?.close(); this.context = null; }
}

export function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}
