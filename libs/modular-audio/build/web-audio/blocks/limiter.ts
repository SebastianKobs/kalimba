// ---------- libs/modular-audio/build/web-audio/blocks/limiter: how a limiter holds at its ceiling, as hard as Web Audio's compressor goes ----------
// Its settings are a limiter block's (libs/modular-audio/plan/blocks/limiter.ts), the Limiter effect's on it; Web Audio's quirk, the makeup gain
// its compressor adds, is taken back here, at the edge, where Web Audio is
import { BuiltNode } from '../built-node.ts';
import { ParamInUnits } from '../param-units.ts';
import { gainOf } from '../../../../base/params/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import { atValues, type Making } from '../making.ts';

const HOLD = { ratio: 20, knee: 0, attack: 0.003 }; // as hard as Web Audio's compressor goes
// Web Audio's compressor adds a makeup gain of its own, which nothing turns off: for a hard knee, 0.6 times how far its curve brings full
// scale down (the spec's, measured in Firefox), in dB
export function makeupOf(threshold: number, ratio: number): number {
  return 0.6 * -threshold * (1 - 1 / ratio);
}
// a limiter as Web Audio holds it, as a limiter block declares it (libs/modular-audio/plan/blocks/limiter.ts): its gain (drive) into a compressor at its
// ceiling, as hard as it goes, and the gain (back) that takes its makeup back; its params in the plan's units, its gain in dB, its ceiling
// in dBFS, its release in s. Read as Ableton's: its in after its gain, its out, and how much it takes away now, in dB
// kept: each node it makes, handed to whoever takes them apart later
export function limiterNodes(
  audioContext: BaseAudioContext,
  kept = <Made extends AudioNode>(node: Made): Made => node,
): BuiltNode {
  const drive = kept(audioContext.createGain());
  const compressor = kept(audioContext.createDynamicsCompressor());
  const back = kept(audioContext.createGain());
  for (const setting of ['ratio', 'knee', 'attack'] as const) {
    compressor[setting].value = HOLD[setting];
  }
  drive.connect(compressor).connect(back);
  return new BuiltNode({
    input: drive,
    output: back,
    params: {
      gain: new ParamInUnits([[drive.gain, gainOf]]),
      ceiling: new ParamInUnits([
        [compressor.threshold, (ceiling) => ceiling],
        [back.gain, (ceiling) => gainOf(-makeupOf(ceiling, HOLD.ratio))],
      ]),
      release: new ParamInUnits([[compressor.release, (release) => release]]),
    },
    points: { in: drive, out: back },
    readings: { reduction: () => -compressor.reduction },
  });
}
// A limiter block made, at its gain, ceiling and release as it starts.
export function limiter(node: Node, making: Making): BuiltNode {
  return atValues(
    limiterNodes(making.context, (made) => making.kept(made)),
    node,
  );
}
