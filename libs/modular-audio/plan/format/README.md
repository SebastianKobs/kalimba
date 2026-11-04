# modular-audio/plan/format

What a plan is: the data a builder is handed, read without the planner. It is timeless, what to build with its values and settings as it starts, and it describes itself, so nothing else is needed to build it or show it. Stored as JSON. Its jacks, params, settings, wires, macros and pools are found by address.

Depends on: `base/params`, `base/util`.

One kind of thing, a node:

- **a block**, nothing inside: its kind the block's, `oscillator`, `gain`, `pan`;
- **a composite**: its kind its template's, `Utility`; its children by name, the wires between them, its macros (its own params) and its pools, on the node itself, as a template writes them.

```ts
import { paramAt, type Node, type Plan } from './index.ts';

declare const gain: Node; // a block node
declare const pan: Node;
const utility: Plan = {
  version: 1,
  node: {
    name: 'utility',
    kind: 'Utility',
    inputs: [{ name: 'in', channels: 2 }],
    outputs: [{ name: 'out', channels: 2 }],
    params: [],
    settings: [],
    children: [gain, pan], // each a node, named
    wires: [
      { from: { input: 'in' }, to: { node: 'gain', input: 'in' } }, // the parent's own input
      { from: { node: 'gain', output: 'out' }, to: { node: 'pan', input: 'in' } },
      { from: { node: 'pan', output: 'out' }, to: { output: 'out' } },
    ],
    macros: [
      { spec: { name: 'level', range: [0, 4, 0.01] }, value: 1, maps: [{ to: ['gain', 'gain'], factor: 1, offset: 0 }] },
    ],
    pools: [],
  },
};
paramAt(utility, ['level'])?.value; // 1, the composite's macro
```

| Export | What it does |
|---|---|
| `Plan` | A plan: its format's version, and its top node, whatever was asked for, an instrument, a channel, a whole studio. Every address starts there (`plan.ts`). |
| `Node`, `BlockNode`, `Composite`, `isComposite()` | A node: its name, one of a kind in its parent; its kind; its inputs, outputs, params and settings; the form it fulfills and its role where they're given; its label and short label where its template gives them. A block has nothing more, a composite its children, wires, macros and pools (`node.ts`). |
| `Input`, `Output`, `Channels` | A node's input or output: its name and its channels, mono or stereo. A tap is an output (`input-output.ts`). |
| `Param`, `Setting` | The same shape: its spec whole (`libs/base/params/`), its value as it starts, its hint. A param is edited or automated as it plays; a setting is chosen as it's built, a change a rebuild (`param.ts`). |
| `Wire`, `WireFrom`, `WireTo` | From a child's output or the parent's own input, into a child's input, a child's param (modulation) or the parent's own output. Each end is by its address under the composite, a pool's copy by the pool's name and its number (`my tone/3`) (`wire.ts`). |
| `Macro`, `MacroTarget` | A composite's own param mapped onto its children's by their addresses: times a factor, held in a range, plus an offset; a choice goes by its index (`macro.ts`). |
| `mapOnto()`, `macroValues()` | `mapOnto(target, value)` maps a value onto a target. `macroValues(macro, value)` gives a macro's value onto each of its targets, as a builder sets them (`macro.ts`). |
| `Pool`, `NoteAddresses` | Children that come and go: the child ready, named as the pool, and the wires each copy is wired by. A copy sits under the pool, named by its number from 1; a pool of voices has the addresses its notes set (`pool.ts`). |
| `copyOf()`, `poolNamed()`, `isCopyNumber()`, `splitAtChild()` | A pool's copy as it's built; a pool by its name; whether a name under a pool is a copy's; and an address split at the child it's in under the plan's top, as a desk's strip and its param (`pool.ts`). |
| `withCopies(composite, copies)` | A composite's children and wires with copies of its pools added after its own, each copy a child named by its address (`my tone/3`) and wired by its pool's rule. A copy of no pool is refused (`pool.ts`). |
| `ValuesByAddress` | Values by their addresses as text, a preset's or a template's child's (`address.ts`). |
| `nodeAt()`, `paramAt()`, `settingAt()`, `nodeIn()`, `paramIn()`, `macroIn()` | A node, a param (a node's own or a composite's macro) or a setting found by its address, walked down by names; none where nothing's there. `nodeIn()`, `paramIn()` and `macroIn()` do the same from a node (`param-at.ts`). |
| `withSettings(plan, settings)` | A new plan with its settings changed by address, the old as it was. A pool's child's are changed for every copy; a setting not there is refused (`param-at.ts`). |
| `reached()`, `feeds()`, `wayOut()` | What feeds what over one composite's wires: what the names reach, whether one reaches another (the loop check), and where a child's way out goes (`routing.ts`). |
| `PlanMoves`, `Move` | What moves each param, worked out from a plan alone: a macro's targets by their maps, a child wired into a param as a modulator. A composite's own moves make its matrix (`moves.ts`). |
| `VERSION`, `versionOf()` | This format's version, 1. `versionOf(stored)` reads a stored plan's; one with none, not a whole number or newer is refused, naming what it found (`version.ts`). |

Tests: `test/format.test.js`, on the examples in `test/plans.ts`, an effect, an instrument and a desk typed as plans so the type check holds them to the format. A plan stored as JSON and read back is proved where the plans are made: a desk's in `libs/modular-audio/plan/desk/test/desk.test.js`, a patch's in `libs/modular-audio/plan/instrument/test/patch-plans.test.js`.
