import { renderTine } from '../src/synth';

const SAMPLE_RATE = 48000;

function rms(samples: Float32Array, from: number, to: number): number {
  let sum = 0;
  for (let i = from; i < to; i++) sum += samples[i] ** 2;
  return Math.sqrt(sum / (to - from));
}

// autocorrelation peak near the expected period, refined by parabolic interpolation
function estimateFrequency(samples: Float32Array, expected: number): number {
  const start = Math.round(0.15 * SAMPLE_RATE); // after the attack's inharmonic modes have died away
  const window = 8192;
  // normalised: plain autocorrelation of a fast-decaying tone favours short lags and reads sharp
  const correlate = (lag: number) => {
    let [sum, energyA, energyB] = [0, 0, 0];
    for (let i = start; i < start + window; i++) {
      sum += samples[i] * samples[i + lag];
      energyA += samples[i] ** 2;
      energyB += samples[i + lag] ** 2;
    }
    return sum / Math.sqrt(energyA * energyB);
  };
  const period = SAMPLE_RATE / expected;
  let bestLag = 0;
  let best = -Infinity;
  for (let lag = Math.floor(period * 0.8); lag <= Math.ceil(period * 1.2); lag++) {
    const c = correlate(lag);
    if (c > best) [best, bestLag] = [c, lag];
  }
  const [l, c, r] = [correlate(bestLag - 1), best, correlate(bestLag + 1)];
  const offset = (0.5 * (l - r)) / (l - 2 * c + r);
  return SAMPLE_RATE / (bestLag + offset);
}

describe('renderTine', () => {
  it('renders the requested duration', () => {
    expect(renderTine(440, SAMPLE_RATE, 1.5).length).toBe(72000);
  });

  it('starts from silence and stays within full scale', () => {
    const samples = renderTine(174.61, SAMPLE_RATE, 2);
    expect(samples[0]).toBe(0);
    expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(1);
  });

  it.each([174.61, 261.63, 1318.51])('sounds at its fundamental %f Hz (within 0.5%%)', (frequency) => {
    const samples = renderTine(frequency, SAMPLE_RATE, 1);
    expect(estimateFrequency(samples, frequency) / frequency).toBeCloseTo(1, 2);
  });

  it('decays like a plucked tine', () => {
    const samples = renderTine(440, SAMPLE_RATE, 3);
    const early = rms(samples, 0.05 * SAMPLE_RATE, 0.15 * SAMPLE_RATE);
    const late = rms(samples, 2.9 * SAMPLE_RATE, 3 * SAMPLE_RATE);
    expect(late).toBeLessThan(0.1 * early);
  });

  // level of a window relative to the first moments after the attack, in dB
  const at = (seconds: number) => Math.round(seconds * SAMPLE_RATE); // whole sample positions
  const levelDb = (samples: Float32Array, from: number) =>
    20 * Math.log10(rms(samples, at(from), at(from + 0.1)) / rms(samples, at(0.05), at(0.15)));

  it('rings for about 2.5 s at C4, like a kalimba tine, not much longer', () => {
    const samples = renderTine(261.63, SAMPLE_RATE, 4);
    expect(levelDb(samples, 0.5)).toBeGreaterThan(-20); // still singing
    expect(levelDb(samples, 2.5)).toBeLessThan(-45); // nearly gone
  });

  it('lets low tines ring longer than high ones', () => {
    const fadeTime = (frequency: number) => {
      const samples = renderTine(frequency, SAMPLE_RATE, 5);
      let t = 0.1;
      while (t < 4.8 && levelDb(samples, t) > -40) t += 0.05;
      return t;
    };
    expect(fadeTime(174.61)).toBeGreaterThan(1.5 * fadeTime(1318.51));
  });

  it('starts with a click: bright energy in the first milliseconds', () => {
    const samples = renderTine(261.63, SAMPLE_RATE, 1);
    // first difference as a crude high-pass: what the click adds
    const brightness = (from: number, to: number) => {
      let sum = 0;
      for (let i = from + 1; i < to; i++) sum += (samples[i] - samples[i - 1]) ** 2;
      return Math.sqrt(sum / (to - from));
    };
    const ms = SAMPLE_RATE / 1000;
    // about 14 dB more treble at the attack than 100 ms later; without a click it was about 2×
    expect(brightness(0, 5 * ms)).toBeGreaterThan(5 * brightness(100 * ms, 105 * ms));
  });

  it('sounds the same every time for the same note', () => {
    expect(renderTine(440, SAMPLE_RATE, 0.2)).toEqual(renderTine(440, SAMPLE_RATE, 0.2));
  });
});
