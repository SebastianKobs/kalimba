// cantilever beam modes: 2nd at ~6.27×, 3rd at ~17.55× the fundamental, inharmonic → the metallic "ting"
const SECOND_MODE_RATIO = 6.267;
const THIRD_MODE_RATIO = 17.547;
// fade-in only long enough to avoid a DC pop; the click is wanted
const ATTACK_SECONDS = 0.0003;
// a kalimba tine fades by 60 dB in about 2.5 s at C4; lower tines ring longer
const T60_AT_C4 = 2.5;
const T60_RANGE = [0.8, 3.5] as const;
const LN_1000 = Math.log(1000); // T60 = tau × ln(1000)
// the thumb releasing the tine: a short burst of bright noise
const CLICK_LEVEL = 0.25;
const CLICK_DECAY_SECONDS = 0.002;

interface Partial {
  ratio: number;
  amplitude: number;
  decaySeconds: number;
}

function partialsFor(frequency: number): Partial[] {
  const t60 = Math.min(T60_RANGE[1], Math.max(T60_RANGE[0], T60_AT_C4 * Math.sqrt(261.63 / frequency)));
  const tau = t60 / LN_1000;
  return [
    { ratio: 1, amplitude: 0.5, decaySeconds: tau },
    { ratio: 2, amplitude: 0.05, decaySeconds: tau * 0.4 },
    { ratio: SECOND_MODE_RATIO, amplitude: 0.2, decaySeconds: 0.04 },
    { ratio: THIRD_MODE_RATIO, amplitude: 0.08, decaySeconds: 0.008 },
  ];
}

/** Deterministic noise (mulberry32): the same note sounds the same every time, and tests can rely on it. */
function noise(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296 * 2 - 1;
  };
}

/** Mono samples of one plucked tine: a click, then a sum of exponentially decaying sine modes. */
export function renderTine(frequency: number, sampleRate: number, durationSeconds: number): Float32Array<ArrayBuffer> {
  const samples = new Float32Array(Math.round(sampleRate * durationSeconds));
  const nyquist = sampleRate / 2;
  const partials = partialsFor(frequency).filter((p) => p.ratio * frequency < nyquist);
  const random = noise(Math.round(frequency * 1000));
  let previousNoise = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    const attack = Math.min(1, t / ATTACK_SECONDS);
    let value = 0;
    for (const p of partials) {
      value += p.amplitude * Math.exp(-t / p.decaySeconds) * Math.sin(2 * Math.PI * p.ratio * frequency * t);
    }
    // differenced noise: high-passed, so the click is bright rather than a thump
    const white = random();
    value += CLICK_LEVEL * Math.exp(-t / CLICK_DECAY_SECONDS) * (white - previousNoise) * 0.5;
    previousNoise = white;
    samples[i] = attack * value;
  }
  return samples;
}
