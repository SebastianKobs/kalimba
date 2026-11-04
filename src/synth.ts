// cantilever beam: 2nd bending mode sits at ~6.27× the fundamental, inharmonic → the metallic "ting"
const SECOND_MODE_RATIO = 6.267;
const ATTACK_SECONDS = 0.002;

interface Partial {
  ratio: number;
  amplitude: number;
  decaySeconds: number;
}

function partialsFor(frequency: number): Partial[] {
  // low tines ring longer; clamp keeps extremes musical
  const fundamentalDecay = Math.min(3, Math.max(0.6, 1.6 * Math.sqrt(261.63 / frequency)));
  return [
    { ratio: 1, amplitude: 0.7, decaySeconds: fundamentalDecay },
    { ratio: 2, amplitude: 0.06, decaySeconds: fundamentalDecay * 0.4 },
    { ratio: SECOND_MODE_RATIO, amplitude: 0.2, decaySeconds: 0.06 },
  ];
}

/** Mono samples of one plucked tine: sum of exponentially decaying sine modes. */
export function renderTine(frequency: number, sampleRate: number, durationSeconds: number): Float32Array<ArrayBuffer> {
  const samples = new Float32Array(Math.round(sampleRate * durationSeconds));
  const nyquist = sampleRate / 2;
  const partials = partialsFor(frequency).filter((p) => p.ratio * frequency < nyquist);
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    const attack = Math.min(1, t / ATTACK_SECONDS); // ramp from 0: no click
    let value = 0;
    for (const p of partials) {
      value += p.amplitude * Math.exp(-t / p.decaySeconds) * Math.sin(2 * Math.PI * p.ratio * frequency * t);
    }
    samples[i] = attack * value;
  }
  return samples;
}
