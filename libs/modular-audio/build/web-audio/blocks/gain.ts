// ---------- build/web-audio/blocks/gain: a gain in Web Audio ----------
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode } from '../built-node.ts';
import { atValues, type Making } from '../making.ts';

export function gain(node: Node, making: Making): BuiltNode {
  return atValues(BuiltNode.of(making.kept(making.context.createGain())), node);
}
