import { NoteRotation } from '../../libs/midi/protocol/index.ts';
import type { Plucker } from '../kalimba-view';
import type { Tongue } from '../layout';
import { kalimbaInstruments, type KalimbaInstruments } from './instruments';
import { KALIMBA_PATCH } from './kalimba-card';
import { instrumentsWith, pitchOffset, presetFor, ringFactor, type KlangValues } from './klang';
import { clickMessages, Plucks } from './plucks';

// a pluck is never quite as hard as the last: velocity drawn in this range
const VELOCITY = [0.85, 1] as const;
const MASTER_LEVEL = 0.5; // headroom for chords, into the limiter

interface Running extends KalimbaInstruments {
  readonly context: AudioContext;
}

/** Edge: plays plucks and clicks on stim-garden's modular instruments, built from the kalimba's voice cards. */
export class ModularPlayer implements Plucker {
  readonly #plucks = new Plucks(() => ({ pitchOffset: pitchOffset(this.#klang), ringFactor: ringFactor(this.#klang) }));
  readonly #clicks = new NoteRotation();
  #klang: KlangValues;
  #running?: Running;

  // klang: the Klang panel's macros as they start, the stored ones
  constructor(klang: KlangValues) {
    this.#klang = klang;
  }

  pluck(tongue: Tongue): void {
    const { context, kalimba } = this.#start();
    const velocity = VELOCITY[0] + (VELOCITY[1] - VELOCITY[0]) * Math.random();
    kalimba.receive(this.#plucks.pluck(tongue, context.currentTime, velocity));
  }

  /** The Klang panel's macros changed: the kalimba glides there; Stimmung and Nachklang hold from the next pluck. */
  setKlang(values: KlangValues): void {
    this.#klang = values;
    this.#running?.kalimba.edited(KALIMBA_PATCH, presetFor(values));
  }

  /** A metronome tick, the first beat of a bar accented. */
  click(accent: boolean): void {
    const { context, click } = this.#start();
    const index = this.#clicks.noteOn();
    this.#clicks.noteOff(index); // its note off goes with it
    click.receive(clickMessages(accent, context.currentTime, index));
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
    this.#running = { context, ...kalimbaInstruments(context, level, Math.random, instrumentsWith(this.#klang)) };
    return this.#running;
  }
}
