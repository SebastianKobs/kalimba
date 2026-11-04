// ---------- plan/format/node: a node, a block or a composite ----------
// One kind of thing: its inputs, outputs, params and settings.
//   - A block: nothing inside; its kind the block's (oscillator).
//   - A composite: its children, the wires between them, its macros and its pools, on the node
//     itself, as a template writes them; its kind its template's (Utility), its own params
//     its macros.
// The form it fulfils beside its kind (channel), and its role in its parent where the
// parent's form gives one (insert, fader).
// Its label: the name a view shows it by, where its template gives one.
// Its short label: the name a view shows it by in little room, where one is given (rev).
// What it does there, in words, where its owner gives some (the air): a view's, else worked out.
import type { Input, Output } from './input-output.ts';
import type { Macro } from './macro.ts';
import type { Param, Setting } from './param.ts';
import type { Pool } from './pool.ts';
import type { Wire } from './wire.ts';

// what every node has: its name, one of a kind in its parent; its kind, its jacks, its params and settings
interface Face {
  readonly name: string;
  readonly kind: string;
  readonly form?: string;
  readonly role?: string;
  readonly label?: string;
  readonly short?: string;
  readonly does?: string;
  readonly inputs: readonly Input[];
  readonly outputs: readonly Output[];
  readonly params: readonly Param[];
  readonly settings: readonly Setting[];
}
// a block: nothing inside
export interface BlockNode extends Face {
  readonly children?: undefined;
  readonly wires?: undefined;
  readonly macros?: undefined;
  readonly pools?: undefined;
}
// A composite: its children by name, in the plan's order, each one of a kind among them;
// the wires between them and its own inputs and outputs; its macros; its pools.
export interface Composite extends Face {
  readonly children: readonly Node[];
  readonly wires: readonly Wire[];
  readonly macros: readonly Macro[];
  readonly pools: readonly Pool[];
}
// a node: a block or a composite, told apart by its children
export type Node = BlockNode | Composite;

// whether a node is a composite: it has children, wires, macros and pools
export function isComposite(node: Node): node is Composite {
  return node.children !== undefined;
}
