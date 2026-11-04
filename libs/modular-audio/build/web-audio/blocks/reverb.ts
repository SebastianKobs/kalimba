// ---------- build/web-audio/blocks/reverb: a reverb in Web Audio ----------
// A convolver, its impulse response its length's, made once (buffers.ts).
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode } from '../built-node.ts';
import { settingOf, type Making } from '../making.ts';

export function reverb(node: Node, making: Making): BuiltNode {
  const made = making.kept(making.context.createConvolver());
  made.buffer = making.buffers.impulse(Number(settingOf(node, 'length')));
  return BuiltNode.of(made);
}
