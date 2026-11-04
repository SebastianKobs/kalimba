// ---------- plan/format/param: a param and a setting, as a node exposes them ----------
// Both the same shape: its spec whole, its value as it starts, and its words.
// Apart only by where they sit on a node:
//   - a param: edited or automated by its address as it plays;
//   - a setting: chosen as it's built, a filter's type, a pan's law; a change a rebuild.
import type { ParamSpec } from '../../../base/params/index.ts';
import type { Address } from '../../../base/util/index.ts';

// a param: its spec (its name among it), its value as it starts, a number or one of its choices;
// its hint, the words a view shows, where its template gives any
export interface Param {
  readonly spec: ParamSpec;
  readonly value: number | string;
  readonly hint?: string;
}
// A setting: a param's shape, fixed as it's built.
// A composite's own stands for a child's, by its address within it (to), as a macro moves a
// param: changed, the child's changes with it.
export interface Setting extends Param {
  readonly to?: Address;
}
