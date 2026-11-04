// ---------- music-theory/walk: a contour walked, a step at a time ----------

// a contour walked: the root it's on, and how far along
export interface Walk {
  root: number;
  position: number;
}
// a contour walked from a root that moves, as a line's from the scale step under a
// finger: its next step on the same root, and from its start on a new one, so a move
// is heard as itself first. walk: { root, position } so far, or null; the next,
// with its step
export function walkOn(contour: number[], walk: Walk | null | undefined, root: number): Walk & { step: number } {
  const position = walk && walk.root === root ? walk.position + 1 : 0;
  const step = contour[position % contour.length];
  if (step === undefined) {
    throw new Error('a contour with no steps');
  }
  return { root, position, step };
}
