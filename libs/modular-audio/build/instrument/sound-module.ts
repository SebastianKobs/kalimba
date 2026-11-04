// ---------- build/instrument/sound-module: a multitimbral sound module ----------
// As a rack synth with its parts: a part for each patch, each an instrument playing a patch
// from the module's bank by name, as a program change picks one.
//   - A part made where it's told, by the builder handed in (instrument.ts), the first time it's
//     asked for, then kept: every track playing the patch plays into it.
//   - A patch edited in the bank: every part that plays it edited, its own or a pad's of its
//     rack; a part made after an edit made as edited.
//   - A new tempo told every part, one unchanged passed over.
//   - A param's or a setting's spec in a patch, from its voice card planned by its preset's kind.
import type { Preset } from '../../plan/planner/index.ts';
import { paramAt, settingAt, type Plan } from '../../plan/format/index.ts';
import type { ParamSpec } from '../../../base/params/index.ts';
import { cardPlanner, type Instruments } from '../../plan/instrument/index.ts';
import { entryOf, type Address, type LiveCopies } from '../../../base/util/index.ts';
import { Instrument, type InstrumentMaking } from './instrument.ts';

// where a part is made, and how: all an instrument's making but its file and its patch
export type PartMaking<Into> = Omit<InstrumentMaking<Into>, 'instruments' | 'patch'>;

// a patch's control: a value or a setting, and its spec
export interface PatchControl {
  readonly of: 'values' | 'settings';
  readonly spec: ParamSpec;
}

export class SoundModule<Into> {
  readonly #instruments: Instruments;
  readonly #bank: LiveCopies<Preset>;
  readonly #parts = new Map<string, Instrument<Into>>(); // by patch, made once
  readonly #edited = new Set<string>(); // the patches edited, by name
  readonly #cards = new Map<string, Plan>(); // each kind's voice card planned, made once
  #beat: number | undefined; // the beat last told, none at first

  // instruments: the file the patches are in, as it began; bank: its patches as they play,
  // edited in place by name
  constructor({ instruments, bank }: { instruments: Instruments; bank: LiveCopies<Preset> }) {
    this.#instruments = instruments;
    this.#bank = bank;
    bank.onSet((name, preset) => this.#edit(name, preset));
  }
  // the part playing a patch, by its name: made where making() says, the first time it's asked for
  part(patch: string, making: () => PartMaking<Into>): Instrument<Into> {
    return entryOf(this.#parts, patch, () => this.#make(patch, making()));
  }
  // the voices a patch's part sounds now, 0 for one not made yet
  sounding(patch: string): number {
    return this.#parts.get(patch)?.sounding ?? 0;
  }
  // a control in a patch, a param's or else a setting's, with its spec: its voice card's,
  // planned by its preset's kind; none for a patch the bank hasn't or an address its card hasn't
  controlOf(patch: string, address: Address): PatchControl | undefined {
    const preset = this.#bank.current(patch);
    if (!preset) {
      return undefined;
    }
    const card = entryOf(this.#cards, preset.kind, () => cardPlanner(this.#instruments).plan(preset.kind));
    const param = paramAt(card, address);
    if (param) {
      return { of: 'values', spec: param.spec };
    }
    const setting = settingAt(card, address);
    return setting && { of: 'settings', spec: setting.spec };
  }
  // a part made as its patch is edited now: the edits replayed onto it
  #make(patch: string, making: PartMaking<Into>): Instrument<Into> {
    const instrument = new Instrument({ ...making, instruments: this.#instruments, patch });
    for (const name of [...this.#edited].filter((edited) => instrument.plays(edited))) {
      instrument.edited(name, this.#bank.of(name)!); // edited: the bank has it
    }
    return instrument;
  }
  // a new beat's length, told every part; one unchanged passed over
  tempo(beat: number): void {
    if (beat === this.#beat) {
      return;
    }
    this.#beat = beat;
    for (const part of this.#parts.values()) {
      part.tempo(beat);
    }
  }

  // a patch edited in the bank: every part that plays it edited
  #edit(name: string, preset: Preset): void {
    this.#edited.add(name);
    for (const part of [...this.#parts.values()].filter((each) => each.plays(name))) {
      part.edited(name, preset);
    }
  }
}
