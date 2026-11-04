// ---------- build/instrument/instrument-surface: the instrument's own control surface ----------
// A patch's knob moved by hand, on a device view, played into the input handed in (a sequencer)
// as a controller on the patch's own track, as any control surface plays into it: so it's
// recorded on that track's lanes, as every controller is, and reaches the patch the way they do
// (instrument-automation.ts). The desk's surface does the same for a strip.
//   - The controller: its param's address in the patch (voice/cutoff).
//   - Gliding there, but a choice, a switch or a time that never glides (atItsTime()).
//   - A choice by its index among its param's choices, as a controller carries it: a patch's
//     setting too (a waveform), as a synth's switch is played.
//   - A reset is not played: the bank's edit at once, as a rebuild isn't automation.
//   - The track the patch's, its owner's to name; the stream's label for it none.
//   - Each move told to whoever listens: the transport passing that lane over while it plays
//     back.
// A patch's edit by address, as a message on a bus (a device's knob turned):
//   - a value or a setting: played in as its patch's controller;
//   - a reset: the bank's edit at once, not recorded.
import { SMOOTHING } from '../../../base/automation/index.ts';
import type { Clock } from '../../../sequencing/clock/index.ts';
import type { Controller } from '../../../midi/protocol/index.ts';
import { atItsTime, choiceIndex } from '../../../base/params/index.ts';
import type { LiveBank, PresetMessage } from '../../plan/instrument/index.ts';
import { addressText, Events, type Address } from '../../../base/util/index.ts';
import type { PatchControl } from './sound-module.ts';

// Where a move is played: a controller sent to a patch's track.
interface MoveInput<Label> {
  send(to: { track: string; play: Label | undefined }, messages: readonly Controller[]): void;
}

export class InstrumentSurface<Label> {
  readonly #bank: Pick<LiveBank, 'edit'>;
  readonly #clock: Pick<Clock, 'now'>;
  readonly #input: MoveInput<Label>;
  readonly #track: (patch: string) => string;
  readonly #controlOf: (patch: string, address: Address) => PatchControl | undefined;
  readonly #events = new Events<{ control: [track: string, controller: string] }>();

  // bank: the patches a reset is handed to; track: a patch's track's key;
  // controlOf: a control in a patch, none for one it hasn't
  constructor({
    bank,
    clock,
    input,
    track,
    controlOf,
  }: {
    bank: Pick<LiveBank, 'edit'>;
    clock: Pick<Clock, 'now'>;
    input: MoveInput<Label>;
    track: (patch: string) => string;
    controlOf: (patch: string, address: Address) => PatchControl | undefined;
  }) {
    this.#bank = bank;
    this.#clock = clock;
    this.#input = input;
    this.#track = track;
    this.#controlOf = controlOf;
  }
  // a patch's edit as the app asks it
  edit(message: PresetMessage): void {
    if (message.type === 'preset reset') {
      this.#bank.edit(message);
      return;
    }
    const { patch, address, value } = message;
    const spec = this.#controlOf(patch, address)?.spec;
    const controller = addressText(address);
    const track = this.#track(patch);
    const t = this.#clock.now();
    this.#events.emit('control', track, controller);
    const index = typeof value === 'number' ? value : choiceIndex(spec!, value); // a choice is a param's, found there
    const change: Controller =
      !spec || !atItsTime(spec) ?
        { type: 'controller', controller, value: index, t, glide: SMOOTHING }
      : { type: 'controller', controller, value: index, t };
    this.#input.send({ track, play: undefined }, [change]);
  }
  onControl(listener: (track: string, controller: string) => void): void {
    this.#events.on('control', listener);
  }
}
