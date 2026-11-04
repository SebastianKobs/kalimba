// ---------- plan/format/input-output: a node's inputs and outputs ----------
// Each one by its name, one of a kind among its node's inputs or its outputs,
// and the channels it carries. A tap is an output.

// the channels a signal carries: mono or stereo
export type Channels = 1 | 2;
// a node's input: its name and its channels
export interface Input {
  readonly name: string;
  readonly channels: Channels;
}
// a node's output: the same, a name and its channels
export type Output = Input;
