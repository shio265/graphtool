import type { ResponseCurve } from "./types";

interface SmoothingParameters {
  g: number[][];
  diagonal: number[];
  lower: number[][];
  weightsSquared: number[];
}

const cache = new Map<string, SmoothingParameters>();
const pairs = (values: number[], fn: (a: number, b: number) => number) => values.slice(1).map((value, index) => fn(value, values[index]));

// CrinGraph weighted natural cubic smoothing spline (LDL solve).
function prepare(frequencies: number[], level: number): SmoothingParameters {
  const x = frequencies.map(Math.log);
  const h = pairs(x, (a, b) => a - b);
  const reciprocal = h.map((value) => 1 / value);
  const g = [reciprocal.slice(0, -1), pairs(reciprocal, (a, b) => -(a + b)), reciprocal.slice(1)];
  const weights = x.map((_, index) => level * 0.01 * (1 / 80) ** (index / x.length) ** 2);
  const weightedG = g.map((row, j) => row.map((value, i) => value * weights[i + j]));
  const sixth = h.map((value) => value / 6);
  const matrix = [pairs(sixth, (a, b) => 2 * (a + b)), sixth.slice(1, -1), sixth.slice(3).map(() => 0)];
  weightedG.forEach((_, k) => weightedG.slice(k).forEach((row, i) => weightedG[i].slice(k).forEach((value, j) => { matrix[k][j] += value * row[j]; })));
  const diagonal = [matrix[0][0]];
  const lower = matrix.slice(1).map((row) => [row[0] / diagonal[0]]);
  for (let j = 1; j < matrix[0].length; j++) {
    const n = lower.length;
    const previous = diagonal.slice(-n).reverse().map((value, i) => value * lower[i][j - 1 - i]);
    const a = matrix.map((row, k) => row[j] - previous.slice(0, n - k).reduce((sum, value, i) => sum + value * lower[k + i][j - 1 - i], 0));
    diagonal.push(a[0]);
    lower.forEach((row, k) => row.push(a[k + 1] / a[0]));
  }
  return { g, diagonal, lower, weightsSquared: weights.map((value) => value * value) };
}

export function smoothResponse(curve: ResponseCurve, level: number): ResponseCurve {
  if (!level || curve.length < 5) return curve;
  const key = `${level}:${curve.map(([frequency]) => frequency).join(",")}`;
  let parameters = cache.get(key);
  if (!parameters) {
    parameters = prepare(curve.map(([frequency]) => frequency), level);
    if (cache.size > 32) cache.clear();
    cache.set(key, parameters);
  }
  const { g, diagonal, lower, weightsSquared } = parameters;
  const values = curve.map((point) => point[1]);
  const product = g[0].map(() => 0);
  const n = product.length;
  g.forEach((row, j) => row.forEach((value, i) => { product[i] += value * values[i + j]; }));
  for (let i = 0; i < n; i++) {
    const value = product[i];
    lower.forEach((row, k) => { const j = i + k + 1; if (j < n) product[j] -= row[i] * value; });
    product[i] /= diagonal[i];
  }
  for (let i = n - 1; i >= 0; i--) {
    const value = product[i];
    lower.forEach((row, k) => { const j = i - k - 1; if (j >= 0) product[j] -= row[j] * value; });
  }
  const result = [...values];
  g.forEach((row, j) => row.forEach((value, i) => { result[i + j] -= value * weightsSquared[i + j] * product[i]; }));
  return curve.map(([frequency], index) => [frequency, result[index]]);
}
