// ---------- build/web-audio/blocks/noise: noise in Web Audio ----------
// A buffer of noise, its length its color's (NOISE_SECONDS), looped where it says.
// Started at its copy's time, from somewhere in its buffer: drawn up to its offset, so each hit
// is noise from somewhere else in it. Stopped its stop after it starts, where it has one.
import { NOISE_SECONDS } from '../../../plan/blocks/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode, webAudioNode } from '../built-node.ts';
import { settingOf, valueOf, type Making } from '../making.ts';
import { toldParam } from '../param-units.ts';
import { SourceTimes } from './source-times.ts';

export function noise(node: Node, making: Making): BuiltNode {
  const made = making.kept(making.context.createBufferSource());
  const color = settingOf(node, 'color') as keyof typeof NOISE_SECONDS; // one of its block's colors
  made.buffer = making.buffers.noise(NOISE_SECONDS[color]);
  made.loop = settingOf(node, 'loop') === 'on';
  let offset = Number(valueOf(node, 'offset'));
  const times = new SourceTimes(made, { stop: Number(valueOf(node, 'stop')), now: () => making.context.currentTime });
  making.started(
    made,
    (at) => times.start(at, making.random() * offset),
    (at) => times.stopBy(at),
  );
  const offsetParam = toldParam(
    () => offset,
    (value) => {
      offset = value;
    },
  );
  return new BuiltNode({
    input: made,
    output: made,
    params: { offset: offsetParam, stop: times.stopParam() },
    node: webAudioNode(made),
    kind: 'an AudioBufferSourceNode',
  });
}
