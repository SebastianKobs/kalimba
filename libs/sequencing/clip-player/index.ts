// ---------- libs/sequencing/clip-player: the clip player, its model, no DOM ----------
// Its parts:
//   - player.ts: clips launched on tracks, looping on the grid, their notes played into an input.
//   - messages.ts: what's asked of a clip in its slot, launched or deleted.
export { ClipPlayer, type Clip, type ClipNote } from './player.ts';
export type { ClipMessage } from './messages.ts';
