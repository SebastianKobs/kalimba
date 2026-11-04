// ---------- build/web-audio/built: what the Web Audio builder hands back ----------
// The thing built, as its front panel (libs/modular-audio/build/contract/):
//   - a param set or automated by its address: a block's, on what's built of it; a macro's, onto
//     its targets; a choice by its index, as its block's param holds it; a placeholder's left alone;
//   - a preset's values set together; a new tempo told what follows it;
//   - a pool's copy added by its own address, its pool's name and its number (my tap/3), wired by
//     its rule, its sources started at its time, now unless given, its outputs into a destination
//     of its own where it's given one; let go;
//   - built again: the new beside the old, its inputs moved over, the values told and the copies
//     added kept, the old ringing out, faded where it makes sound of its own (rebuild.ts); a preset
//     that changes a setting built again with it;
//   - its placeholders, by address; taken apart, its sources stopped, its nodes disconnected.
// What a studio needs of it besides, Web Audio's own, not every builder's:
//   - a sound fed into a node's input by its address: a bus's, a copy's; or a way of its
//     own in, a gain it makes; each fed into what's built anew, as its inputs are;
//   - a meter on a node's output by its address, or at a point inside a block;
//     made at its first read;
//   - what a block says of itself, by name: a limiter's reduction;
//   - what a node is built as, for who names it or listens to it: its jacks' nodes; every
//     node under it.
// Each its own part, made here: fed-sounds.ts, readings.ts, lookup.ts.
// Times are the context's.
import { eventOf, timedAt, type Automation, type When } from '../../../base/automation/index.ts';
import { choiceIndex } from '../../../base/params/index.ts';
import { addressOf, addressText, isUnder, type Address } from '../../../base/util/index.ts';
import {
  copyOf,
  isCopyNumber,
  macroIn,
  mapOnto,
  paramAt,
  settingAt,
  withSettings,
  type Node,
  type Plan,
  type ValuesByAddress,
} from '../../plan/format/index.ts';
import type { Built } from '../contract/index.ts';
import { automate } from './automation.ts';
import { FedSounds } from './fed-sounds.ts';
import { BuiltLookup } from './lookup.ts';
import { BuiltParts, type PoolHolder } from './parts.ts';
import { BuiltReadings } from './readings.ts';
import { CROSSFADE, disconnectFrom, fadedBy, fadedThrough, RING_OUT } from './rebuild.ts';
import { connectInto, wireCopy, type Jacks } from './wiring.ts';

// a copy as added: its parts, the composite it's in, its name there as its wires name it, its address, to add it again
interface Copy {
  readonly parts: BuiltParts;
  readonly holder: PoolHolder;
  readonly name: string;
  readonly address: Address;
  readonly at: number | undefined; // when it was added for, none now
  readonly into: AudioNode | undefined; // where its outputs go, in place of its composite's own output
  readonly outputs: readonly AudioNode[]; // its outputs that lead into it, none without
  fade?: GainNode; // the fade its outputs lead through, once it's been faded
}
// what's built of one plan: its plan, its parts, its jacks at the top, its copies by their addresses as text
interface Generation {
  readonly plan: Plan;
  readonly parts: BuiltParts;
  readonly top: Jacks;
  readonly copies: Map<string, Copy>;
  fade?: GainNode; // the fade its main output leads through, once it's been faded
}
// what what's built is made with: the context, where its sound goes and where its inputs come from, and how
// a plan and a copy's node are built into parts
export interface Building {
  readonly context: BaseAudioContext;
  readonly into: AudioNode;
  readonly from: Readonly<Record<string, AudioNode>>;
  readonly planned: (plan: Plan) => { parts: BuiltParts; top: Jacks };
  readonly copied: (node: Node, at: Address, parts: BuiltParts) => Jacks;
}

export class WebAudioBuilt implements Built {
  readonly #building: Building;
  readonly #told = new Map<string, number | string>(); // each value set, by its address as text, to tell again
  readonly #lookup: BuiltLookup;
  readonly #feeding: FedSounds;
  readonly #readings: BuiltReadings;
  #now: Generation;

