# modular-audio/build/contract

What every builder is and what it hands back, the same for every builder: a desk and the voices talk to it, whichever builder is behind it. The plan is the schematic, timeless; what's built is the thing, the desk in the room or the synth on the table, held as its front panel with its controls and slots by address and its parts inside, out of reach. Two builds of one plan are two machines, each told on its own. What's built is set and automated by address.

Depends on: `base/automation`, `base/util`, `modular-audio/plan/format`.

```ts
import type { Automation } from '../../../base/automation/index.ts';
import type { Plan } from '../../plan/format/index.ts';
import type { Builder } from './index.ts';

function play(builder: Builder<AudioNode>, plan: Plan, destination: AudioNode, automation: readonly Automation[]): void {
  const built = builder.build(plan, { into: destination });
  built.set(['channel', '1', 'utility', 'level'], 0.5, { glide: 0.05 }); // a knob turned, gliding from now
  built.automate(['voice', '3', 'filter', 'frequency'], automation); // a lane's curve, from now
  built.preset({ 'filter/frequency': 900 }, { 'filter/slope': '12' }); // values together; a setting changed is a rebuild
  built.tempo(60 / 96); // each synced time follows the new beat
  const voice = ['synth', 'voice', '3']; // a pool's copy: the pool's name and its number
  built.add(voice, 2, destination); // built from the pool's child at time 2, its outputs into `destination`
  built.stopBy(voice, 4); // its sources stopped by when it's silent, as its owner works it out
  built.letGo(voice); // once it has rung out
  built.rebuild(plan); // a setting or the structure changed: built again, the old ringing out
  built.dispose();
}
```

| Export | What it does |
|---|---|
| `Builder<Into>`: `build()` | Handed a plan and where its sound goes (`into`, and optionally `from` for each input by name), a builder's own kind of place, it builds the plan and hands back a `Built` (`builder.ts`). |
| `Built`: `set()`, `automate()`, `preset()`, `tempo()`, `add()`, `stopBy()`, `letGo()`, `rebuild()`, `faded()`, `placeholders`, `dispose()` | What's built. `set()` sets a param by its address, now, at a time or gliding there; `automate()` tells a param its events from a time; `preset()` sets values together, a changed setting being a rebuild; `tempo()` makes each synced time follow a new beat (`built.ts`). |

A pool's copy, an instrument's voice or a desk's channel alike, is added by its own address, its sources started at a time and its outputs sent into a destination of its own where one is given. `stopBy()` stops its sources by the time it has gone silent; `letGo()` takes it apart once it has rung out. `rebuild()` builds a plan again with the old ringing out. `faded()` says when what a block makes, an envelope's, has faded for good, so a voice's owner knows when it has rung out. `placeholders` lists what the builder couldn't build, by address: a block's sound passed straight through, a source silent.

Tests: none, as only types: what meets them is tested where it's built (`libs/modular-audio/build/web-audio`).
