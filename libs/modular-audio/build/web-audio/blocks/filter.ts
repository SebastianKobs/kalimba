// ---------- libs/modular-audio/build/web-audio/blocks/filter: a filter in Web Audio, biquads in series ----------
// One at 12 dB an octave, two at 24, their Qs the filter block's (biquadQs()), its cutoff on each.
// Its Q a plain ratio as a plan has it, 0.707 flat. Web Audio reads a lowpass's and a highpass's
// in dB, its level at the cutoff, so it's turned there; a bandpass's is a ratio there too.
import { BuiltNode, type WebAudioNode } from '../built-node.ts';
import { ParamInUnits } from '../param-units.ts';
import { dBOf } from '../../../../base/params/index.ts';
import { biquadQs } from '../../../plan/blocks/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import { atValues, settingOf, valueOf, type Making } from '../making.ts';

// A biquad as built, of its type, its Q a plain ratio.
export function biquadOf(biquad: BiquadFilterNode, type: unknown): BuiltNode {
  if (type !== 'lowpass' && type !== 'highpass') {
    return BuiltNode.of(biquad);
  }
  const { frequency, detune, gain, Q } = biquad;
  return new BuiltNode({
    input: biquad,
    output: biquad,
    params: { frequency, detune, gain, Q: new ParamInUnits([[Q, dBOf]]) },
    node: biquad as unknown as WebAudioNode, // one of Web Audio's: set, wired and cabled as it is
    kind: 'a BiquadFilterNode',
  });
}

// A filter block made: its biquads in series, its sound in at the first and out of the last;
// its frequency, its detune and its resonance each one param moving every stage, its frequency
// and its detune cabled into each: a cutoff in cents follows an envelope.
export function filter(node: Node, making: Making): BuiltNode {
  const type = String(settingOf(node, 'type'));
  const slope = String(settingOf(node, 'slope'));
  const stagesAt = (resonance: number): (number | undefined)[] => biquadQs({ type, resonance, slope });
  const stages = stagesAt(Number(valueOf(node, 'resonance'))).map(() => {
    const biquad = making.kept(making.context.createBiquadFilter());
    biquad.type = type as BiquadFilterType; // one of its block's types
    return biquad;
  });
  for (const [index, stage] of stages.slice(1).entries()) {
    stages[index]!.connect(stage); // the one before it into it
  }
  const built = new BuiltNode({
    input: stages[0]!, // one at least, at any slope
    output: stages.at(-1)!,
    params: {
      frequency: new ParamInUnits(stages.map((stage) => [stage.frequency, (hz) => hz])),
      detune: new ParamInUnits(stages.map((stage) => [stage.detune, (cents) => cents])),
      resonance: new ParamInUnits(stages.map((stage, index) => [stage.Q, (q) => qIn(type, stagesAt(q)[index] ?? q)])),
    },
    cables: { frequency: stages.map((stage) => stage.frequency), detune: stages.map((stage) => stage.detune) },
    kind: `a filter, ${stages.length} biquads`,
  });
  return atValues(built, node);
}

// a stage's Q as Web Audio reads it: a lowpass's and a highpass's in dB, a bandpass's a ratio
function qIn(type: string, q: number): number {
  return type === 'lowpass' || type === 'highpass' ? dBOf(q) : q;
}
