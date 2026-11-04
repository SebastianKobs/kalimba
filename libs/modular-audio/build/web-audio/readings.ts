// ---------- build/web-audio/readings: meters and readings on what's built, by address ----------
// A meter made at its first read, forgotten with its copy or a rebuild; what a block says of itself.
import { addressText, entryOf, isUnder, type Address } from '../../../base/util/index.ts';
import type { BuiltLookup } from './lookup.ts';
import { meterOn, type PeakMeter } from './meters.ts';

export class BuiltReadings {
  readonly #context: BaseAudioContext;
  readonly #lookup: BuiltLookup;
  readonly #keep: (sum: GainNode) => GainNode;
  readonly #meters = new Map<string, Map<string, PeakMeter>>(); // by a node's address as text, then its point, '' its output

  constructor({
    context,
    lookup,
    keep,
  }: {
    context: BaseAudioContext;
    lookup: BuiltLookup;
    keep: (sum: GainNode) => GainNode;
  }) {
    this.#context = context;
    this.#lookup = lookup;
    this.#keep = keep;
  }
  // A peak, as a meter reads it, the loudest sample of its last window:
  //   - on a node's main output, by its address: a channel's, after its fader and its pan;
  //   - at a point inside a block there, by name: a limiter's in and out.
  // Its meter made at its first read, so what nobody looks at has none.
  peak(address: Address, point: string): number {
    const text = addressText(address);
    const meters = entryOf(this.#meters, text, () => new Map<string, PeakMeter>());
    const meter = entryOf(meters, point, () => meterOn(this.#context, this.#listenedAt(address, point)));
    return meter.peak();
  }
  // when what a block makes has faded for good, as it says of itself: an envelope's
  faded(address: Address): number {
    return this.reading(address, 'faded');
  }
  // what a block says of itself, by name, now: a limiter's reduction, in dB
  reading(address: Address, name: string): number {
    const reading = this.#lookup.blockAt(address).readings[name];
    if (!reading) {
      throw new Error(`${addressText(address)}: no reading ${name}`);
    }
    return reading();
  }
  // the meters on a copy forgotten, as it's let go
  letGo(copy: Address): void {
    const text = addressText(copy);
    for (const metered of [...this.#meters.keys()].filter((key) => key === text || isUnder(key, text))) {
      this.#meters.delete(metered); // on what's gone
    }
  }
  // every meter forgotten: made again on what's built anew as they're read
  clear(): void {
    this.#meters.clear();
  }

  // where a meter listens: at a block's point, by name;
  // else at a node's main output, what it comes out of summed
  #listenedAt(address: Address, point: string): AudioNode {
    if (point) {
      const node = this.#lookup.blockAt(address).points[point];
      if (!node) {
        throw new Error(`${addressText(address)}: no point ${point}`);
      }
      return node;
    }
    const outputs = this.#lookup.jacksAt(address).outputs['out'] ?? [];
    if (outputs.length === 1) {
      return outputs[0]!;
    }
    const sum = this.#keep(this.#context.createGain());
    outputs.forEach((output) => output.connect(sum));
    return sum;
  }
}
