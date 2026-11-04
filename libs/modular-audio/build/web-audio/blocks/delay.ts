// ---------- build/web-audio/blocks/delay: a delay in Web Audio ----------
// Made for its longest time. Its time with a sync switch, three params side by side, moving its one
// delay line: synced, its note at the beat; free, its ms; turned into seconds by the clock's note values.
// While synced, a new tempo followed, gliding.
// A signal wired into its ms goes into the line's own time: it moves the line in seconds, as
// Web Audio's does, whichever of the three sets it (a tape's wobble, 0.004 four ms either way).
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode } from '../built-node.ts';
import { settingOf, valueOf, type Making } from '../making.ts';
import { timeHeld, TimeWithSync } from './time-with-sync.ts';

export function delay(node: Node, making: Making): BuiltNode {
  const made = making.kept(making.context.createDelay(Number(settingOf(node, 'longest'))));
  const held = timeHeld(valueOf(node, 'sync'), valueOf(node, 'note'), valueOf(node, 'ms'), making.beat());
  const time = new TimeWithSync(made.delayTime, held, 'ms');
  making.followsTempo((beat, when, now) => time.tempo(beat, when, now));
  return new BuiltNode({
    input: made,
    output: made,
    params: { sync: time.param('sync'), note: time.param('note'), ms: time.param('free') },
    cables: { ms: [made.delayTime] },
    kind: 'a DelayNode',
  });
}
