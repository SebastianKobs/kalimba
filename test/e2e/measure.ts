// Measurements on rendered samples, for the end-to-end sound tests.
export const SAMPLE_RATE = 48000;
export const at = (seconds: number) => Math.round(seconds * SAMPLE_RATE); // whole sample positions

export function rms(samples: readonly number[], from: number, to: number): number {
  let sum = 0;
  for (let i = from; i < to; i++) sum += samples[i]! ** 2;
  return Math.sqrt(sum / (to - from));
}

/** Level of a 100 ms window from `from`, relative to 50–150 ms after the attack, in dB. */
export function levelDb(samples: readonly number[], from: number): number {
  return 20 * Math.log10(rms(samples, at(from), at(from + 0.1)) / rms(samples, at(0.05), at(0.15)));
}

/** Pitch from 150 ms on, by normalised autocorrelation near the expected period, refined by a parabola. */
export function estimateFrequency(samples: readonly number[], expected: number): number {
  const start = at(0.15);
  const window = 8192;
  const correlate = (lag: number) => {
    let [sum, energyA, energyB] = [0, 0, 0];
    for (let i = start; i < start + window; i++) {
      sum += samples[i]! * samples[i + lag]!;
      energyA += samples[i]! ** 2;
      energyB += samples[i + lag]! ** 2;
    }
    return sum / Math.sqrt(energyA * energyB);
  };
  const period = SAMPLE_RATE / expected;
  let [bestLag, best] = [0, -Infinity];
  for (let lag = Math.floor(period * 0.8); lag <= Math.ceil(period * 1.2); lag++) {
    const c = correlate(lag);
    if (c > best) [best, bestLag] = [c, lag];
  }
  const [l, c, r] = [correlate(bestLag - 1), best, correlate(bestLag + 1)];
  return SAMPLE_RATE / (bestLag + (0.5 * (l - r)) / (l - 2 * c + r));
}

/**
 * Amplitude of one frequency in a window: a single-bin DFT, Hann-windowed. Unwindowed, a strong decaying note leaks
 * about −44 dB into its own harmonics, as loud as a real tine's harmonics are.
 */
export function amplitudeAt(samples: readonly number[], frequency: number, from: number, to: number): number {
  const [start, end] = [at(from), at(to)];
  const n = end - start;
  let [re, im, weights] = [0, 0, 0];
  for (let i = start; i < end; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * (i - start)) / (n - 1));
    const phase = (2 * Math.PI * frequency * i) / SAMPLE_RATE;
    re += w * samples[i]! * Math.cos(phase);
    im -= w * samples[i]! * Math.sin(phase);
    weights += w;
  }
  return (2 * Math.hypot(re, im)) / weights;
}

export const db = (ratio: number) => 20 * Math.log10(ratio);

/** Treble: the first difference's RMS, a crude high-pass. */
export function brightness(samples: readonly number[], from: number, to: number): number {
  let sum = 0;
  for (let i = from + 1; i < to; i++) sum += (samples[i]! - samples[i - 1]!) ** 2;
  return Math.sqrt(sum / (to - from));
}

/** How far the level in 20 ms windows strays from a straight line in dB (an exponential fade), as RMS. */
export function spreadAroundFade(samples: readonly number[], from: number, to: number): number {
  const points: [number, number][] = [];
  for (let t = from; t < to; t += 0.02) points.push([t, 20 * Math.log10(rms(samples, at(t), at(t + 0.02)))]);
  const n = points.length;
  const [meanT, meanL] = [points.reduce((a, p) => a + p[0], 0) / n, points.reduce((a, p) => a + p[1], 0) / n];
  const slope = points.reduce((a, [t, l]) => a + (t - meanT) * (l - meanL), 0) / points.reduce((a, [t]) => a + (t - meanT) ** 2, 0);
  return Math.sqrt(points.reduce((a, [t, l]) => a + (l - meanL - slope * (t - meanT)) ** 2, 0) / n);
}
