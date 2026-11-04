// ---------- libs/base/params/spec: a param as a plugin describes its own, apart from any view ----------
// Every part of a sound declares its params so: a block its values (libs/modular-audio/plan/blocks/), a template
// its macros, a desk's strip its own. Each one's name; its unit; its range and step in that unit; its choices, where it
// picks among words; its default, where a block falls back to one, so the block reads it from here; for a gain, whether it's a share
// shown in dB, its range in dB; and its taper, where a value lies on a control, a lane or a CC (taper.ts), its own as VST3 and AU declare
// theirs. A value written either as itself or by its parts (a cutoff, or { key, max }) has both. A surface only decides how to
// draw one: a slider or a knob. What's structure has no spec: a condition, where a sound goes, what a modulator moves, the chain, a switch.
import { clamp } from '../util/index.ts';
import { isSwitch } from './standard-specs.ts';

// a param's taper, how a position on a control, a lane or a CC maps to its value (taper.ts)
export type Taper = 'fader' | 'octaves' | 'line';
// a param, as a plugin describes its own
export interface ParamSpec {
  readonly name: string;
  readonly unit?: string;
  readonly range?: readonly [lo: number, hi: number, step: number];
  readonly choices?: readonly string[];
  readonly default?: number | string;
  readonly dB?: true;
  readonly taper?: Taper;
  // false for a param set at its time, never glided there: a delay line's time, whose glide
  // would bend the pitch
  readonly glides?: false;
  readonly parts?: ParamSpecs;
}
// a param on a control, a slider or a knob: one with its range
export type RangedSpec = ParamSpec & { readonly range: NonNullable<ParamSpec['range']> };
// a module's params, or a part's, by their keys, a nested part's under its own
export interface ParamSpecs {
  readonly [key: string]: ParamSpec | ParamSpecs;
}

// a value's spec by its path from where its specs start: a list's index and a condition's branches passed over; once at a value, a part
// by its key, and a range's ends; anything else, or a path that ends at a part, has none
export function specAt(
  specs: ParamSpec | ParamSpecs | undefined,
  path: readonly (string | number)[],
): ParamSpec | undefined {
  let at = specs;
  for (const key of path) {
    if (at === undefined) {
      return undefined;
    }
    if (typeof key === 'number' || key === 'then' || key === 'else') {
      continue;
    }
    at = isParamSpec(at) ? partOf(at, key) : at[key];
  }
  return at && isParamSpec(at) ? at : undefined;
}
// whether a spec is a param's, not a module's or a part's specs by their keys
export function isParamSpec(specs: ParamSpec | ParamSpecs): specs is ParamSpec {
  return typeof specs.name === 'string';
}
// within a value: a part by its key, itself for a range's end
function partOf(spec: ParamSpec, key: string): ParamSpec | ParamSpecs | undefined {
  if (key === 'between') {
    return spec;
  }
  return spec.parts?.[key];
}
// A param with choices, as a controller carries it: a choice by its index among them.
// A place between two rounded to the nearer; one past either end at that end.
export function choiceAt({ choices = [] }: ParamSpec, index: number): string {
  const nearest = clamp(Math.round(index), 0, choices.length - 1);
  return choices[nearest]!; // a param with choices has one there
}
// and back: a choice's index among its param's choices
export function choiceIndex({ choices = [] }: ParamSpec, choice: string): number {
  return choices.indexOf(choice);
}
// whether a change is set at its time, not glided there: a switch, a choice, or a param its
// spec says never glides
export function atItsTime(spec: ParamSpec): boolean {
  return isSwitch(spec) || spec.choices !== undefined || spec.glides === false;
}
