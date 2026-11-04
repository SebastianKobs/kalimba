// ---------- build/web-audio/placeholder: a block it can't make ----------
// A gain at 1 in its place: its sound passed straight through, its inputs to its outputs;
// a source, with nothing coming in, silent. Said by its address among what's built.
import { BuiltNode } from './built-node.ts';
import type { Making } from './making.ts';

export function placeholder(making: Making): BuiltNode {
  return BuiltNode.of(making.kept(making.context.createGain()));
}
