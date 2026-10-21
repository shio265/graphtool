export type Point = [frequency: number, spl: number];
export type ResponseCurve = Point[];
export type Channels = (ResponseCurve | null)[];
export type ChannelMode = "both" | "average" | "left" | "right";
export type Range = [number, number];
export type FilterType = "PK" | "LSQ" | "HSQ";

export interface Filter {
  type: FilterType;
  freq: number;
  gain: number;
  q: number;
  disabled?: boolean;
}

export interface ModelEntry {
  name: string;
  file?: string | string[];
  collab?: string;
  suffix?: string[];
  prefix?: string;
}

export interface BrandEntry {
  name: string;
  suffix?: string;
  models: (string | ModelEntry)[];
}

export interface Model {
  key: string;
  brand: string;
  brandSuffix?: string;
  collab?: string;
  name: string;
  fullName: string;
  fileName: string;
  variants?: { fileName: string; name: string }[];
  isTarget?: boolean;
  isDynamic?: boolean;
}

export interface ActiveModel extends Model {
  colorId: number;
  rawChannels: Channels;
  mode: ChannelMode;
  offset: number;
  hidden: boolean;
  pinned: boolean;
  eqParent?: string;
}

export interface PreparedModel extends ActiveModel {
  channels: Channels;
  average: ResponseCurve;
  normalization: number;
  imbalanced: boolean;
}

export interface GraphCurve {
  id: string;
  modelKey: string;
  name: string;
  color: string;
  isTarget: boolean;
  points: ResponseCurve;
}

export interface Normalization {
  mode: "dB" | "Hz";
  db: number;
  hz: number;
}

export interface AutoEQOptions {
  freqRange: Range;
  gainRange: Range;
  qRange: Range;
}

export interface ConvolutionOptions {
  sampleRate: number;
  bitDepth: "16" | "24" | "32" | "float32";
  phase: "minimum" | "linear";
  freqResolution: number;
  preamp: number;
  stereo: boolean;
}
