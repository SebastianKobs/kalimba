// ---------- plan/planner/planner: a plan for whatever is asked ----------
// Handed the templates once, checking each as it's handed in; then a plan for any of them,
// an instrument, a channel, a whole studio, before anything plays:
//   1. a block's params and settings its specs, each at its value: given, or its default;
//   2. a child's template planned into it, the values it's given by their addresses;
//   3. a macro's spec, its own or its first target's; its value onto its targets, a choice by its
//      index: a param a macro moves is the macro's;
//   4. a jack's channels as they come, where its block doesn't fix them;
//   5. a pool's child ready, as each copy will be.
// No note: a voice's note sets its params as it plays.
import {
  macroValues,
  VERSION,
  type Macro,
  type Node,
  type Param,
  type Plan,
  type Setting,
  type ValuesByAddress,
} from '../format/index.ts';
import type { Block } from '../blocks/index.ts';
import { choiceAt, freeAt, timeParamsIn, type ParamSpec, type RangedSpec } from '../../../base/params/index.ts';
import { addressOf, addressText, isUnder, type Address } from '../../../base/util/index.ts';
import { monoOrStereo, type LooseJack } from './mono-stereo.ts';
import { problemsInAll } from './check.ts';
import { extendedAll } from './extend.ts';
import { withPresets } from './presets.ts';
import type { Form } from './form.ts';
import { Catalog } from './catalog.ts';
import type { Preset, Template, TemplateChild, TemplateMacro, TemplateSetting, WrittenTemplate } from './template.ts';

// What a plan is asked with:
//   - its top node's name, its kind's unless given;
//   - values and settings changed by their addresses, a preset's;
//   - the beat it's planned at, a beat's length in seconds: each synced time's free value
//     where its note is then, where none is given. A plan has no tempo of its own.
export interface Asked {
  readonly name?: string;
  readonly values?: ValuesByAddress;
  readonly settings?: ValuesByAddress;
  readonly beat?: number;
}
// what a node is planned with: the values and settings it's given, by their addresses within it,
// the beat it's planned at, and where it is, for a failure to name
interface Given {
  readonly values: ValuesByAddress;
  readonly settings: ValuesByAddress;
  readonly beat: number | undefined;
  readonly at: Address;
}

// the planner: templates made into plans
export class Planner {
  readonly #catalog: Catalog;

