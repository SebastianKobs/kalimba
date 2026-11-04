// ---------- build/instrument/instrument: one instrument playing one patch ----------
// As a track and the test note play it:
//   - its plan its patch's, from a file of instruments by name: an instrument of one voice
//     card, or a drum rack, a pad for each key; built by the builder handed in, into where it's
//     told, its notes played by its voices;
//   - messages in on the clock's time, each moved onto what's built's;
//   - Its inputs: one for each source, each voice into its own destination (`input()`); `receive()`
//     into its own output;
//   - its voice cards' own values, read as each voice is added: its patch's edits, then the
//     values from outside over them (a panel's knobs), set on each voice card it has;
//   - a new tempo told what's built: its synced LFOs follow.
// An edit of a patch it plays, its own or a pad's of its rack, a preset as edited:
//   1. its settings the same: each value that changed glided to on every voice sounding, and
//      set on each voice from then;
//   2. else built again from it and crossfaded, its notes sounding on.
import type { Builder, Built } from '../contract/index.ts';
import { retimed, type Message, type Receiver } from '../../../midi/protocol/index.ts';
import { type Composite, type Plan, type ValuesByAddress } from '../../plan/format/index.ts';
import { addressOf, addressText } from '../../../base/util/index.ts';
import type { Preset } from '../../plan/planner/index.ts';
import { cardPlanner, chainsOf, changesFrom, patchPlan, type Instruments } from '../../plan/instrument/index.ts';
import { Voices } from './voices.ts';

// What it's made with:
//   - instruments: the file its patch is in, as it began; patch: the patch's name;
//   - builder: what builds it, into: where its sound goes;
//   - now: what's built's time now; at: a clock time on what's built's;
//   - cardValues: its voice cards' own values from outside, by their addresses in a voice card;
//   - polyphony: the voices it sounds at once, 16 where none is given.
export interface InstrumentMaking<Into> {
  readonly instruments: Instruments;
  readonly patch: string;
  readonly builder: Builder<Into>;
  readonly into: Into;
  readonly now: () => number;
  readonly at: (t: number) => number;
  readonly cardValues?: () => Readonly<Record<string, number>>;
  readonly polyphony?: () => number;
}

export class Instrument<Into> implements Receiver {
  readonly patch: string; // the patch it plays, by its name
  readonly #at: (t: number) => number;
  readonly #cardValues: () => Readonly<Record<string, number>>;
  readonly #built: Built;
  readonly #voices: Voices;
  #instruments: Instruments; // what it's planned from: the file as it began, or the last edit's
  #plan: Plan;
  #edits: ValuesByAddress = {}; // each value an edit changed since it was planned, by its address

  constructor({
    instruments,
    patch,
    builder,
    into,
    now,
    at,
    cardValues = () => ({}),
    polyphony,
  }: InstrumentMaking<Into>) {
    this.patch = patch;
    this.#at = at;
    this.#cardValues = cardValues;
    this.#instruments = instruments;
    this.#plan = patchPlan(patch, instruments);
    this.#built = builder.build(this.#plan, { into });
    this.#voices = new Voices(this.#built, this.#plan, now, () => this.#own(), polyphony);
  }
  // messages played straight into its own output
  receive(messages: readonly Message[]): void {
    this.#voices.receive(retimed(messages, this.#at));
  }
  // an input of its own, for a track or a test note: its notes kept apart from every other input's,
  // each voice added into what into() gives as it's added
  input(into: () => Into): Receiver {
    const voices = this.#voices.input(into);
    return { receive: (messages) => voices.receive(retimed(messages, this.#at)) };
  }
  // the voices it sounds now
  get sounding(): number {
    return this.#voices.sounding;
  }
  // a new beat's length: its synced rates following it
  tempo(beat: number): void {
    this.#built.tempo(beat);
  }
  // whether it plays a patch, by its name: its own, or a pad's of its rack
  plays(name: string): boolean {
    return name === this.patch || (this.#instruments.racks[this.patch] ?? []).some(({ patch }) => patch === name);
  }
  // A patch it plays edited, its preset as edited: the values that changed set, or built again with it.
  // Its own copy kept: a bank may set its live preset in place, the next edit compared with this one.
  edited(name: string, preset: Preset): void {
    const own = structuredClone(preset);
    const edited = { ...this.#instruments, patches: { ...this.#instruments.patches, [name]: own } };
    const changed = changedValues(this.#plan, this.#instruments, edited, this.patch);
    this.#instruments = edited;
    if (changed) {
      this.#edits = { ...this.#edits, ...changed };
      this.#voices.edit(changed);
      return;
    }
    this.#plan = patchPlan(this.patch, edited);
    this.#edits = {};
    this.#voices.rebuild(this.#plan);
  }

  // its voice cards' own values now: its edits, the values from outside over them
  #own(): ValuesByAddress {
    return { ...this.#edits, ...onEveryCard(this.#plan, this.#cardValues()) };
  }
}

// values by their addresses in a voice card, on each of an instrument's voice cards
function onEveryCard(plan: Plan, values: Readonly<Record<string, number>>): ValuesByAddress {
  const cards = (plan.node as Composite).pools.map(({ child }) => child.name); // an instrument: a composite
  const onCards = cards.flatMap((card) =>
    Object.entries(values).map(([param, value]): [string, number] => [addressText([card, ...addressOf(param)]), value]),
  );
  return Object.fromEntries(onCards);
}
// What a preset's edit sets on its instrument as planned: each value that changed, by its address
// in the instrument. None where a value can't say it, a setting changed: built again.
// Its voice cards the same, a preset's alone edited: each chain's pool in its order.
function changedValues(plan: Plan, before: Instruments, after: Instruments, name: string): ValuesByAddress | null {
  const was = chainsOf(before, name);
  const cards = (plan.node as Composite).pools.map(({ child }) => child.name); // an instrument: a composite, a pool a chain
  const changed: Record<string, number | string> = {};
  for (const [index, { patch }] of chainsOf(after, name).entries()) {
    const old = was[index]!.patch; // as many chains: presets alone edited
    const architecture = cardPlanner(before).plan(old.kind);
    const { values, settings } = changesFrom(old, patch, architecture);
    if (Object.keys(settings).length) {
      return null;
    }
    for (const [text, value] of Object.entries(values)) {
      changed[addressText([cards[index]!, ...addressOf(text)])] = value;
    }
  }
  return changed;
}
