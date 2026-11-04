// ---------- build/web-audio/fed-sounds: sounds fed into what's built, by address ----------
// Each kept, to feed what's built anew; the ways in it made, a gain each, taken apart with it.
import { addressText, type Address } from '../../../base/util/index.ts';
import type { BuiltLookup } from './lookup.ts';
import { disconnectFrom } from './rebuild.ts';
import { connectInto, type Jacks } from './wiring.ts';

// a sound fed into a node's input, by the node's address and the input's name, to feed it again
interface Fed {
  readonly address: Address;
  readonly input: string;
  readonly source: AudioNode;
}

export class FedSounds {
  readonly #context: BaseAudioContext;
  readonly #lookup: BuiltLookup;
  readonly #fed: Fed[] = []; // each sound fed in, to feed what's built anew
  readonly #ways: AudioNode[] = []; // the ways in it made, taken apart with it

  constructor({ context, lookup }: { context: BaseAudioContext; lookup: BuiltLookup }) {
    this.#context = context;
    this.#lookup = lookup;
  }
  // A sound fed into a node's input by its address, its main one unless named:
  //   - a bus's, as a phrase plays into it;
  //   - a copy's, as a track's instrument plays into its channel.
  feed(address: Address, source: AudioNode, input: string): void {
    this.#feedNow({ address, input, source });
    this.#fed.push({ address, input, source });
  }
  // A way of its own into a node's input by its address: a gain at 1, made here, fed into it.
  // What plays into the node plays into it: a bus's phrases, a track's instrument.
  wayInto(address: Address, input: string): GainNode {
    const way = this.#context.createGain();
    this.feed(address, way, input);
    this.#ways.push(way);
    return way;
  }
  // every sound fed taken out of what those jacks lead into: an old generation's
  unplugFrom(jacks: ReadonlyMap<string, Jacks>): void {
    for (const fed of this.#fed) {
      this.#unplug(fed, jacks);
    }
  }
  // every sound fed into what's built now
  feedAgain(): void {
    this.#fed.forEach((fed) => this.#feedNow(fed));
  }
  // the sounds fed into a copy taken out of it and forgotten
  letGo(copy: Address, jacks: ReadonlyMap<string, Jacks>): void {
    const text = addressText(copy);
    for (const fed of this.#fed.filter(({ address }) => addressText(address) === text)) {
      this.#unplug(fed, jacks);
      this.#fed.splice(this.#fed.indexOf(fed), 1); // into what's gone
    }
  }
  // the ways in taken apart
  dispose(): void {
    this.#ways.forEach((way) => way.disconnect());
  }

  // a sound fed into a node's input, as built now
  #feedNow({ address, input, source }: Fed): void {
    for (const destination of this.#lookup.jacksAt(address).inputs[input] ?? []) {
      connectInto(source, destination);
    }
  }
  // a sound taken out of the inputs it leads into, in the jacks handed in
  #unplug({ input, source, address }: Fed, jacks: ReadonlyMap<string, Jacks>): void {
    (jacks.get(addressText(address))?.inputs[input] ?? []).forEach((destination) =>
      disconnectFrom(source, destination),
    );
  }
}