  // The templates, as each is written:
  //   1. each child written with a preset given its kind, from the presets handed in;
  //   2. each merged with the one it's built on;
  //   3. checked well-formed and held to its form, then its macros onto choices.
  // Every failure said at once.
  constructor(
    templates: readonly WrittenTemplate[],
    forms: readonly Form[] = [],
    presets: Readonly<Record<string, Preset>> = {},
  ) {
    const resolved = withPresets(templates, presets);
    if (resolved.problems.length) {
      throw new Error(['templates not well-formed:', ...resolved.problems].join('\n'));
    }
    const merged = extendedAll(resolved.templates);
    this.#catalog = new Catalog(merged.templates);
    const byName = new Map(forms.map((form) => [form.name, form]));
    const problems = merged.problems.length ? merged.problems : problemsInAll(merged.templates, this.#catalog, byName);
    if (problems.length) {
      throw new Error(['templates not well-formed:', ...problems].join('\n'));
    }
  }
  // a plan for a block or a template, its top node named as asked; what it's asked for at an address it hasn't refused
  plan(kind: string, { name = kind, values = {}, settings = {}, beat }: Asked = {}): Plan {
    if (!this.#catalog.template(kind) && !this.#catalog.block(kind)) {
      throw new Error(`no block or template ${kind}`);
    }
    const missing = [
      ...Object.keys(values)
        .filter((key) => !this.#catalog.paramIn(kind, addressOf(key)))
        .map((key) => `no param ${key}`),
      ...Object.keys(settings)
        .filter((key) => !this.#catalog.settingIn(kind, addressOf(key)))
        .map((key) => `no setting ${key}`),
    ];
    if (missing.length) {
      throw new Error([`${kind}: asked for what it has not:`, ...missing].join('\n  '));
    }
    return { version: VERSION, node: this.#node({ name, kind }, { values, settings, beat, at: [] }) };
  }

  // a child planned: a block, or its template; the values its template writes, those given over them
  #node(child: TemplateChild, given: Given): Node {
    const values = { ...child.values, ...given.values };
    const settings = { ...child.settings, ...given.settings };
    const { beat, at } = given;
    const block = this.#catalog.block(child.kind);
    if (block) {
      const timed = { ...values, ...freeTime(block.params, (name) => values[name], beat) };
      return blockNode(child, block, { values: timed, settings, beat, at });
    }
    const template = this.#catalog.template(child.kind)!; // a kind the check found
    return this.#composite(child, template, { values: this.#timed(template, values, beat), settings, beat, at });
  }
  // a template planned: its macros at their values, onto their targets; its own settings, onto
  // the children's they stand for; its children, its pools
  #composite(child: TemplateChild, template: Template, { values, settings, beat, at }: Given): Node {
    const macros = (template.macros ?? []).map((macro) => this.#macro(template, macro, { values, settings, beat, at }));
    const moved = macros.flatMap((macro) =>
      macroValues(macro).map(({ to, value }) => [addressText(to), value] as const),
    );
    const inside = { ...values, ...Object.fromEntries(moved) }; // a param a macro moves is the macro's
    const { own, settled } = this.#ownSettings(template, { settings, at });
    const planned = (each: TemplateChild): Node =>
      this.#node(each, {
        values: under(inside, each.name),
        settings: under(settled, each.name),
        beat,
        at: [...at, each.name],
      });
    const children = monoOrStereo((template.children ?? []).map(planned), this.#loose(template), {
      wires: template.wires ?? [],
      inputs: template.inputs ?? [],
    });
    const pools = (template.pools ?? []).map(({ child: pooled, wires, note, key }) => ({
      child: planned(pooled),
      wires,
      ...(note && { note }),
      ...(key !== undefined && { key }),
    }));
    return {
      ...named(child, template.label),
      kind: template.kind,
      ...(template.form !== undefined && { form: template.form }),
      inputs: template.inputs ?? [],
      outputs: template.outputs ?? [],
      params: [],
      settings: own,
      children,
      wires: template.wires ?? [],
      macros,
      pools,
    };
  }
  // a template's values, its macros' synced time's free value worked out where none is given
  #timed(template: Template, values: ValuesByAddress, beat: number | undefined): ValuesByAddress {
    const macros = template.macros ?? [];
    const specs = macros.map((macro) => this.#catalog.macroSpec(template, macro)!); // a spec or a target, as the check found
    const written = (name: string): number | string | undefined =>
      values[name] ?? macros.find((macro) => macro.name === name)?.value;
    return { ...values, ...freeTime(specs, written, beat) };
  }
  // A template's own settings planned, and the settings within it, a child's its own stands for
  // its own.
  #ownSettings(
    template: Template,
    given: Pick<Given, 'settings' | 'at'>,
  ): { own: Setting[]; settled: ValuesByAddress } {
    const own = (template.settings ?? []).map((setting) => this.#setting(template, setting, given));
    const stoodFor = own.map(({ to, value }) => [addressText(to!), value] as const); // each its own stands for
    return { own, settled: { ...given.settings, ...Object.fromEntries(stoodFor) } };
  }
  // A setting of a template's own planned: its spec the child's it stands for, under its name;
  // its value given by its name, or by the child's address, or the child's as written, or its
  // spec's default.
  #setting(
    template: Template,
    { name, to, hint }: TemplateSetting,
    { settings, at }: Pick<Given, 'settings' | 'at'>,
  ): Setting {
    const spec = this.#catalog.settingSpecIn(template.kind, [name])!; // a child's setting, as the check found
    const [childName = '', ...within] = to;
    const written = template.children?.find((each) => each.name === childName)?.settings?.[addressText(within)];
    const given = settings[name] ?? settings[addressText(to)] ?? written;
    return { ...valued(spec, given, [...at, name]), to, ...(hint !== undefined && { hint }) };
  }
  // a macro planned: its spec, its own or its first target's; its value given, or written, or its default
  #macro(template: Template, macro: TemplateMacro, { values, at }: Given): Macro {
    const spec = this.#catalog.macroSpec(template, macro)!; // a spec or a target, as the check found
    const { value } = valued(spec, values[macro.name] ?? macro.value, [...at, macro.name]);
    return { spec, value, ...(macro.hint !== undefined && { hint: macro.hint }), maps: macro.maps };
  }
  // the jacks of a template's children whose channels aren't fixed: a block's, or a template's written without
  #loose(template: Template): LooseJack[] {
    return (template.children ?? []).flatMap(({ name, kind }) => {
      const jacks = this.#jacksOf(kind);
      return (['inputs', 'outputs'] as const).flatMap((side) =>
        jacks[side]
          .filter((jack) => jack.channels === undefined)
          .map((jack) => ({ child: name, side, name: jack.name })),
      );
    });
  }
  // the jacks a child's kind declares, a block's or its template's; none for a kind that's neither
  #jacksOf(kind: string): Pick<Block, 'inputs' | 'outputs'> {
    const declared = this.#catalog.block(kind) ?? this.#catalog.template(kind);
    return { inputs: declared?.inputs ?? [], outputs: declared?.outputs ?? [] };
  }
}

