// ---------- plan/blocks/block: a building block, declared ----------
// A node with no inside: what every builder has to build, or put a placeholder in for.
// Declared by its kind: its inputs and outputs, its params' specs, its settings'.
import type { ParamSpec } from '../../../base/params/index.ts';
import type { Channels } from '../format/index.ts';

// a block's input or output: its name; its channels where the block fixes them,
// else as they come, the plan's node saying
export interface Jack {
  readonly name: string;
  readonly channels?: Channels;
}
// a block: its kind, its inputs and outputs, its params and its settings, each a spec;
// tail: whether it sounds on after its input stops, a delay's echoes, a reverb's tail
export interface Block {
  readonly kind: string;
  readonly inputs: readonly Jack[];
  readonly outputs: readonly Jack[];
  readonly params: readonly ParamSpec[];
  readonly settings: readonly ParamSpec[];
  readonly tail?: boolean;
}

// A source's stop, in s from the note's start: an oscillator's, a noise's.
// At 0, none, as it starts: it plays until its voice is let go.
export const STOP = { name: 'stop', unit: 's', range: [0, 10, 0.01], default: 0 } as const satisfies ParamSpec;
