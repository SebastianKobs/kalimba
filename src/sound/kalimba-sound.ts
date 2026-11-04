import { Instrument } from '../../libs/modular-audio/build/instrument/index.ts';
import { Buffers } from '../../libs/modular-audio/build/web-audio/index.ts';
import { buildingIn } from '../../libs/modular-audio/build/web-audio-engine/index.ts';
import { NoteRotation, type Message } from '../../libs/midi/protocol/index.ts';
import type { Tongue } from '../layout';
import { CLICK_PATCH, KALIMBA_PATCH } from './kalimba-card';
import { instrumentsWith, pitchOffset, presetFor, resonanceGain, ringFactor, type KlangValues } from './klang';
import { clickMessages, Plucks } from './plucks';
import { excitationFor, resonatorsFor } from './resonance';
import { ResonanceBank } from './resonance-bank';

// tines ring up to ~6 s: a fast run needs more voices than a synth's 16
const POLYPHONY = 24;

export interface KalimbaSoundMaking {
  readonly context: BaseAudioContext;
  readonly into: AudioNode;
  /** the noise's draws: the click's offsets, the bridge's knock */
  readonly random: () => number;
  readonly klang: KlangValues;
  readonly tongues: readonly Tongue[];
}

/**
 * Edge: the kalimba's whole sound in one context, the same for the live player and an offline render: the tine and
 * click instruments (built from their voice cards), the plucks, the other tongues ringing along.
 */
export class KalimbaSound {
  readonly #kalimba: Instrument<AudioNode>;
  readonly #click: Instrument<AudioNode>;
  readonly #plucks: Plucks;
  readonly #clicks = new NoteRotation();
  readonly #bank: ResonanceBank;
  #klang: KlangValues;
  #tongues: readonly Tongue[];

  constructor({ context, into, random, klang, tongues }: KalimbaSoundMaking) {
    this.#klang = klang;
    this.#tongues = tongues;
    const building = buildingIn({ context, into, at: (t) => t, beat: () => 0.5, buffers: new Buffers(context, random) });
    const instruments = instrumentsWith(klang);
    const instrument = (patch: string) => new Instrument({ instruments, patch, ...building, polyphony: () => POLYPHONY });
    this.#kalimba = instrument(KALIMBA_PATCH);
    this.#click = instrument(CLICK_PATCH);
    this.#plucks = new Plucks(() => ({ pitchOffset: pitchOffset(this.#klang), ringFactor: ringFactor(this.#klang) }));
    this.#bank = new ResonanceBank(context, into, random);
    this.#setBank();
  }

  pluck(tongue: Tongue, t: number, velocity: number): void {
    this.#kalimba.receive(this.#plucks.pluck(tongue, t, velocity));
    this.#bank.excite(t, velocity, excitationFor(tongue, this.#tongues));
  }

  /** A metronome tick at t, the first beat of a bar accented. */
  click(accent: boolean, t: number): void {
    const index = this.#clicks.noteOn();
    this.#clicks.noteOff(index); // its note off goes with it
    this.#click.receive(clickMessages(accent, t, index));
  }

  /** Messages straight into the kalimba's instrument. */
  receive(messages: readonly Message[]): void {
    this.#kalimba.receive(messages);
  }

  /** The Klang panel's macros changed: the kalimba glides there, the bank follows. */
  setKlang(values: KlangValues): void {
    this.#klang = values;
    this.#kalimba.edited(KALIMBA_PATCH, presetFor(values));
    this.#setBank();
  }

  /** The tongues retuned: the bank's resonators follow. */
  setTongues(tongues: readonly Tongue[]): void {
    this.#tongues = tongues;
    this.#setBank();
  }

  #setBank(): void {
    const klang = this.#klang;
    this.#bank.set(resonatorsFor(this.#tongues, ringFactor(klang), pitchOffset(klang)), resonanceGain(klang));
  }
}
