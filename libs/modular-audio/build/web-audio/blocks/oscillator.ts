// ---------- build/web-audio/blocks/oscillator: an oscillator in Web Audio ----------
// Its wave; its rate a time with a sync switch, synced its note at the beat, free its frequency;
// its detune. Started at its copy's time, its phase reset with each note; or as it's built,
// running free. Stopped its stop after it starts, where it has one.
// A signal wired into its frequency goes into the oscillator's own, in Hz (FM).
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode, webAudioNode } from '../built-node.ts';
import { settingOf, valueOf, type Making } from '../making.ts';
import { SourceTimes } from './source-times.ts';
import { timeHeld, TimeWithSync } from './time-with-sync.ts';

export function oscillator(node: Node, making: Making): BuiltNode {
  const made = making.kept(making.context.createOscillator());
  made.type = settingOf(node, 'wave') as OscillatorType; // one of its block's waves
  made.detune.value = Number(valueOf(node, 'detune'));
  const held = timeHeld(valueOf(node, 'sync'), valueOf(node, 'note'), valueOf(node, 'frequency'), making.beat());
  const rate = new TimeWithSync(made.frequency, held, 'Hz');
  making.followsTempo((beat, when, now) => rate.tempo(beat, when, now));
  const times = new SourceTimes(made, { stop: Number(valueOf(node, 'stop')), now: () => making.context.currentTime });
  const free = settingOf(node, 'phase') === 'free';
  making.started(
    made,
    (at) => times.start(free ? undefined : at),
    (at) => times.stopBy(at),
  );
  return new BuiltNode({
    input: made,
    output: made,
    params: {
      sync: rate.param('sync'),
      note: rate.param('note'),
      frequency: rate.param('free'),
      detune: made.detune,
      stop: times.stopParam(),
    },
    cables: { frequency: [made.frequency], detune: [made.detune] },
    node: webAudioNode(made),
    kind: 'an OscillatorNode',
  });
}
