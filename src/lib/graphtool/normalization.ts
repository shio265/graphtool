import { config } from "./config";
import type { Channels, Normalization, ResponseCurve } from "./types";

const iso226 = {
  f: [20,25,31.5,40,50,63,80,100,125,160,200,250,315,400,500,630,800,1000,1250,1600,2000,2500,3150,4000,5000,6300,8000,10000,12500],
  a: [0.532,0.506,0.48,0.455,0.432,0.409,0.387,0.367,0.349,0.33,0.315,0.301,0.288,0.276,0.267,0.259,0.253,0.25,0.246,0.244,0.243,0.243,0.243,0.242,0.242,0.245,0.254,0.271,0.301],
  lu: [-31.6,-27.2,-23,-19.1,-15.9,-13,-10.3,-8.1,-6.2,-4.5,-3.1,-2,-1.1,-0.4,0,0.3,0.5,0,-2.7,-4.1,-1,1.7,2.5,1.2,-2.1,-7.1,-11.2,-10.7,-3.1],
  threshold: [78.5,68.7,59.5,51.1,44,37.5,31.5,26.5,22.1,17.9,14.4,11.4,8.6,6.2,4.4,3,2.2,2.4,3.5,1.7,-1.3,-4.2,-6,-5.4,-1.5,6,12.6,13.9,12.3],
};

// The original 480-point free-field compensation, including its -7 dB offset.
const freeField = [
  ...Array<number>(21).fill(0), 0.0725, ...Array<number>(87).fill(0.1),
  0.0896,0,0,0,0,0,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.0967,0,0,0,0,0,0,0,
  0.0886,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.0656,0,0,0,0,0,0.024,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.045,0,0,0,0,0,0,
  0.029,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1524,0.2,0.2,0.2386,0.3395,0.4,0.437,0.5,0.5287,0.6225,0.7,0.7063,0.7962,0.8,
  0.8941,0.9,0.9863,1,1.0729,1.1,1.1544,1.2,1.2504,1.3,1.3,1.3,1.3,1.3163,1.4,1.4,1.4,1.4,1.4017,1.4846,1.5,1.5,1.5748,1.6,1.6,1.653,
  1.7,1.7,1.7487,1.8,1.8341,1.9,1.9,1.9229,2,2,2,2.1,2.1,2.1897,2.2,2.2,2.2674,2.3,2.3,2.3567,2.4,2.4,2.4446,2.5,2.5262,2.6,2.6234,
  2.7149,2.8,2.8038,2.9011,2.9969,3.0913,3.1845,3.2762,3.3757,3.4649,3.5617,3.657,3.751,3.8,3.8432,3.9332,4,4,4,4.0121,4.1,4.1,4.1,
  4.0079,4,4,4,4,3.9334,3.9,3.9,3.9,3.8541,3.8,3.8,3.768,3.7,3.6761,3.6,3.6,3.5927,3.5,3.5,3.5,3.5,3.5,3.5761,3.6,3.6,3.6604,3.7,
  3.7514,3.8,3.8,3.8349,3.9,3.9218,4.0199,4.1123,4.2076,4.3016,4.3985,4.6816,5.0515,5.4222,5.8036,6.1097,6.4656,6.8461,7.3316,7.9083,
  8.4305,8.9369,9.5105,10.0759,10.6024,11.0027,11.4847,12.0482,12.5152,12.8994,13.2776,13.7381,14.1303,14.5168,14.8858,15.273,15.6547,
  15.9731,16.2596,16.542,16.7857,17.0111,17.2325,17.3532,17.522,17.6,17.6,17.6,17.6,17.5044,17.41,17.3145,17.2205,17.1255,17.0318,
  16.9373,16.784,16.6459,16.4536,16.2578,16.1234,15.967,15.8736,15.7552,15.566,15.3879,15.2881,15.0958,14.9064,14.8099,14.6287,14.5201,
  14.3477,14.2307,14.0709,13.9399,13.7916,13.6514,13.5552,13.4604,13.367,13.2718,13.1766,13.0812,12.9743,12.7916,12.6975,12.602,12.5078,
  12.3247,12.0547,11.7686,11.4154,11.1009,10.9385,10.7344,10.3998,10.0163,9.6382,9.2957,8.9799,8.6248,8.3404,8.0424,7.674,7.3851,7.0061,
  6.5307,6.1484,5.7696,5.4662,5.1084,4.7302,4.3498,3.971,3.6455,3.4075,3.1343,2.7917,2.5376,2.3484,2.1585,1.9849,1.9107,2,2,2,2.0894,
  2.1844,2.2787,2.374,2.6057,2.8265,3.0161,3.2057,3.3954,3.5851,3.8122,4.0967,4.354,4.5651,4.8509,5.1459,5.5259,5.9041,6.1881,6.5643,
  6.8561,7.1418,7.4251,7.7093,8.0593,8.3192,8.4541,8.5493,8.6437,8.7,8.7336,8.8,8.8,8.8,8.8,8.7926,8.7,8.7,8.6079,8.5133,8.5,8.4237,
  8.1863,7.968,7.7786,7.4219,6.948,6.4299,5.8212,5.1563,4.4634,3.7042,2.8897,1.9005,1.2368,0.5651,-0.2856,-0.8593,-2.9,
].map((value) => value - 7);

