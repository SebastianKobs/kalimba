import type { Plucker } from '../kalimba-view';
import type { Tongue } from '../layout';
import type { KlangValues } from './klang';
import { KalimbaSound } from './kalimba-sound';

// a pluck is never quite as hard as the last: velocity drawn in this range
const VELOCITY = [0.85, 1] as const;
const MASTER_LEVEL = 0.5; // headroom for chords, into the limiter

interface Running {
  readonly context: AudioContext;
  readonly sound: KalimbaSound;
}

/** Edge: plays the kalimba live: the audio context started on a gesture, a master level into a limiter. */
export class ModularPlayer implements Plucker {
  #klang: KlangValues;
  #tongues: readonly Tongue[];
  #running?: Running;

  // klang: the Klang panel's macros as they start; tongues: the kalimba as tuned now
  constructor(klang: KlangValues, tongues: readonly Tongue[]) {
    this.#klang = klang;
    this.#tongues = tongues;
  }

  pluck(tongue: Tongue): void {
    const { context, sound } = this.#start();
    sound.pluck(tongue, context.currentTime, VELOCITY[0] + (VELOCITY[1] - VELOCITY[0]) * Math.random());
  }

  /** A metronome tick, the first beat of a bar accented. */
  click(accent: boolean): void {
    const { context, sound } = this.#start();
    sound.click(accent, context.currentTime);
  }

  /** The Klang panel's macros changed: heard at once on what rings, from the next pluck on the rest. */
  setKlang(values: KlangValues): void {
    this.#klang = values;
    this.#running?.sound.setKlang(values);
  }

  /** The tongues retuned: the other tongues ring along at their new pitches. */
  setTongues(tongues: readonly Tongue[]): void {
    this.#tongues = tongues;
    this.#running?.sound.setTongues(tongues);
  }

  /** Starts the audio on a user gesture, so the first pluck sounds at once. */
  prepare(): void {
    this.#start();
  }

  #start(): Running {
    if (this.#running) {
      if (this.#running.context.state === 'suspended') void this.#running.context.resume();
      return this.#running;
    }
    const context = new AudioContext({ latencyHint: 'interactive' });
    const level = context.createGain();
    level.gain.value = MASTER_LEVEL;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.ratio.value = 12;
    level.connect(limiter).connect(context.destination);
    const sound = new KalimbaSound({ context, into: level, random: Math.random, klang: this.#klang, tongues: this.#tongues });
    this.#running = { context, sound };
    return this.#running;
  }
}
