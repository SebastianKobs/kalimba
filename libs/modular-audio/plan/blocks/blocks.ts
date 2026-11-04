// ---------- plan/blocks/blocks: every block, by its kind ----------
// The list each builder checks itself against: each one built, or a placeholder put in.
import delay from './delay.ts';
import envelope from './envelope.ts';
import filter from './filter.ts';
import gain from './gain.ts';
import limiter from './limiter.ts';
import noise from './noise.ts';
import oscillator from './oscillator.ts';
import pan from './pan.ts';
import reverb from './reverb.ts';
import select from './select.ts';
import { frozen } from '../../../base/util/index.ts';
import type { Block } from './block.ts';

// a block's kind
export type BlockKind = keyof typeof BLOCKS;

// every block by its kind, frozen all the way down, the specs it shares too
export const BLOCKS = frozen({
  oscillator,
  gain,
  filter,
  pan,
  delay,
  reverb,
  noise,
  limiter,
  envelope,
  select,
}) satisfies Readonly<Record<string, Block>>;
