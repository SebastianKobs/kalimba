# modular-audio/plan/planner

Templates made into plans: a plan for whatever is asked, an instrument, a channel, a whole studio, once, before anything plays. Used by whoever plans, an editor among them, never by what runs a plan, which is handed the plan. Templates are written short or read from YAML, and checked against their forms.

Depends on: `base/params`, `base/util`, `modular-audio/plan/blocks`, `modular-audio/plan/format`.

A template is written as a plan's node, short: a child by its kind, a block's or another template's, with only the values and settings it changes; its own inputs, outputs, wires, macros and pools as the plan writes them. The planner fills in the rest.

```ts
import { Planner } from './index.ts';

const planner = new Planner([
  {
    kind: 'Utility',
    inputs: [{ name: 'in', channels: 2 }],
    outputs: [{ name: 'out', channels: 2 }],
    children: [
      { name: 'gain', kind: 'gain' },
      { name: 'pan', kind: 'pan' },
    ],
    wires: [
      { from: { input: 'in' }, to: { node: 'gain', input: 'in' } },
      { from: { node: 'gain', output: 'out' }, to: { node: 'pan', input: 'in' } },
      { from: { node: 'pan', output: 'out' }, to: { output: 'out' } },
    ],
    macros: [{ name: 'level', maps: [{ to: ['gain', 'gain'], factor: 1, offset: 0 }] }], // its spec the gain's
  },
]); // each template checked as it's handed in
planner.plan('Utility', { name: 'utility', values: { level: 0.5 }, settings: { 'pan/law': 'pan pot' } });
```

How a plan is made:

1. A block's params and settings get their specs, each at its value: given by its address, written in the template, or its default. One with none is refused, naming it.
2. A child's template is planned into it, its values given by their addresses within it.
3. A macro's spec is its own, or its first target's under its name where it writes none. Its value is given, written, or its spec's default, onto its targets; a choice goes by its index and is written there as the choice. A param a macro moves is the macro's, whatever else is given for it.
4. A jack's channels are as they come where its block doesn't fix them: an input the most of what's wired into it, an output the most of its node's inputs, worked out again until a loop settles, mono where nothing comes.
5. A pool's child is made ready, as each copy will be: its wires, its note's addresses and its key kept. A note's addresses are checked under whatever names its sources have. A voice's note sets its params as it plays, so the plan has none.
6. Planned at a beat where it's asked to (`beat`, a beat's length in seconds), a synced time's free value is where its note is then, so switching sync off there changes nothing heard. A plan has no tempo of its own.

A template that names a form is held to it as it's handed in, once it's well-formed. A form is data:

- its own inputs and outputs by name, where it names them;
- its children by role, each role's kind or form and how many, at least and at most, in the roles' order where it says;
- the wires it allows, from a role's main output or a tap, or the parent's own input, into a role's input or param, or the parent's own output;
- rules by name: no loops but through the wires from a role into a role it names, and every way out ending in a role (the master).

A channel's and a desk's forms are the desk library's own; the tests have small ones.

| Export | What it does |
|---|---|
| `new Planner(templates, forms?, presets?)`: `plan()` | Handed the templates once, each built on another merged with it, each checked and held to its form, every failure said at once (`templates not well-formed:`, a line each). `plan(kind, { name, values, settings })` makes a plan for a template, or for a block alone by its kind (`planner.ts`). |
| `Asked` | What `plan()` is asked: the plan's top node's `name`, the `values` and `settings` changed by address, and the `beat` it's planned at (`planner.ts`). |
| `Form`, `FormRole`, `FormWire`, `FormFrom`, `FormTo`, `FormRule` | A form, by its name: its jacks, its roles, the wires it allows and its rules. A template held to it gets each failure said (`form.ts`). |
| `Template`, `TemplateChild`, `TemplateMacro`, `TemplatePool` | A template, by its kind: its label, the template it's built on (`extends`), the form it fulfills, its jacks, children, wires, macros and pools. A child has a name and a kind, a role and the values and settings it changes (`template.ts`). |
| `Preset`, `PresetChild`, `WrittenTemplate` | A preset on a template: its kind, its values and settings by address. A child written with a preset, and a template as written, each child by its kind or a preset (`template.ts`). |
| `templateOf()`, `presetsOf()`, `presetsShape()` | A template, or presets by name, read from data such as YAML, its shape checked before the planner's own check. Every failure is said, naming its file (`template.ts`). |

The planner's checks are internal, not exported: templates built on others are merged first (`extend.ts`); each template is checked well-formed (`check.ts`); every kind it knows, blocks and templates, is looked up as seen from outside (`catalog.ts`); a loose jack's channels come from `mono-stereo.ts`.

Tests: `test/planner.test.js`, on small templates in `test/templates.js`: the Utility planned as `libs/modular-audio/plan/format/`'s tests wrote it out by hand, so the two are held to each other.
