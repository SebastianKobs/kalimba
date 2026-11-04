// ---------- plan/planner/catalog: every kind the planner knows, blocks and templates ----------
// What a node of a kind shows from outside, as a template's wires and values name it:
//   - a block's: its jacks, its params, its settings, as declared;
//   - a template's: its jacks, its macros as its params, no settings of its own.
// And whether an address within a kind reaches a param or a setting inside it, and a param's spec.
import { BLOCKS, type Block } from '../blocks/index.ts';
import type { Wire } from '../format/index.ts';
import type { Address } from '../../../base/util/index.ts';
import type { ParamSpec } from '../../../base/params/index.ts';
import type { Template, TemplateChild, TemplateMacro } from './template.ts';

// a node of a kind, as its parent's wires and values name it
export interface Outside {
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly params: readonly string[];
  readonly settings: readonly string[];
}

// the kinds the planner knows: every block, and the templates it's handed
export class Catalog {
  readonly #templates: ReadonlyMap<string, Template>;

  constructor(templates: readonly Template[]) {
    this.#templates = new Map(templates.map((template) => [template.kind, template]));
  }
  block(kind: string): Block | undefined {
    return (BLOCKS as Readonly<Record<string, Block>>)[kind];
  }
  template(kind: string): Template | undefined {
    return this.#templates.get(kind);
  }
  // what a node of a kind shows from outside; none for a kind not known
  outsideOf(kind: string): Outside | undefined {
    const block = this.block(kind);
    if (block) {
      return {
        inputs: block.inputs.map((jack) => jack.name),
        outputs: block.outputs.map((jack) => jack.name),
        params: block.params.map((spec) => spec.name),
        settings: block.settings.map((spec) => spec.name),
      };
    }
    const template = this.template(kind);
    if (!template) {
      return undefined;
    }
    return {
      inputs: (template.inputs ?? []).map((jack) => jack.name),
      outputs: (template.outputs ?? []).map((jack) => jack.name),
      params: (template.macros ?? []).map((macro) => macro.name),
      settings: (template.settings ?? []).map((setting) => setting.name),
    };
  }
  // whether an address within a node of a kind reaches a param of it, or of a child inside
  paramIn(kind: string, address: Address): boolean {
    return this.#reaches(kind, address, 'params');
  }
  // the same for a setting
  settingIn(kind: string, address: Address): boolean {
    return this.#reaches(kind, address, 'settings');
  }
  // A param's spec by its address within a node of a kind: a block's own, a template's macro's.
  // None where it isn't there. Only for templates found well-formed: a macro's spec may be its target's.
  paramSpecIn(kind: string, [name, ...rest]: Address): ParamSpec | undefined {
    const template = this.template(kind);
    if (rest.length) {
      const child = template && this.childOf(template, name);
      return child && this.paramSpecIn(child.kind, rest);
    }
    const block = this.block(kind);
    if (block) {
      return block.params.find((spec) => spec.name === name);
    }
    const macro = template?.macros?.find((each) => each.name === name);
    return template && macro && this.macroSpec(template, macro);
  }
  // a macro's spec: its own, under its name; else its first target's, under its name
  macroSpec(template: Template, { name, spec, maps }: TemplateMacro): ParamSpec | undefined {
    if (spec) {
      return { ...spec, name };
    }
    const target = maps[0] && this.paramSpecIn(template.kind, maps[0].to);
    return target && { ...target, name };
  }
  // A setting's spec by its address within a node of a kind: a block's own, or a template's
  // own, the child's it stands for under its name. None where it isn't there.
  settingSpecIn(kind: string, [name, ...rest]: Address): ParamSpec | undefined {
    const template = this.template(kind);
    if (rest.length) {
      const child = template && this.childOf(template, name);
      return child && this.settingSpecIn(child.kind, rest);
    }
    const block = this.block(kind);
    if (block) {
      return block.settings.find((spec) => spec.name === name);
    }
    return template && name !== undefined ? this.#ownSettingSpec(template, name) : undefined;
  }
  // a template's children, a pool's among them
  childrenOf(template: Template): TemplateChild[] {
    return [...(template.children ?? []), ...(template.pools ?? []).map((pool) => pool.child)];
  }
  // a template's child by its name, a pool's among them; none where there's no such child
  childOf(template: Template, name: string | undefined): TemplateChild | undefined {
    return this.childrenOf(template).find((each) => each.name === name);
  }
  // a template's wires, its pools' among them
  wiresOf(template: Template): Wire[] {
    return [...(template.wires ?? []), ...(template.pools ?? []).flatMap((pool) => pool.wires)];
  }
  // a node's kind by its path of children's names within a template; none where it isn't there
  kindAt(template: Template, [name, ...rest]: Address): string | undefined {
    const child = this.childOf(template, name);
    if (!child || !rest.length) {
      return child?.kind;
    }
    const inner = this.template(child.kind);
    return inner && this.kindAt(inner, rest);
  }
  // whether an address within a template reaches a param of a child inside it
  paramInside(template: Template, [name, ...rest]: Address): boolean {
    const child = this.childOf(template, name);
    return child !== undefined && this.paramIn(child.kind, rest);
  }
  // the same for a setting
  settingInside(template: Template, [name, ...rest]: Address): boolean {
    const child = this.childOf(template, name);
    return child !== undefined && this.settingIn(child.kind, rest);
  }

  // the last name one of the kind's params or settings; the names before it children on the way down
  #reaches(kind: string, [name, ...rest]: Address, which: 'params' | 'settings'): boolean {
    if (name === undefined) {
      return false;
    }
    if (!rest.length) {
      return this.outsideOf(kind)?.[which].includes(name) ?? false;
    }
    const template = this.template(kind);
    const child = template && this.childOf(template, name);
    return child !== undefined && this.#reaches(child.kind, rest, which);
  }
  // a template's own setting's spec: the child's it stands for, under its name
  #ownSettingSpec(template: Template, name: string): ParamSpec | undefined {
    const own = template.settings?.find((each) => each.name === name);
    const target = own && this.settingSpecIn(template.kind, own.to);
    return target && { ...target, name };
  }
}
