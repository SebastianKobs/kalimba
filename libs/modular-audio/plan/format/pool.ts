// ---------- plan/format/pool: children that come and go, in a plan ----------
// Its child ready, named as the pool is (my tap). Each copy under it, named by its number
// from 1, so its address is the pool's name and its number (my tap/3). Its wires the rule each
// copy is wired by, written with the pool's name. A pool of voices holds the addresses its
// notes set, and, as a drum rack's pad, the key that plays it.
import { addressText, type Address } from '../../../base/util/index.ts';
import type { Composite } from './node.ts';
import type { Node } from './node.ts';
import { renamedEnd, type Wire } from './wire.ts';

// The params a note sets in a voice, as CV sets a voice card's: by the note's sources' names,
// as the instrument names them (frequency, gate), each into its addresses within the voice.
export type NoteAddresses = Readonly<Record<string, readonly Address[]>>;
// A pool: its child ready, the wires a copy is wired by.
// A voice's: the addresses its notes set; the key that plays it, a drum rack's pad's, none
// every key.
export interface Pool {
  readonly child: Node;
  readonly wires: readonly Wire[];
  readonly note?: NoteAddresses;
  readonly key?: number;
}

// a copy's name under its pool: a whole number from 1, no leading 0
const COPY_NUMBER = /^[1-9]\d*$/;

// A pool's copy, as it's built: the pool's child named by the copy's number, from 1, under its
// pool; the pool's wires with the copy's address (my tap/3) where they name the pool.
export function copyOf(pool: Pool, number: number): { node: Node; wires: Wire[] } {
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`a pool's copies are numbered from 1: ${number}`);
  }
  const name = String(number);
  const address = addressText([pool.child.name, name]);
  const wires = pool.wires.map(({ from, to }) => ({
    from: renamedEnd(from, pool.child.name, address),
    to: renamedEnd(to, pool.child.name, address),
  }));
  return { node: { ...pool.child, name }, wires };
}
// A composite's children and wires with copies of its pools added, after its own:
//   - each copy a child named by its address (my tap/3), as its wires name it;
//   - wired by its pool's rule.
export function withCopies(
  composite: Pick<Composite, 'children' | 'wires' | 'pools'>,
  copies: readonly Address[],
): Pick<Composite, 'children' | 'wires'> {
  const added = copies.map((address) => {
    const [pool = '', number = ''] = address;
    const named = poolNamed(composite, pool);
    if (!named) {
      throw new Error(`no pool ${pool} to copy`);
    }
    const { node, wires } = copyOf(named, Number(number));
    return { node: { ...node, name: addressText(address) }, wires };
  });
  return {
    children: [...composite.children, ...added.map(({ node }) => node)],
    wires: [...composite.wires, ...added.flatMap(({ wires }) => wires)],
  };
}
// A pool by its name, its child's.
export function poolNamed(composite: Pick<Composite, 'pools'>, name: string): Pool | undefined {
  return composite.pools.find((pool) => pool.child.name === name);
}
// Whether a name under a pool is a copy's: a whole number from 1.
export function isCopyNumber(name: string): boolean {
  return COPY_NUMBER.test(name);
}
// An address split at the child it's in, under the plan's top, and the rest within it:
//   - a copy: its pool's name and its number (my tap/3), a written name never a number alone;
//   - any other child, a pool's child among them: its name.
export function splitAtChild(address: Address): { child: Address; within: Address } {
  const [, second = ''] = address;
  const length = isCopyNumber(second) ? 2 : 1;
  return { child: address.slice(0, length), within: address.slice(length) };
}