// a block planned: its jacks, mono where it doesn't fix them until worked out; its params and settings at their values
function blockNode(child: TemplateChild, block: Block, { values, settings, at }: Given): Node {
  return {
    ...named(child),
    kind: block.kind,
    inputs: block.inputs.map((jack) => ({ name: jack.name, channels: jack.channels ?? 1 })),
    outputs: block.outputs.map((jack) => ({ name: jack.name, channels: jack.channels ?? 1 })),
    params: block.params.map((spec) => valued(spec, values[spec.name], [...at, spec.name])),
    settings: block.settings.map((spec) => valued(spec, settings[spec.name], [...at, spec.name])),
  };
}
// A param or a setting at its value: given, or its default; refused where it has neither.
// A choice given by its index, as a macro moves it, written as the choice; one past them refused.
function valued(spec: ParamSpec, given: number | string | undefined, at: Address): Param {
  const value = given ?? spec.default;
  if (value === undefined) {
    throw new Error(`${addressText(at)}: no value, and no default`);
  }
  if (typeof value !== 'number' || !spec.choices) {
    return { spec, value };
  }
  const choice = spec.choices[value];
  if (choice === undefined) {
    throw new Error(`${addressText(at)}: no choice ${value}`);
  }
  return { spec, value: choice };
}
// A child's name, and its role, its label, its short label and what it does there where it
// has them, its own label over its template's.
function named(
  { name, role, label, short, does }: TemplateChild,
  templateLabel?: string,
): Pick<Node, 'name' | 'role' | 'label' | 'short' | 'does'> {
  const shown = label ?? templateLabel;
  return {
    name,
    ...(role !== undefined && { role }),
    ...(shown !== undefined && { label: shown }),
    ...(short !== undefined && { short }),
    ...(does !== undefined && { does }),
  };
}
// the values under a child's name, by their addresses within it
function under(values: ValuesByAddress, name: string): ValuesByAddress {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([address]) => isUnder(address, name))
      .map(([address, value]) => [address.slice(name.length + 1), value]),
  );
}
// A synced time's free value, where none is given and it's planned at a beat: where its note is
// then. Its three params found among the specs by their names; none where they aren't there.
function freeTime(
  specs: readonly ParamSpec[],
  given: (name: string) => number | string | undefined,
  beat: number | undefined,
): ValuesByAddress {
  const time = timeParamsIn(specs.map(({ name }) => name));
  if (beat === undefined || !time || given(time.free) !== undefined) {
    return {};
  }
  const specOf = (name: string): ParamSpec => specs.find((spec) => spec.name === name)!; // found by its name
  const sync = given(time.sync) ?? specOf(time.sync).default;
  if (!sync) {
    return {};
  }
  const noteSpec = specOf(time.note);
  const note = given(time.note) ?? noteSpec.default!; // a choice has its default
  const written = typeof note === 'number' ? choiceAt(noteSpec, note) : note;
  return { [time.free]: freeAt(written, beat, specOf(time.free) as RangedSpec) }; // a free time is ranged
}
