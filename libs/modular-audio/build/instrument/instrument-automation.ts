// ---------- build/instrument/instrument-automation: the instrument's automation, fitted to its bank ----------
// The instrument's automation, fitted to its bank as the desk's is to the desk: a patch's value
// set at its time, as a motor turns a knob; a choice by its index, back to the choice.
// A setting's controller is set as the setting edited: the instrument builds its voices again.
// The instrument glides there itself (Instrument.edited()), so a controller's own glide is passed over.
// Each change is held on the clock's cues until its time, no lead:
//   - set at the tick that finds its time come, a tick late at most, as a switch on the desk is;
//   - one already due is set at once.
import { Cues, type Clock } from '../../../sequencing/clock/index.ts';
import type { Controller } from '../../../midi/protocol/index.ts';
import { choiceAt } from '../../../base/params/index.ts';
import type { LiveBank } from '../../plan/instrument/index.ts';
import { addressOf, type Address } from '../../../base/util/index.ts';
import type { PatchControl } from './sound-module.ts';

// a patch's value to set: its patch's name, the value's address in it, when
interface PatchChange {
  readonly patch: string;
  readonly address: Address;
  readonly of: 'values' | 'settings';
  readonly value: number | string;
  readonly t: number;
}

export class InstrumentAutomation {
  readonly #bank: Pick<LiveBank, 'edit'>;
  readonly #clock: Pick<Clock, 'now'>;
  readonly #controlOf: (patch: string, address: Address) => PatchControl | undefined;
  readonly #held: Cues<PatchChange>;

  // bank: the patches it sets; clock: its time now and its ticks;
  // controlOf: a control in a patch, none for one it hasn't
  constructor({
    bank,
    clock,
    controlOf,
  }: {
    bank: Pick<LiveBank, 'edit'>;
    clock: Pick<Clock, 'now' | 'onTick'>;
    controlOf: (patch: string, address: Address) => PatchControl | undefined;
  }) {
    this.#bank = bank;
    this.#clock = clock;
    this.#controlOf = controlOf;
    this.#held = new Cues({
      timeOf: (change: PatchChange) => change.t,
      handOn: (change: PatchChange) => this.#set(change),
    });
    clock.onTick((now) => this.#held.tick(now));
  }
  // a patch's value or setting, set on the bank at its time: its controller's name its address
  // in the patch, a control with choices set as its choice
  control(patch: string, { controller, value, t }: Controller): void {
    const address = addressOf(controller);
    const control = this.#controlOf(patch, address);
    const spec = control?.spec;
    const set = spec?.choices ? choiceAt(spec, value) : value; // a choice's index back to the choice
    this.#held.cue({ patch, address, of: control?.of ?? 'values', value: set, t }, this.#clock.now());
  }
  #set({ patch, address, of, value }: PatchChange): void {
    this.#bank.edit({ type: 'preset edited', patch, of, address, value });
  }
}
