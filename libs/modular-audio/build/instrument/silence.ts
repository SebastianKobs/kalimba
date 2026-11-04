// ---------- build/instrument/silence: when a voice has rung out ----------
// Worked out from its voice card's plan, as a synth stops a note's sources:
//   1. A gain resting at nothing, opened only by envelopes, closes once they have all faded.
//   2. A block is silent from where a gain it is closes, or as late as the latest of where its
//      sound goes; the voice's own output never, a block whose sound goes nowhere at once.
//   3. A source nothing closes is silent as its note's last envelope fades: a gate's release, a
//      trigger's run, which goes on past its note off.
//   4. A sound into a stage's param (a filter's cutoff) is heard only while sound reaches that
//      stage, no longer; a stage with a tail (a delay, a reverb) sounds on past its input.
//   5. The voice has rung out once every source is: an oscillator, a noise, an envelope; an LFO
//      or FM with the sound it moves.
// Its blocks' sound followed across its composites, through their macros.
import { SILENCE } from '../../../base/params/index.ts';
import { BLOCKS, type Block, type BlockKind } from '../../plan/blocks/index.ts';
import { isComposite, macroIn, nodeIn, paramIn, type Composite, type Node } from '../../plan/format/index.ts';
import { addressOf, addressText, type Address } from '../../../base/util/index.ts';
import type { Wire } from '../../plan/format/index.ts';

// where a block's sound goes: another block's input, or one of its params; out of the voice, none
interface Into {
  readonly block: string;
  readonly param: string | undefined;
}
// a block's sound into where it goes, by their addresses within the voice card as text
interface Edge {
  readonly from: string;
  readonly into: Into | null;
}

export class Silence {
  readonly #blocks = new Map<string, Node>(); // by its address within the voice card, as text
  readonly #edges: Edge[] = [];

