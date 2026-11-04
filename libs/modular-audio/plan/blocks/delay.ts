// ---------- plan/blocks/delay: a delay ----------
// Its time with a sync switch, as Ableton's: synced, a note value at the tempo; free, in ms.
// Each builder turns a synced note into seconds by the tempo. Its longest time a setting.
// A signal wired into its ms moves its line in seconds, as Web Audio's does: a tape's wobble.
import { timeSpecs } from '../../../base/params/index.ts';
import { frozen } from '../../../base/util/index.ts';
import type { Block } from './block.ts';

// Its time's three params: synced to an 8th to start; free, up to its longest time.
// Its free time set at its time, never glided: a line's time moving bends its pitch.
const TIME = timeSpecs({ unit: 'ms', range: [1, 4000, 1], start: { sync: true, note: '1/8', free: 417 } });
export const DELAY_TIME = frozen({ ...TIME, ms: { ...TIME.ms, glides: false } } as const);

export default {
  kind: 'delay',
  inputs: [{ name: 'in' }],
  outputs: [{ name: 'out' }],
  params: [DELAY_TIME.sync, DELAY_TIME.note, DELAY_TIME.ms],
  settings: [{ name: 'longest', unit: 's', range: [0.1, 10, 0.1], default: 4 }],
  tail: true,
} as const satisfies Block;
