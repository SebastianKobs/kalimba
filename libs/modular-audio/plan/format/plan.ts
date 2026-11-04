// ---------- plan/format/plan: what the planner hands out ----------
// What the builder and the views are handed, stored as JSON. Timeless: what to build,
// its values and settings as it starts. It describes itself, so nothing else is needed
// to build it or show it.
// Its node the top, whatever was asked for (an instrument, a channel, a whole studio):
// every address starts there.
import type { Node } from './node.ts';

// a plan: its format's version, and its top node
export interface Plan {
  readonly version: number;
  readonly node: Node;
}