  constructor(plan: Plan, building: Building) {
    this.#building = building;
    this.#lookup = new BuiltLookup(() => this.#now.parts);
    this.#feeding = new FedSounds({ context: building.context, lookup: this.#lookup });
    this.#readings = new BuiltReadings({
      context: building.context,
      lookup: this.#lookup,
      keep: (sum) => this.#now.parts.keep(sum),
    });
    this.#now = this.#generationOf(plan);
  }
  get placeholders(): readonly Address[] {
    return this.#now.parts.placeholders;
  }
  // a param set by its address: now, at a time, or gliding there from now; kept, to tell it again
  set(address: Address, value: number | string, when: When = {}): void {
    this.#paramNamed(address);
    const at = timedAt(this.#numberOf(address, value), when, this.#context().currentTime);
    this.automate(address, [eventOf(at)], 0);
    this.#told.set(addressText(address), value);
  }
  // a param automated by its address, its events' times from a time, now unless given
  automate(address: Address, automation: readonly Automation[], from = this.#context().currentTime): void {
    this.#paramNamed(address);
    const name = address.at(-1)!;
    const macro = macroIn(this.#now.plan.node, address);
    if (macro) {
      for (const target of macro.maps) {
        const mapped = automation.map((event) => mappedEvent(event, (value) => mapOnto(target, value)));
        this.automate([...address.slice(0, -1), ...target.to], mapped, from);
      }
      return;
    }
    const built = this.#now.parts.blocks.get(addressText(address.slice(0, -1)));
    if (!built) {
      throw new Error(`${addressText(address)}: not built`); // a copy not added
    }
    const param = built.param(name); // none on a placeholder, or a pan made a gain where the context can't pan
    if (param) {
      automate(param, automation, from);
    }
  }
  // A preset sent: a setting it changes built again with it; its values by their addresses set
  // together, at one time.
  preset(values: ValuesByAddress, settings: ValuesByAddress = {}, when: When = {}): void {
    const plan = this.#now.plan;
    const changes = Object.entries(settings).some(([text, value]) => settingAt(plan, addressOf(text))?.value !== value);
    if (changes) {
      this.rebuild(withSettings(plan, settings));
    }
    for (const [text, value] of Object.entries(values)) {
      this.set(addressOf(text), value, when);
    }
  }
  // a new beat told what follows it, its synced delays' times: gliding there unless told otherwise
  tempo(beat: number, when: When = {}): void {
    for (const follower of this.#now.parts.tempoFollowers) {
      follower(beat, when, this.#context().currentTime);
    }
  }
  // A pool's copy added by its own address, its pool's name and its number from 1 (my tap/3):
  // built from the pool's child, wired by its rule, set by its address; its sources started at a
  // time, now unless given. Given a destination, its outputs go into it, not into the composite's.
  add(copy: Address, at?: number, into?: AudioNode): void {
    const pool = copy.slice(0, -1); // its pool's address: the pool's parent's, and its name
    const number = copy.at(-1) ?? '';
    const holder = this.#now.parts.poolHolders.get(addressText(pool.slice(0, -1)));
    const kept = holder?.node.pools?.find((each) => each.child.name === pool.at(-1));
    if (!holder || !kept) {
      throw new Error(`${addressText(pool)}: no pool`);
    }
    if (!isCopyNumber(number)) {
      throw new Error(`${addressText(copy)}: a copy is numbered from 1`);
    }
    const { node, wires } = copyOf(kept, Number(number));
    const name = addressText([kept.child.name, node.name]); // as its wires name it, among the composite's children
    if (holder.children.has(name)) {
      throw new Error(`${addressText(copy)}: added already`);
    }
    const parts = new BuiltParts();
    holder.children.set(name, this.#building.copied(node, copy, parts));
    const outputs = wireCopy(holder.node, wires, holder, into);
    this.#now.parts.takeIn(parts);
    this.#now.copies.set(addressText(copy), { parts, holder, name, address: copy, at, into, outputs });
    parts.startSources(at);
  }
  // A sound fed into a node's input by its address, its main one unless named:
  //   - a bus's, as a phrase plays into it;
  //   - a copy's, as a track's instrument plays into its channel.
  feed(address: Address, source: AudioNode, input = 'in'): void {
    this.#feeding.feed(address, source, input);
  }
  // A way of its own into a node's input by its address: a gain at 1, made here, fed into it.
  // What plays into the node plays into it: a bus's phrases, a track's instrument.
  wayInto(address: Address, input = 'in'): GainNode {
    return this.#feeding.wayInto(address, input);
  }
  // A peak, as a meter reads it, the loudest sample of its last window:
  //   - on a node's main output, by its address: a channel's, after its fader and its pan;
  //   - at a point inside a block there, by name: a limiter's in and out.
  // Its meter made at its first read, so what nobody looks at has none.
  peak(address: Address, point = ''): number {
    return this.#readings.peak(address, point);
  }
  // when what a block makes has faded for good, as it says of itself: an envelope's
  faded(address: Address): number {
    return this.#readings.faded(address);
  }
  // what a block says of itself, by name, now: a limiter's reduction, in dB
  reading(address: Address, name: string): number {
    return this.#readings.reading(address, name);
  }
  // A node's jacks as built, by its address: the Web Audio nodes each input goes into and
  // each output comes out of, a param's left out.
  jacksOf(address: Address): {
    inputs: Record<string, readonly AudioNode[]>;
    outputs: Record<string, readonly AudioNode[]>;
  } {
    return this.#lookup.jacksOf(address);
  }
  // Every Web Audio node built under an address: each of its blocks' nodes, as its maker
  // made them.
  nodesUnder(address: Address): AudioNode[] {
    return this.#lookup.nodesUnder(address);
  }
  // a copy's sources stopped by a time, as it's gone silent then: none later than its own stop
  stopBy(copy: Address, at: number): void {
    this.#added(copy).parts.stopSourcesBy(at);
  }
  // a copy let go: its sources stopped, its nodes disconnected, its address no longer set, what it was told forgotten
  letGo(copy: Address): void {
    const text = addressText(copy);
    const added = this.#added(copy);
    this.#feeding.letGo(copy, this.#now.parts.jacks);
    added.parts.takeApart();
    this.#now.parts.giveBack(added.parts);
    added.holder.children.delete(added.name);
    this.#now.copies.delete(text);
    for (const told of [...this.#told.keys()].filter((key) => isUnder(key, text))) {
      this.#told.delete(told);
    }
    this.#readings.letGo(copy);
  }
  // Built again from a plan, the new beside the old:
  //   1. its inputs moved over to the new;
  //   2. the old faded out and the new faded in, where the old makes sound of its own, its sources
  //      stopped once faded;
  //   3. the copies added, each at its own time, and the values told, told the new again;
  //   4. the old let go once it has rung out.
  rebuild(plan: Plan): void {
    const old = this.#now;
    for (const [name, source] of Object.entries(this.#building.from)) {
      (old.top.inputs[name] ?? []).forEach((destination) => disconnectFrom(source, destination));
    }
    this.#feeding.unplugFrom(old.parts.jacks);
    this.#now = this.#generationOf(plan);
    this.#readings.clear(); // on the old: made again on the new as they're read
    if (makesSound(old)) {
      this.#faded(old, [1, 0]);
      this.#faded(this.#now, [0, 1]);
      stoppedBy(old, this.#context().currentTime + CROSSFADE);
    }
    for (const copy of old.copies.values()) {
      this.add(copy.address, copy.at, copy.into);
      if (copy.into && copy.parts.sources.length > 0) {
        this.#fadedCopy(copy, [1, 0]);
        this.#fadedCopy(this.#added(copy.address), [0, 1]);
      }
    }
    this.#feeding.feedAgain();
    for (const [text, value] of this.#told) {
      this.set(addressOf(text), value);
    }
    setTimeout(() => takeApart(old), RING_OUT);
  }
  dispose(): void {
    takeApart(this.#now);
    this.#feeding.dispose();
  }

  // a plan built into a generation: fed from where its inputs come from, its main output into where it goes
  #generationOf(plan: Plan): Generation {
    const { into, from, planned } = this.#building;
    const { parts, top } = planned(plan);
    for (const [name, source] of Object.entries(from)) {
      (top.inputs[name] ?? []).forEach((destination) => connectInto(source, destination));
    }
    for (const output of top.outputs.out ?? []) {
      output.connect(into);
    }
    parts.startSources();
    return { plan, parts, top, copies: new Map() };
  }
  // a generation's main output faded from one level to another, through a fade it keeps
  #faded(generation: Generation, levels: [number, number]): void {
    generation.fade = this.#fadedThrough(generation.top.outputs.out ?? [], generation, this.#building.into, levels);
  }
  // a copy's outputs into its destination faded from one level to another, through a fade it keeps
  #fadedCopy(copy: Copy, levels: [number, number]): void {
    copy.fade = this.#fadedThrough(copy.outputs, copy, copy.into!, levels); // a copy with a destination
  }
  // Outputs faded from one level to another on their way into a destination, the fade kept with
  // the parts: the one they lead through already, faded in by a rebuild before; else one put between.
  #fadedThrough(
    outputs: readonly AudioNode[],
    { parts, fade }: { parts: BuiltParts; fade?: GainNode | undefined },
    into: AudioNode,
    levels: [number, number],
  ): GainNode {
    const context = this.#context();
    if (fade) {
      fadedBy(fade, levels, context.currentTime);
      return fade;
    }
    const made = parts.keep(context.createGain());
    fadedThrough(outputs, { into, levels, fade: made, now: context.currentTime });
    return made;
  }
  #context(): BaseAudioContext {
    return this.#building.context;
  }
  // a copy added, by its address; one not added refused
  #added(copy: Address): Copy {
    const added = this.#now.copies.get(addressText(copy));
    if (!added) {
      throw new Error(`${addressText(copy)}: not added`);
    }
    return added;
  }
  // a param's spec by its address; a setting's or nothing's refused
  #paramNamed(address: Address): void {
    if (paramAt(this.#now.plan, address)) {
      return;
    }
    if (settingAt(this.#now.plan, address)) {
      throw new Error(`${addressText(address)}: a setting, sent with a preset`);
    }
    throw new Error(`${addressText(address)}: no param`);
  }
  // a value as its param holds it: a number as it is, a choice by its index among its param's choices
  #numberOf(address: Address, value: number | string): number {
    if (typeof value === 'number') {
      return value;
    }
    const spec = paramAt(this.#now.plan, address)?.spec;
    const index = spec ? choiceIndex(spec, value) : -1;
    if (index === -1) {
      throw new Error(`${addressText(address)}: no choice ${value}`);
    }
    return index;
  }
}

// an event's value mapped, its time kept; a cancel, which holds a time, as it is
function mappedEvent(event: Automation, map: (value: number) => number): Automation {
  if (event[0] === 'cancel') {
    return event;
  }
  const [kind, value, ...rest] = event;
  return [kind, map(value), ...rest] as Automation;
}
// whether a generation makes sound of its own: a source running in it or in a copy
function makesSound({ parts, copies }: Generation): boolean {
  return parts.sources.length > 0 || [...copies.values()].some((copy) => copy.parts.sources.length > 0);
}
// a generation's sources stopped by a time, its copies' too
function stoppedBy({ parts, copies }: Generation, at: number): void {
  parts.stopSourcesBy(at);
  for (const copy of copies.values()) {
    copy.parts.stopSourcesBy(at);
  }
}
// a generation taken apart: its sources stopped, its nodes disconnected, its copies' too
function takeApart({ parts, copies }: Generation): void {
  parts.takeApart();
  for (const copy of copies.values()) {
    copy.parts.takeApart();
  }
}
