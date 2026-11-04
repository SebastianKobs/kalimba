// ---------- plan/format: what a plan is ----------
// The data the builder and the views are handed, and read without the planner.
// Its parts:
//   - plan.ts: a plan, its version and its top node;
//   - node.ts: a node, a block or a composite, a composite's children, wires, macros and pools on it;
//   - input-output.ts: a node's inputs and outputs, mono or stereo;
//   - param.ts: a param and a setting, its spec, its value as it starts;
//   - wire.ts: from an output into an input or a param, by names;
//   - macro.ts: a composite's own param mapped onto its children's, its value onto theirs;
//   - pool.ts: children that come and go, a copy, its name and its wiring, a composite with
//     copies added, a voice's note, an address split at the copy or the child it's in;
//   - address.ts: values by their addresses, a preset's, a template's child's;
//   - param-at.ts: a node, a param or a setting found by its address; settings changed by it,
//     a new plan;
//   - moves.ts: what moves each param, a macro's maps and a child wired into it, as a mod matrix;
//   - routing.ts: what feeds what over one composite's wires, the loop check, a node's way out;
//   - version.ts: a stored plan's version.
export type { ValuesByAddress } from './address.ts';
export type { Channels, Input, Output } from './input-output.ts';
export { macroValues, mapOnto, type Macro, type MacroTarget } from './macro.ts';
export { PlanMoves, type Move } from './moves.ts';
export { isComposite, type BlockNode, type Composite, type Node } from './node.ts';
export type { Param, Setting } from './param.ts';
export { macroIn, nodeAt, nodeIn, paramAt, paramIn, settingAt, withSettings } from './param-at.ts';
export type { Plan } from './plan.ts';
export { copyOf, isCopyNumber, poolNamed, splitAtChild, withCopies, type NoteAddresses, type Pool } from './pool.ts';
export { feeds, reached, wayOut } from './routing.ts';
export type { Wire, WireFrom, WireTo } from './wire.ts';
export { VERSION, versionOf } from './version.ts';
