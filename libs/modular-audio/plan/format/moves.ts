// ---------- plan/format/moves: what moves each param, as a mod matrix shows it ----------
// Worked out from a plan alone, each param by its address:
//   - a macro: each target its maps move, by its factor and offset, held within its map's ends;
//   - a child wired into a param or into a child's macro: a modulator moving it, as CV; its
//     reach its own amount or depth, where it has one, as an envelope's or an LFO's.
// Every composite's, in the plan's order; a pool's child's within it.
import { addressText, type Address } from '../../../base/util/index.ts';
import type { MacroTarget } from './macro.ts';
import { isComposite, type Composite, type Node } from './node.ts';
import type { Plan } from './plan.ts';

// what moves a param: a macro, by its own address, and its map; or a child, by its address,
// and what it reaches by
export interface Move {
  readonly by: Address;
  readonly kind: 'macro' | 'modulator';
  readonly target: Address;
  readonly map?: Omit<MacroTarget, 'to'>;
  readonly reach?: Address;
}

// the names a modulator's reach goes by, its own param that sets how far it moves what it's wired into
const REACHES = ['amount', 'depth'];

// What moves each param of the plan it's handed, worked out once for each plan.
export class PlanMoves {
  #worked: { plan: Plan; moves: readonly Move[]; byTarget: ReadonlyMap<string, readonly Move[]> } | null = null;

  // what moves a param of a plan, by its address
  of(plan: Plan, address: Address): readonly Move[] {
    return this.#movesIn(plan).byTarget.get(addressText(address)) ?? [];
  }
  // what a composite's own sources move, its macros and its children wired into a param, by its address
  madeAt(plan: Plan, address: Address): readonly Move[] {
    const at = addressText(address);
    return this.#movesIn(plan).moves.filter(({ by }) => addressText(by.slice(0, -1)) === at);
  }

  #movesIn(plan: Plan): { moves: readonly Move[]; byTarget: ReadonlyMap<string, readonly Move[]> } {
    if (this.#worked?.plan !== plan) {
      const moves = isComposite(plan.node) ? collect(plan.node, []) : [];
      this.#worked = { plan, moves, byTarget: byTarget(moves) };
    }
    return this.#worked;
  }
}

// a composite's moves, then those of each composite within it, a pool's child's among them
function collect(node: Composite, at: Address): Move[] {
  const inner = [...node.children, ...node.pools.map(({ child }) => child)];
  const within = inner.filter(isComposite).flatMap((child) => collect(child, [...at, child.name]));
  return [...macroMoves(node, at), ...wiredMoves(node, at), ...within];
}
// the moves by what they move, each param's by its address as text
function byTarget(moves: readonly Move[]): ReadonlyMap<string, readonly Move[]> {
  const targets = new Map<string, Move[]>();
  for (const move of moves) {
    const key = addressText(move.target);
    targets.set(key, [...(targets.get(key) ?? []), move]);
  }
  return targets;
}
// each target a composite's macros move, by its map
function macroMoves(node: Composite, at: Address): Move[] {
  return node.macros.flatMap((macro) =>
    macro.maps.map(({ to, ...map }) => ({
      by: [...at, macro.spec.name],
      kind: 'macro' as const,
      target: [...at, ...to],
      map,
    })),
  );
}
// each param a child is wired into, by its reach where it has one
function wiredMoves(node: Composite, at: Address): Move[] {
  return node.wires.flatMap(({ from, to }) => {
    if (!('node' in from) || !('param' in to)) {
      return [];
    }
    const source = node.children.find(({ name }) => name === from.node);
    const reach = source && reachOf(source);
    return [
      {
        by: [...at, from.node],
        kind: 'modulator' as const,
        target: [...at, to.node, to.param],
        ...(reach && { reach: [...at, from.node, reach] }),
      },
    ];
  });
}
// a modulator's reach: its own param, or its macro, by one of the names it goes by
function reachOf(node: Node): string | undefined {
  const own = [...(isComposite(node) ? node.macros : []), ...node.params].map(({ spec }) => spec.name);
  return REACHES.find((name) => own.includes(name));
}
