// ---------- plan/blocks/select: one of two inputs passed on ----------
// Its setting names the input passed on; the other goes nowhere.
// A switch between two sources, as a console's PRE button picks where a send is taken.
import type { Block } from './block.ts';

export default {
  kind: 'select',
  inputs: [{ name: 'a' }, { name: 'b' }],
  outputs: [{ name: 'out' }],
  params: [],
  settings: [{ name: 'input', choices: ['a', 'b'], default: 'a' }],
} as const satisfies Block;
