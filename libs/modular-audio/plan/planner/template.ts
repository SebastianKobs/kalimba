// ---------- plan/planner/template: a composite's description, as people write it ----------
// Written as a plan's node, short:
//   - a child by its kind, a block's or another template's, with only the values and settings
//     it changes, by their addresses within it;
//   - its own inputs, outputs, wires and pools as the plan has them;
//   - a macro by its name, its spec its first target's where it writes none;
//   - a setting of its own by its name, standing for a child's (to), its spec that one's;
//   - its child's role in it, and the form it fulfils, where it has one;
//   - its label and a child's, the name a view shows what's made of it by, where it has one,
//     a child's over its template's; a child's short label, the name in little room; what a
//     child does there, in words, where its owner gives some.
// The planner fills in the rest: the specs, a block's jacks, a child's template.
import type { ParamSpec } from '../../../base/params/index.ts';
import type { Input, MacroTarget, NoteAddresses, Output, ValuesByAddress, Wire } from '../format/index.ts';
import { fromData, type Address, type Shape } from '../../../base/util/index.ts';

// a child as a template writes it
export interface TemplateChild {
  readonly name: string;
  readonly kind: string;
  readonly role?: string;
  readonly label?: string;
  readonly short?: string;
  readonly does?: string;
  readonly values?: ValuesByAddress;
  readonly settings?: ValuesByAddress;
}
// A child written with a preset, by its name: the preset's kind, values and settings, its own over them
// (presets.ts).
export interface PresetChild extends Omit<TemplateChild, 'kind'> {
  readonly preset: string;
}
// A preset on a template, as its owner writes one: the template's kind, and the values
// and settings it changes, by their addresses within it.
export interface Preset {
  readonly kind: string;
  readonly values?: ValuesByAddress;
  readonly settings?: ValuesByAddress;
}
// A macro as a template writes it: its name and its targets; where it writes none of its own,
// its spec its first target's, its value its spec's default.
export interface TemplateMacro {
  readonly name: string;
  readonly spec?: Omit<ParamSpec, 'name'>;
  readonly value?: number | string;
  readonly hint?: string;
  readonly maps: readonly MacroTarget[];
}
// A setting a template declares of its own, as a macro is a param: its name, the child's
// setting it stands for by its address within the template, its spec that one's.
export interface TemplateSetting {
  readonly name: string;
  readonly to: Address;
  readonly hint?: string;
}
// a pool as a template writes it: its child, the wires each copy is wired by; a voice's note,
// and its key, a drum rack's pad's
export interface TemplatePool {
  readonly child: TemplateChild;
  readonly wires: readonly Wire[];
  readonly note?: NoteAddresses;
  readonly key?: number;
}
// A template, by its kind, the name other templates give it; a list it doesn't write, none.
// Built on another where it names one (extends): its base's whole, then its own (extend.ts).
export interface Template {
  readonly kind: string;
  readonly label?: string;
  readonly extends?: string;
  readonly form?: string;
  readonly inputs?: readonly Input[];
  readonly outputs?: readonly Output[];
  readonly children?: readonly TemplateChild[];
  readonly wires?: readonly Wire[];
  readonly macros?: readonly TemplateMacro[];
  readonly settings?: readonly TemplateSetting[];
  readonly pools?: readonly TemplatePool[];
}
// A template as written, read from data or handed to the planner: each child by its kind or by a preset.
export interface WrittenTemplate extends Omit<Template, 'children'> {
  readonly children?: readonly (TemplateChild | PresetChild)[];
}

// A template's shape, as read from data: its kind; its form and its base, words;
// what its lists' items need: a jack its name, a child its name and its kind or a preset,
// a wire its two ends, a macro its targets, a setting its name and the child's it stands for,
// a pool its child and its wires.
const TEMPLATE_SHAPE: Shape = {
  fields: {
    kind: 'word',
    label: 'word',
    form: 'word',
    extends: 'word',
    inputs: { listOf: { needs: ['name'] } },
    outputs: { listOf: { needs: ['name'] } },
    children: { listOf: { needs: ['name', ['kind', 'preset']] } },
    wires: { listOf: { needs: ['from', 'to'] } },
    macros: { listOf: { needs: ['maps'] } },
    settings: { listOf: { needs: ['name', 'to'] } },
    pools: { listOf: { needs: ['child', 'wires'] } },
  },
  needs: ['kind'],
};

// A template read from data, as it is once it's of a template's shape; refused where it isn't.
export function templateOf(data: unknown, source: string): WrittenTemplate {
  return fromData(data, TEMPLATE_SHAPE, { source, what: 'a template' });
}
// Presets read from data, as their owner writes them:
//   - each by a name of its own;
//   - what it's on by that thing's word (on: effect, desk, instrument), made its template's kind;
//   - its values and settings by address, each a number or a word.
// Refused where they aren't of presets' shape.
export function presetsOf(data: unknown, source: string, on: string): Readonly<Record<string, Preset>> {
  const written = fromData<Readonly<Record<string, Readonly<Record<string, unknown>>>>>(data, presetsShape(on), {
    source,
    what: 'presets',
  });
  return Object.fromEntries(
    Object.entries(written).map(([name, { [on]: kind, ...preset }]) => [name, { kind, ...preset } as Preset]),
  );
}
// Presets' shape, what they're on by that thing's word: for a file that holds them among more.
export function presetsShape(on: string): Shape {
  return {
    byName: {
      fields: { [on]: 'word', values: { byName: 'word or number' }, settings: { byName: 'word or number' } },
      needs: [on],
    },
  };
}