export function averageCurves(curves: ResponseCurve[]): ResponseCurve {
  if (!curves.length) return [];
  if (curves.length === 1) return curves[0];
  return curves[0].map(([frequency], index) => [frequency, 20 * Math.log10(curves.reduce((sum, curve) => sum + 10 ** (curve[index][1] / 20), 0) / curves.length)]);
}

export function validChannels(channels: Channels): ResponseCurve[] {
  return channels.filter((channel): channel is ResponseCurve => !!channel?.length);
}

function normalizationParameters(curve: ResponseCurve) {
  let index = 0;
  return curve.map(([frequency]) => {
    if (frequency >= iso226.f[index]) index++;
    const lo = Math.max(0, index - 1), hi = Math.min(index, iso226.f.length - 1);
    const fraction = lo === hi ? 0 : (Math.log(frequency) - Math.log(iso226.f[lo])) / (Math.log(iso226.f[hi]) - Math.log(iso226.f[lo]));
    const interpolate = (values: number[]) => values[lo] + fraction * (values[hi] - values[lo]);
    const a = interpolate(iso226.a);
    const m = a * (Math.log10(4) - 10 + interpolate(iso226.lu) / 10);
    const fieldIndex = Math.floor(0.5 + 48 * Math.log2(frequency / 19.4806));
    return {
      a,
      k: 0.005076 / 10 ** m - 10 ** (a * interpolate(iso226.threshold) / 10),
      c: 10 ** (9.4 + 4 * m) / curve.length,
      field: freeField[Math.max(0, Math.min(479, fieldIndex))],
    };
  });
}

export function loudnessOffset(curve: ResponseCurve, target: number): number {
  const parameters = normalizationParameters(curve);
  const log10 = Math.log(10) / 10;
  let offset = 0;
  for (let iteration = 0; iteration < 100; iteration++) {
    let value = 0, derivative = 0;
    parameters.forEach((p, index) => {
      const power = Math.exp(log10 * (curve[index][1] + offset - p.field));
      const v = p.k + power ** p.a;
      value += p.c * v ** 4;
      derivative += log10 * power * p.a * power ** (p.a - 1) * p.c * 4 * v ** 3;
    });
    const step = (Math.log(value) - target * log10) * value / derivative;
    if (!Number.isFinite(step)) return 0;
    offset -= step;
    if (Math.abs(step) <= 0.01) break;
  }
  return offset;
}

export function normalizationOffset(channels: Channels, settings: Normalization): number {
  const average = averageCurves(validChannels(channels));
  if (!average.length) return 0;
  if (settings.mode === "dB") return loudnessOffset(average, settings.db);
  // Legacy frequency normalization uses the first measurement strictly above Hz.
  const index = average.findIndex(([frequency]) => frequency > settings.hz);
  return 60 - average[index < 0 ? average.length - 1 : index][1];
}

export function hasChannelImbalance(channels: Channels): boolean {
  const [left, right] = channels;
  if (!left || !right) return false;
  let positive = 0, negative = 0;
  return left.some(([frequency, spl], index) => {
    const difference = (spl - right[index][1]) / (50 * Math.sqrt(1 + (frequency / 10000) ** 6));
    positive = Math.max(positive + difference, 0);
    negative = Math.max(negative - difference, 0);
    return Math.max(positive, negative) > config.maxChannelImbalance;
  });
}
