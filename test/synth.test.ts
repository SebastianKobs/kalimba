import { renderTine } from '../src/synth';

const SAMPLE_RATE = 48000;

function rms(samples: Float32Array, from: number, to: number): number {
  let sum = 0;
  for (let i = from; i < to; i++) sum += samples[i] ** 2;
  return Math.sqrt(sum / (to - from));
}

// autocorrelation peak near the expected period, refined by parabolic interpolation
function estimateFrequency(samples: Float32Array, expected: number): number {
  const start = Math.round(0.05 * SAMPLE_RATE);
  const window = 8192;
  const correlate = (lag: number) => {
    let sum = 0;
    for (let i = start; i < start + window; i++) sum += samples[i] * samples[i + lag];
    return sum;
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
});
