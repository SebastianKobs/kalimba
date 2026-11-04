// ---------- plan/instrument/patch-plans: a patch planned from a file of instruments ----------
// By the patch's name:
//   - its chains: the patch alone, or its rack's pads, each its key;
//   - its instrument: a pool of voices of its voice card, or a drum rack, a pool for each pad.
// The planner of the file's voice cards: the modules' templates and the file's own.
import type { Plan } from '../format/index.ts';
import { Planner, type WrittenTemplate } from '../planner/index.ts';
import { SYNTH_FORMS } from './architecture-form.ts';
import { instrumentOf, type Chain } from './instrument.ts';
import type { Instruments } from './instruments-file.ts';

// the planner of voice cards: a file's modules and its own templates, and any more given
export function cardPlanner(instruments: Instruments, more: readonly WrittenTemplate[] = []): Planner {
  return new Planner([...instruments.modules, ...instruments.templates, ...more], SYNTH_FORMS);
}
// a patch's instrument, planned: a patch or a rack the instruments have, by its name
export function patchPlan(name: string, instruments: Instruments): Plan {
  const kind = `${name} instrument`;
  const instrument = instrumentOf(kind, chainsOf(instruments, name), instruments.templates);
  return cardPlanner(instruments, [instrument]).plan(kind);
}
// A patch's chains, as its instrument plays them: its rack's pads, each its key, or the patch
// alone. A patch the instruments have.
export function chainsOf(instruments: Instruments, name: string): Chain[] {
  const rack = instruments.racks[name];
  if (rack) {
    return rack.map(({ key, patch }) => ({ key, patch: instruments.patches[patch]! })); // a pad plays a patch the file has
  }
  return [{ patch: instruments.patches[name]! }];
}
