import type { Resonator } from './resonance';

// the bridge's knock when a tongue is plucked: one impulse, as strong at every pitch, so each resonator rings by its
// coupling alone, the same every time; as loud on average as the 1.5 ms noise burst it replaces, which a random
// draw made louder at some pitches than others
const KNOCK_DECAY_SECONDS = 0.0015;

/**
 * Edge: the other tongues ringing along, as a bank of narrow bandpasses, one per tongue, each ringing at its pitch
 * when the bridge knocks: every pluck sends a short noise burst into each resonator, as hard as it's coupled.
 */
export class ResonanceBank {
  readonly #context: BaseAudioContext;
  readonly #output: GainNode;
  readonly #filters: BiquadFilterNode[] = [];
  readonly #knock: AudioBuffer;

  constructor(context: BaseAudioContext, into: AudioNode) {
    this.#context = context;
    this.#output = context.createGain();
    this.#output.connect(into);
    this.#knock = context.createBuffer(1, 1, context.sampleRate);
    // a uniform noise's power is ⅓; over a decay of τ it sums to ⅓ · fs τ / 2
    this.#knock.getChannelData(0)[0] = Math.sqrt((context.sampleRate * KNOCK_DECAY_SECONDS) / 6);
  }

  /** Each tongue's resonator, as tuned now, and how loud the bank rings. */
  set(resonators: readonly Resonator[], gain: number): void {
    resonators.forEach(({ frequency, q }, i) => {
      const filter = this.#filters[i] ?? this.#addFilter();
      filter.frequency.value = frequency;
      filter.Q.value = q;
    });
    this.#output.gain.value = gain;
  }

  /** The bridge knocked by a pluck at t, as hard as it's played; weights: each resonator's coupling, 0 to 1. */
  excite(t: number, velocity: number, weights: readonly number[]): void {
    if (this.#output.gain.value === 0) return;
    const source = this.#context.createBufferSource();
    source.buffer = this.#knock;
    const sends = weights.flatMap((weight, i) => {
      const filter = this.#filters[i];
      if (!filter || weight <= 0) return [];
      const send = this.#context.createGain();
      send.gain.value = velocity * weight;
      source.connect(send).connect(filter);
      return [send];
    });
    source.start(t);
    source.onended = () => sends.forEach((send) => send.disconnect());
  }

  #addFilter(): BiquadFilterNode {
    const filter = this.#context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.connect(this.#output);
    this.#filters.push(filter);
    return filter;
  }
}
