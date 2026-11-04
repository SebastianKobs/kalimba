// ---------- plan/format/macro: a composite's own param, mapped onto its children's ----------
// As a rack's macro: one knob moving several params inside, each its own way.
// Each target mapped as the synth maps a term: times its factor, held in its range,
// plus its offset. That covers an Ableton macro's min and max.
// A choice mapped by its index, as a builder holds it: a macro onto a delay's note.
import { choiceIndex } from '../../../base/params/index.ts';
import { clamp, type Address } from '../../../base/util/index.ts';
import type { Param } from './param.ts';

// one of a macro's targets: a child's param by its address within the composite, and how the
// macro's value maps onto it
export interface MacroTarget {
  readonly to: Address;
  readonly factor: number;
  readonly offset: number;
  readonly low?: number;
  readonly high?: number;
}
// a macro: a param of the composite's own, a number or one of its choices, and its targets
export interface Macro extends Param {
  readonly maps: readonly MacroTarget[];
}

// A value mapped onto a target: times its factor, held in its range, plus its offset.
export function mapOnto(
  { factor, offset, low = -Infinity, high = Infinity }: Omit<MacroTarget, 'to'>,
  value: number,
): number {
  return clamp(factor * value, low, high) + offset;
}
// A macro's value onto each of its targets, as a builder sets them: its own, unless given one;
// a choice by its index.
export function macroValues(macro: Macro, value = macro.value): { to: Address; value: number }[] {
  const held = typeof value === 'number' ? value : choiceIndex(macro.spec, value);
  return macro.maps.map((target) => ({ to: target.to, value: mapOnto(target, held) }));
}