  constructor(card: Composite) {
    this.#collect(card, [], true);
  }
  // When a voice of this card is silent for good: each of its envelopes' faded times by their
  // addresses within it, its note's end where it has one.
  silentFrom(faded: (address: Address) => number, end: number | undefined): number {
    const fadedAt = (block: string): number => faded(addressOf(block));
    const envelopes = [...this.#blocks].filter(([, node]) => node.kind === 'envelope').map(([block]) => block);
    const lastRelease = end === undefined ? Infinity : Math.max(end, ...envelopes.map(fadedAt));
    const sources = [...this.#blocks].filter(([, node]) => !node.inputs.length).map(([block]) => block);
    return Math.max(
      -Infinity,
      ...sources.map((source) => Math.min(this.#silent(source, fadedAt, new Set()), lastRelease)),
    );
  }

  // a composite's blocks, by their addresses, and its wires' edges, those of the composites inside it too
  #collect(node: Composite, at: Address, isCard: boolean): void {
    for (const child of node.children) {
      const address = [...at, child.name];
      if (isComposite(child)) {
        this.#collect(child, address, false);
      } else {
        this.#blocks.set(addressText(address), child);
      }
    }
    for (const { from, to } of node.wires) {
      for (const block of soundsFrom(node, from, at)) {
        for (const into of soundsInto(node, to, at, isCard)) {
          this.#edges.push({ from: block, into });
        }
      }
    }
  }
  // from when a block is silent for good: where a gain it is closes, or as late as where its sound goes
  #silent(block: string, fadedAt: (block: string) => number, visiting: Set<string>): number {
    if (visiting.has(block)) {
      return Infinity; // a loop, never silent of itself
    }
    visiting.add(block);
    const onward = this.#edges.filter((edge) => edge.from === block);
    const latest = Math.max(...onward.map(({ into }) => this.#heardInto(into, fadedAt, visiting)));
    visiting.delete(block);
    return Math.min(this.#closed(block, fadedAt), latest);
  }
  // Until when a sound is heard where it goes: out of the voice, always; into a block, as long as
  // that block is; into a param, no longer than the block carries sound, a stage only what reaches it.
  #heardInto(into: Into | null, fadedAt: (block: string) => number, visiting: Set<string>): number {
    if (into === null) {
      return Infinity;
    }
    const onward = this.#silent(into.block, fadedAt, visiting);
    if (into.param === undefined) {
      return onward;
    }
    return Math.min(onward, this.#carrying(into.block, fadedAt, new Set()));
  }
  // Until when a block's output carries sound: a source and a stage with a tail, always; any other
  // stage no longer than sound reaches its inputs, and closed where a gain it is closes.
  #carrying(block: string, fadedAt: (block: string) => number, visiting: Set<string>): number {
    const node = this.#blocks.get(block)!; // one of its blocks
    if (!node.inputs.length || hasTail(node) || visiting.has(block)) {
      return Infinity;
    }
    visiting.add(block);
    const feeding = this.#edges.filter(({ into }) => into?.block === block && into.param === undefined);
    const reaching = Math.max(-Infinity, ...feeding.map(({ from }) => this.#carrying(from, fadedAt, visiting)));
    return Math.min(this.#closed(block, fadedAt), reaching);
  }
  // when a gain resting at nothing closes, opened only by envelopes: once they have all faded; never else
  #closed(block: string, fadedAt: (block: string) => number): number {
    const node = this.#blocks.get(block)!; // one of its blocks
    const level = paramIn(node, ['gain'])?.value;
    if (node.kind !== 'gain' || typeof level !== 'number' || level > SILENCE) {
      return Infinity;
    }
    const envelopes = this.#openedBy(block, 'gain', new Set());
    if (!envelopes) {
      return Infinity;
    }
    return Math.max(-Infinity, ...envelopes.map(fadedAt));
  }
  // The envelopes whose sound reaches a block's param, or its inputs where none is named, back
  // through what passes their sound on; none where another source reaches it.
  #openedBy(block: string, param: string | undefined, visiting: Set<string>): string[] | null {
    const found: string[] = [];
    const feeding = this.#edges.filter(({ into }) => into?.block === block && into.param === param);
    for (const { from } of feeding) {
      const node = this.#blocks.get(from)!; // one of its blocks
      const inner = this.#feedersOf(from, node, visiting);
      if (!inner) {
        return null;
      }
      found.push(...inner);
    }
    return found;
  }
  // an envelope itself; another source, none; else what reaches its inputs
  #feedersOf(block: string, node: Node, visiting: Set<string>): string[] | null {
    if (node.kind === 'envelope') {
      return [block];
    }
    if (!node.inputs.length || visiting.has(block)) {
      return null;
    }
    visiting.add(block);
    return this.#openedBy(block, undefined, visiting);
  }
}

// whether a block sounds on after its input stops, as its kind declares; one of no known kind passes its sound on
function hasTail(node: Node): boolean {
  const block: Block | undefined = BLOCKS[node.kind as BlockKind];
  return block?.tail === true;
}
// The blocks whose sound a wire's start carries in a composite: a child block's; a child
// composite's output's, followed inside; none for its own input, led in from outside.
function soundsFrom(node: Composite, from: Wire['from'], at: Address): string[] {
  if (!('node' in from)) {
    return [];
  }
  const child = nodeIn(node, [from.node])!; // a well-formed plan's
  const address = [...at, child.name];
  if (!isComposite(child)) {
    return [addressText(address)];
  }
  return child.wires
    .filter(({ to }) => !('node' in to) && to.output === from.output)
    .flatMap((wire) => soundsFrom(child, wire.from, address));
}
// Where a wire's end in a composite takes a sound: a child block's input or param; a child
// composite's input or macro, followed inside; its own output out of the voice, where it's the
// voice card, else led on from outside.
function soundsInto(node: Composite, to: Wire['to'], at: Address, isCard: boolean): (Into | null)[] {
  if (!('node' in to)) {
    return isCard ? [null] : [];
  }
  const child = nodeIn(node, [to.node])!; // a well-formed plan's
  const address = [...at, child.name];
  if (!isComposite(child)) {
    return [{ block: addressText(address), param: 'param' in to ? to.param : undefined }];
  }
  if ('param' in to) {
    return macroInto(child, to.param, address);
  }
  return child.wires
    .filter(({ from }) => !('node' in from) && from.input === to.input)
    .flatMap((wire) => soundsInto(child, wire.to, address, false));
}
// where a sound into a composite's macro goes: each of its maps' targets, followed down
function macroInto(node: Composite, name: string, at: Address): Into[] {
  const maps = macroIn(node, [name])?.maps ?? [];
  return maps.flatMap(({ to }) => paramInto(node, to, at));
}
// a param by its address within a composite: a child block's own; a child composite's macro, followed down
function paramInto(node: Composite, [name, ...rest]: Address, at: Address): Into[] {
  const child = nodeIn(node, [name!])!; // a well-formed plan's
  const address = [...at, child.name];
  if (rest.length > 1 && isComposite(child)) {
    return paramInto(child, rest, address);
  }
  if (!isComposite(child)) {
    return [{ block: addressText(address), param: rest[0] }];
  }
  return macroInto(child, rest[0]!, address);
}
