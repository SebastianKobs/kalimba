import { Instrument } from '../../libs/modular-audio/build/instrument/index.ts';
import { Buffers } from '../../libs/modular-audio/build/web-audio/index.ts';
import { buildingIn } from '../../libs/modular-audio/build/web-audio-engine/index.ts';
import { NoteRotation, type Message } from '../../libs/midi/protocol/index.ts';
import type { Tongue } from '../layout';
import { CLICK_PATCH, KALIMBA_PATCH } from './kalimba-card';
import { hallGain, instrumentsWith, pitchOffset, presetFor, resonanceGain, ringFactor, type KlangValues } from './klang';
import { clickMessages, Plucks } from './plucks';
import { excitationFor, resonatorsFor } from './resonance';
import { ResonanceBank } from './resonance-bank';
import { roomPlan } from './room';

// tines ring up to ~6 s: a fast run needs more voices than a synth's 16
const POLYPHONY = 24;

export interface KalimbaSoundMaking {
  readonly context: BaseAudioContext;
  readonly into: AudioNode;
  /** the noise's draws: the click's offsets and strength, the room's impulse */
  readonly random: () => number;
  readonly klang: KlangValues;
  readonly tongues: readonly Tongue[];
}

/**
 * Edge: the kalimba's whole sound in one context, the same for the live player and an offline render: the tine and
 * click instruments (built from their voice cards), the plucks, the other tongues ringing along, a small room.
 */
export class KalimbaSound {
  readonly #kalimba: Instrument<AudioNode>;
  readonly #click: Instrument<AudioNode>;
  readonly #plucks: Plucks;
  readonly #clicks = new NoteRotation();
  readonly #bank: ResonanceBank;
  readonly #roomSend: GainNode;
  #klang: KlangValues;
  #tongues: readonly Tongue[];

  constructor({ context, into, random, klang, tongues }: KalimbaSoundMaking) {
    this.#klang = klang;
    this.#tongues = tongues;
    // everything into a bus: straight on, and through a send into a small room, back into the same output
    const bus = context.createGain();
    bus.connect(into);
    this.#roomSend = context.createGain();
    bus.connect(this.#roomSend);
    const buffers = new Buffers(context, random);
    // one random for the noise, where each click starts in it and how hard: one seed, one render
    const building = (where: AudioNode) => buildingIn({ context, into: where, at: (t) => t, beat: () => 0.5, buffers, draws: random });
    building(into).builder.build(roomPlan(), { into, from: { in: this.#roomSend } });
    const instruments = instrumentsWith(klang);
    const instrument = (patch: string, where: AudioNode) =>
      new Instrument({ instruments, patch, ...building(where), polyphony: () => POLYPHONY });
    this.#kalimba = instrument(KALIMBA_PATCH, bus);
    this.#click = instrument(CLICK_PATCH, into); // the metronome dry: a click in a room blurs the beat
    this.#plucks = new Plucks(() => ({ pitchOffset: pitchOffset(this.#klang), ringFactor: ringFactor(this.#klang) }), random);
    this.#bank = new ResonanceBank(context, bus);
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
    this.#roomSend.gain.value = hallGain(klang);
  }
}
