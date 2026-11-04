// ---------- plan/format/routing: what feeds what over one composite's wires ----------
// A child feeds what its outputs are wired into: another child's input, or its param.
// One composite only: its children aren't opened, and its own outputs leave it.
// For a form's check against loops, for mute and solo, for the views' lights; where a
// node's way out goes.
import type { Composite } from './node.ts';
import type { Wire, WireFrom, WireTo } from './wire.ts';

// a node's main output, its way out
const OUT = 'out';

// What the names given reach over the composite's wires, they among it, in the order found.
// Only the wires through() lets through (all, unless it says): a send turned up, say.
export function reached(
  composite: Pick<Composite, 'wires'>,
  names: Iterable<string>,
  through: (wire: Wire) => boolean = () => true,
): Set<string> {
  const found = new Set(names);
  // a Set's loop visits what's added while it runs: what those reach too
  for (const name of found) {
    const out = composite.wires.filter((wire) => childOf(wire.from) === name && through(wire));
    for (const wire of out) {
      const next = childOf(wire.to);
      if (next !== undefined) {
        found.add(next);
      }
    }
  }
  return found;
}
// Whether one child reaches another over the wires, itself among it:
// a wire from the second into the first would be a loop.
export function feeds(composite: Pick<Composite, 'wires'>, from: string, to: string): boolean {
  return reached(composite, [from]).has(to);
}

// Where a child's way out goes, over wires: the child its main output feeds; none where it
// goes out of the composite, or has no way out.
export function wayOut(wires: readonly Wire[], name: string): string | undefined {
  const way = wires.find(({ from }) => childOf(from) === name && 'output' in from && from.output === OUT);
  return way && childOf(way.to);
}

// the child a wire's end is at; none for the parent's own input or output
function childOf(end: WireFrom | WireTo): string | undefined {
  if (!('node' in end)) {
    return undefined;
  }
  return end.node;
}
