// ---------- plan/blocks/pan: a place between left and right ----------
// Its pan; its law a setting:
//   - stereo: a mono sound made stereo first, as loud in the middle, as the mixer's pans are;
//   - pan pot: a mono sound panned as it comes, at constant power, as a console's.
import { PAN } from '../../../base/params/index.ts';
import type { Block } from './block.ts';

export default {
  kind: 'pan',
  inputs: [{ name: 'in' }],
  outputs: [{ name: 'out', channels: 2 }],
  params: [{ ...PAN, default: 0 }],
  settings: [{ name: 'law', choices: ['stereo', 'pan pot'], default: 'stereo' }],
} as const satisfies Block;
