// ---------- plan/blocks/reverb: a room ----------
// Its impulse response its own, made by each builder; its length a setting.
import type { Block } from './block.ts';

// how long its tail is
export const REVERB_LENGTH = { name: 'length', unit: 's', range: [0.2, 8, 0.1], default: 3.5 } as const;

export default {
  kind: 'reverb',
  inputs: [{ name: 'in' }],
  outputs: [{ name: 'out', channels: 2 }],
  params: [],
  settings: [REVERB_LENGTH],
  tail: true,
} as const satisfies Block;
