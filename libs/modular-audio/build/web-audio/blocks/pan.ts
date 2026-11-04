// ---------- libs/modular-audio/build/web-audio/blocks/pan: a pan in Web Audio ----------
// By its law:
//   - stereo: a stereo panner, a mono sound made stereo first, as loud in the middle, as the mixer's pans are;
//   - pan pot: a mono sound panned as it comes, Web Audio's own way, constant power.
// Where the context has no stereo panner, a gain passing the sound through, unpanned.

import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode } from '../built-node.ts';
import { atValues, settingOf, type Making } from '../making.ts';

// a pan's law
export type PanLaw = 'stereo' | 'pan pot';

// A pan, by its law, where the context can pan.
export function panOf(context: BaseAudioContext, law: PanLaw, canPan: boolean): AudioNode {
  if (!canPan) {
    return context.createGain(); // no stereo panner: it passes through, unpanned
  }
  const pan = context.createStereoPanner();
  if (law === 'pan pot') {
    return pan;
  }
  pan.channelCountMode = 'explicit';
  pan.channelCount = 2; // a mono sound made stereo first, so it's as loud in the middle
  return pan;
}
// A pan block made, by its law, its position as it starts.
export function pan(node: Node, making: Making): BuiltNode {
  const law = settingOf(node, 'law') === 'pan pot' ? 'pan pot' : 'stereo';
  return atValues(BuiltNode.of(making.kept(panOf(making.context, law, making.canPan))), node);
}
