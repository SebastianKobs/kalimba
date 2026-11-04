// ---------- plan/planner/mono-stereo: whether a jack carries mono or stereo, as it comes ----------
// Where a block doesn't fix a jack's channels, mono or stereo, they're what comes into it:
//   - an input: the most of what's wired into it;
//   - an output: the most of its node's inputs.
// Worked out again until nothing changes, so a loop settles; mono where nothing comes.
import type { Channels, Input, Node, Wire } from '../format/index.ts';

// a jack whose channels its block doesn't fix: its child, which side, its name
export interface LooseJack {
  readonly child: string;
  readonly side: 'inputs' | 'outputs';
  readonly name: string;
}

// The children with their loose jacks' channels worked out, mono or stereo, over the parent's
// wires from its own inputs.
export function monoOrStereo(
  children: readonly Node[],
  loose: readonly LooseJack[],
  { wires, inputs }: { wires: readonly Wire[]; inputs: readonly Input[] },
): Node[] {
  const found = new Map<string, Channels>(loose.map((jack) => [keyOf(jack), 1]));
  const channelsAt = (child: string, side: 'inputs' | 'outputs', name: string): Channels =>
    found.get(keyOf({ child, side, name })) ?? jackOf(children, child, side, name)?.channels ?? 1;
  let changed = true;
  while (changed) {
    changed = false;
    for (const jack of loose) {
      const most = Math.max(1, ...comingInto(jack, { wires, inputs, channelsAt })) as Channels;
      if (most > found.get(keyOf(jack))!) {
        found.set(keyOf(jack), most);
        changed = true;
      }
    }
  }
  return children.map((child) => ({
    ...child,
    inputs: child.inputs.map((jack) => ({
      ...jack,
      channels: found.get(keyOf({ child: child.name, side: 'inputs', name: jack.name })) ?? jack.channels,
    })),
    outputs: child.outputs.map((jack) => ({
      ...jack,
      channels: found.get(keyOf({ child: child.name, side: 'outputs', name: jack.name })) ?? jack.channels,
    })),
  }));
}

// a loose jack's key among them
function keyOf({ child, side, name }: LooseJack): string {
  return `${child}/${side}/${name}`;
}
// a child's jack by its side and name
function jackOf(children: readonly Node[], child: string, side: 'inputs' | 'outputs', name: string): Input | undefined {
  return children.find((each) => each.name === child)?.[side].find((jack) => jack.name === name);
}
// the channels coming into a loose jack: an input's, from each wire into it; an output's, its node's inputs'
function comingInto(
  jack: LooseJack,
  {
    wires,
    inputs,
    channelsAt,
  }: {
    wires: readonly Wire[];
    inputs: readonly Input[];
    channelsAt: (child: string, side: 'inputs' | 'outputs', name: string) => Channels;
  },
): Channels[] {
  if (jack.side === 'outputs') {
    return wires
      .filter(({ to }) => 'node' in to && to.node === jack.child && 'input' in to)
      .map(({ to }) => channelsAt(jack.child, 'inputs', (to as { input: string }).input));
  }
  return wires
    .filter(({ to }) => 'node' in to && to.node === jack.child && 'input' in to && to.input === jack.name)
    .map(({ from }) => {
      if (!('node' in from)) {
        return inputs.find((input) => input.name === from.input)?.channels ?? 1;
      }
      return channelsAt(from.node, 'outputs', from.output);
    });
}
