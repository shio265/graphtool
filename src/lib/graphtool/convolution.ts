import { calculateGains, filterCoefficients } from "./equalizer";
import type { ConvolutionOptions, Filter } from "./types";

// Radix-2 FFT and real-cepstrum minimum-phase reconstruction
export function fft(real: Float64Array, imaginary: Float64Array, inverse = false): void {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imaginary[i], imaginary[j]] = [imaginary[j], imaginary[i]];
    }
  }
  for (let length = 2; length <= n; length <<= 1) {
    const half = length >> 1;
    const angle = (inverse ? 2 : -2) * Math.PI / length;
    const wr = Math.cos(angle), wi = Math.sin(angle);
    for (let i = 0; i < n; i += length) {
      let r = 1, im = 0;
      for (let j = 0; j < half; j++) {
        const even = i + j, odd = even + half;
        const oddReal = real[odd] * r - imaginary[odd] * im;
        const oddImaginary = real[odd] * im + imaginary[odd] * r;
        real[odd] = real[even] - oddReal;
        imaginary[odd] = imaginary[even] - oddImaginary;
        real[even] += oddReal;
        imaginary[even] += oddImaginary;
        const next = r * wr - im * wi;
        im = r * wi + im * wr;
        r = next;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { real[i] /= n; imaginary[i] /= n; }
}

export function convolutionImpulse(filters: Filter[], options: ConvolutionOptions): Float32Array {
  const { sampleRate, phase, preamp } = options;
  const resolution = Math.max(1, options.freqResolution || 16) / (phase === "minimum" ? 2 : 1);
  const size = 2 ** Math.ceil(Math.log2(Math.max(2, sampleRate / resolution)));
  const half = size >> 1;
  const frequencies = Array.from({ length: half }, (_, index) => index * sampleRate / size);
  const gains = calculateGains(frequencies, filterCoefficients(filters, sampleRate), sampleRate);
  const peakGain = gains.reduce((peak, gain) => Number.isFinite(gain) ? Math.max(peak, gain) : peak, -Infinity);
  const maximum = Number.isFinite(peakGain) ? peakGain : 0;
  const magnitudes = new Float64Array(half + 1);
  let last = gains.find(Number.isFinite) || 0;
  for (let i = 0; i < half; i++) {
    last = Number.isFinite(gains[i]) ? gains[i] : last;
    magnitudes[i] = 10 ** ((last - maximum - 0.2 + preamp) / 20);
  }
  const real = new Float64Array(size), imaginary = new Float64Array(size);
  const value = (index: number) => phase === "minimum" ? Math.log(Math.max(magnitudes[index], 1e-12)) : magnitudes[index];
  real[0] = value(0);
  for (let i = 1; i < half; i++) { real[i] = value(i); real[size - i] = value(i); }
  real[half] = value(half);
  fft(real, imaginary, true);
  let impulse: Float32Array;
  if (phase === "linear") {
    impulse = new Float32Array(size);
    for (let i = 0; i < size; i++) impulse[i] = real[(i + half) % size] * (0.54 - 0.46 * Math.cos(2 * Math.PI * i / (size - 1)));
  } else {
    for (let i = 1; i < half; i++) { real[i] *= 2; imaginary[i] *= 2; }
    for (let i = half + 1; i < size; i++) { real[i] = 0; imaginary[i] = 0; }
    fft(real, imaginary);
    for (let i = 0; i < size; i++) {
      const magnitude = Math.exp(real[i]), angle = imaginary[i];
      real[i] = magnitude * Math.cos(angle);
      imaginary[i] = magnitude * Math.sin(angle);
    }
    fft(real, imaginary, true);
    impulse = new Float32Array(real.slice(0, half));
  }
  const peak = impulse.reduce((maximum, sample) => Math.max(maximum, Math.abs(sample)), 0);
  if (peak > 0.999) for (let i = 0; i < impulse.length; i++) impulse[i] *= 0.999 / peak;
  return impulse;
}

export function encodeWav(samples: Float32Array, options: ConvolutionOptions): ArrayBuffer {
  const channels = options.stereo ? 2 : 1;
  const float = options.bitDepth === "float32", bits = float ? 32 : Number(options.bitDepth);
  const bytes = bits / 8, alignment = channels * bytes, dataSize = samples.length * alignment;
  const buffer = new ArrayBuffer(44 + dataSize), view = new DataView(buffer);
  const string = (offset: number, text: string) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
  string(0, "RIFF"); view.setUint32(4, 36 + dataSize, true); string(8, "WAVE"); string(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, float ? 3 : 1, true); view.setUint16(22, channels, true);
  view.setUint32(24, options.sampleRate, true); view.setUint32(28, options.sampleRate * alignment, true);
  view.setUint16(32, alignment, true); view.setUint16(34, bits, true); string(36, "data"); view.setUint32(40, dataSize, true);
  let offset = 44;
  for (const input of samples) {
    const sample = Math.max(-1, Math.min(1, input));
    for (let channel = 0; channel < channels; channel++) {
      if (float) view.setFloat32(offset, sample, true);
      else if (bits === 16) view.setInt16(offset, Math.round(sample < 0 ? sample * 0x8000 : sample * 0x7fff), true);
      else if (bits === 24) {
        const value = Math.round(sample < 0 ? sample * 0x800000 : sample * 0x7fffff);
        view.setUint8(offset, value & 0xff); view.setUint8(offset + 1, (value >> 8) & 0xff); view.setUint8(offset + 2, (value >> 16) & 0xff);
      } else view.setInt32(offset, Math.round(sample < 0 ? sample * 0x80000000 : sample * 0x7fffffff), true);
      offset += bytes;
    }
  }
  return buffer;
}

export function convolutionWav(filters: Filter[], options: ConvolutionOptions): ArrayBuffer {
  return encodeWav(convolutionImpulse(filters, options), options);
}
