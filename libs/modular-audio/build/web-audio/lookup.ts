// ---------- build/web-audio/lookup: what's built, looked up by address ----------
// A node's jacks and a block, as built now; a node's jacks' Web Audio nodes; every node under an address.
import { addressText, isUnder, type Address } from '../../../base/util/index.ts';
import type { BuiltNode } from './built-node.ts';
import type { BuiltParts } from './parts.ts';
import type { Jacks } from './wiring.ts';

export class BuiltLookup {
  readonly #parts: () => BuiltParts; // what's built now, as its generation has it

  constructor(parts: () => BuiltParts) {
    this.#parts = parts;
  }
  // a node's jacks as built, by its address; one not built refused
  jacksAt(address: Address): Jacks {
    const jacks = this.#parts().jacks.get(addressText(address));
    if (!jacks) {
      throw new Error(`${addressText(address)}: not built`);
    }
    return jacks;
  }
  // a block as built, by its address; one not built refused
  blockAt(address: Address): BuiltNode {
    const built = this.#parts().blocks.get(addressText(address));
    if (!built) {
      throw new Error(`${addressText(address)}: not built`);
    }
    return built;
  }
  // A node's jacks as built, by its address: the Web Audio nodes each input goes into and
  // each output comes out of, a param's left out.
  jacksOf(address: Address): {
    inputs: Record<string, readonly AudioNode[]>;
    outputs: Record<string, readonly AudioNode[]>;
  } {
    const jacks = this.jacksAt(address);
    const inputs = Object.entries(jacks.inputs).map(([name, at]): [string, AudioNode[]] => [
      name,
      at.filter((one): one is AudioNode => 'connect' in one), // a param's left out
    ]);
    return { inputs: Object.fromEntries(inputs), outputs: Object.fromEntries(Object.entries(jacks.outputs)) };
  }
  // Every Web Audio node built under an address: each of its blocks' nodes, as its maker
  // made them.
  nodesUnder(address: Address): AudioNode[] {
    const text = addressText(address);
    const under = [...this.#parts().made].filter(([at]) => at === text || isUnder(at, text));
    return [...new Set(under.flatMap(([, nodes]) => nodes))];
  }
}
