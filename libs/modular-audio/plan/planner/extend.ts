// ---------- plan/planner/extend: a template built on another ----------
// A template names the one it's built on (extends), as a rack is saved on another:
//   - its base's jacks, form and label, where it writes none of its own;
//   - its base's children, wires, macros, settings and pools first, then its own.
// A base built on another is merged first, down to one built on none.
// Merged before the planner's checks, so the checks see one template and a plan comes out flat.
// What keeps it from merging said: a base not handed in, a block's kind among them; a loop.
import { chainFrom } from '../../../base/util/index.ts';
import type { Template } from './template.ts';

// The templates, each merged with its base; or, where one can't be, what's wrong, each a line.
export function extendedAll(templates: readonly Template[]): { templates: Template[]; problems: string[] } {
  const byKind = new Map(templates.map((template) => [template.kind, template]));
  const problems = templates.flatMap((template) => extendProblems(template, byKind));
  if (problems.length) {
    return { templates: [...templates], problems };
  }
  return { templates: templates.map((template) => extended(template, byKind)), problems: [] };
}

// a template's base not handed in; its bases leading back to it, a loop
function extendProblems(template: Template, byKind: ReadonlyMap<string, Template>): string[] {
  if (template.extends === undefined) {
    return [];
  }
  if (!byKind.has(template.extends)) {
    return [`${template.kind}: extends ${template.extends}, no template handed in`];
  }
  const bases = chainFrom(template.extends, byKind, (base) => base.extends).keys;
  const back = bases.indexOf(template.kind);
  if (back === -1) {
    return [];
  }
  return [`${template.kind}: extends ${bases.slice(0, back + 1).join(', which extends ')}: a loop`];
}
// a template merged with its base, its base merged first
function extended(template: Template, byKind: ReadonlyMap<string, Template>): Template {
  if (template.extends === undefined) {
    return template;
  }
  const base = extended(byKind.get(template.extends)!, byKind); // handed in, no loop: as checked
  const form = template.form ?? base.form;
  const label = template.label ?? base.label;
  return {
    kind: template.kind,
    ...(label !== undefined && { label }),
    ...(form !== undefined && { form }),
    inputs: template.inputs ?? base.inputs ?? [],
    outputs: template.outputs ?? base.outputs ?? [],
    ...joined(base, template),
  };
}
// a base's children, wires, macros, settings and pools first, then the template's own
function joined(
  base: Template,
  template: Template,
): Pick<Template, 'children' | 'wires' | 'macros' | 'settings' | 'pools'> {
  return {
    children: both(base.children, template.children),
    wires: both(base.wires, template.wires),
    macros: both(base.macros, template.macros),
    settings: both(base.settings, template.settings),
    pools: both(base.pools, template.pools),
  };
}
// a base's list, then the template's own
function both<Item>(base: readonly Item[] = [], own: readonly Item[] = []): Item[] {
  return [...base, ...own];
}
