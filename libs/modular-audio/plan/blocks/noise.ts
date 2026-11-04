// ---------- plan/blocks/noise: noise, as a source ----------
// No input, its noise out. Its color a setting: noise, or a short breath.
// Looped or not, a setting: looped, it runs on (wind, a brush's bed).
// Its offset: the furthest into its buffer it starts, the start drawn up to it as its voice
// starts, so each hit is noise from somewhere else in it.
// Its stop, where it has one.
import { STOP, type Block } from './block.ts';

// each color's buffer, as a builder that plays noise from a looping buffer makes it, in seconds: a noise long, a breath short
export const NOISE_SECONDS = { noise: 2, breath: 0.2 } as const;

export default {
  kind: 'noise',
  inputs: [],
  outputs: [{ name: 'out', channels: 1 }],
  params: [{ name: 'offset', unit: 's', range: [0, 2, 0.01], default: 0 }, STOP],
  settings: [
    { name: 'color', choices: ['noise', 'breath'], default: 'noise' },
    { name: 'loop', choices: ['off', 'on'], default: 'off' },
  ],
} as const satisfies Block;
