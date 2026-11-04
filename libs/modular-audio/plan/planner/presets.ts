// ---------- plan/planner/presets: a child written with a preset ----------
// A preset is a template's kind, with values and settings by address,
// as its owner writes them.
// A child written with one takes the preset's kind, values and settings, its own over them.
// Resolved first, before a template is merged or checked:
// the rest sees each child by its kind.
// A preset not handed in is said, naming its template and its child.
import type { PresetChild, Preset, Template, TemplateChild, WrittenTemplate } from './template.ts';

// The templates, each child written with a preset given its kind.
// Where a preset is missing, what's wrong.
export function withPresets(
  templates: readonly WrittenTemplate[],
  presets: Readonly<Record<string, Preset>>,
): { templates: Template[]; problems: string[] } {
  const problems = templates.flatMap((template) =>
    (template.children ?? [])
      .filter((child) => 'preset' in child && !Object.hasOwn(presets, child.preset))
      .map((child) => `${template.kind}: ${child.name}: no preset ${(child as PresetChild).preset}`),
  );
  if (problems.length) {
    return { templates: [], problems };
  }
  return {
    templates: templates.map(({ children, ...template }) => ({
      ...template,
      ...(children && { children: children.map((child) => byKind(child, presets)) }),
    })),
    problems: [],
  };
}

// a child by its kind: as written, or its preset's, its own values and settings over it
function byKind(child: TemplateChild | PresetChild, presets: Readonly<Record<string, Preset>>): TemplateChild {
  if (!('preset' in child)) {
    return child;
  }
  const { preset: named, values, settings, ...rest } = child;
  const preset = presets[named]!; // handed in, as checked
  return {
    ...rest,
    kind: preset.kind,
    values: { ...preset.values, ...values },
    settings: { ...preset.settings, ...settings },
  };
}
