// ---------- clock/quantizer: the grids a time can snap to, and where it lands on one ----------
import type { BeatGrid } from './beat-grid.ts';
import { noteValueBeats } from '../../base/params/index.ts';

// the grids a time can snap to: note values on the beat grid, in 16ths. Triplets are always straight
// a grid's step in 16ths, and whether it's a triplet; off, none
export type SnapGrid = { g: number; triplet?: boolean } | null;
// an option given as undefined is one not given
export interface SnapOptions {
  straight?: boolean | undefined;
  nearest?: boolean | undefined;
  late?: number | undefined;
  grid?: string | undefined;
}
// a grid's places and times: as if it didn't swing (flat), or on the swung grid itself
interface GridOf {
  place: (moment: number) => number;
  time: (step: number) => number;
}

export const GRIDS: Readonly<Record<string, SnapGrid>> = {
  off: null,
  ...Object.fromEntries(['1/4', '1/4t', '1/8', '1/8t', '1/16', '1/16t'].map((name) => [name, gridOfNoteValue(name)])),
};

// a tap grid's step in 16ths, from its note value; a triplet's marked
function gridOfNoteValue(name: string): SnapGrid {
  const steps = noteValueBeats(name)! * 4; // the names above are note values
  if (name.endsWith('t')) {
    return { g: steps, triplet: true };
  }
  return { g: steps };
}
// where a tap at t lands on a grid (GRIDS, by its name): { at, on }, when it sounds and the time of the step it belongs to. soonest: the
// audio's next chunk, which it never comes before (AudioClock's soonest()).
// The grid runs on with the beat, a constant stream of time. A tap snaps to its next step at least 4 ms after t, and never before the
// audio's next chunk, so on is at. It's found on the swung grid itself: the first step that sounds at least 4 ms on. Picking it on the
// straight grid and swinging it afterwards would skip a 16th whose straight time had passed but whose swung time hadn't: up to 1.76 16ths
// late, a third of all taps with swing on 8ths. With straight, it's found on the grid as if it didn't swing, for what's played straight
// against the swing: taps, so they keep your rhythm. Triplets are always straight. With nearest, a tap belongs to the step nearer it, the
// one just gone, if it's at most `late` s after it, or the next. If that's gone, or too close for the audio to make, it sounds at once, a
// little after its step; else on that step, as with next. Off plays it at once
export function snap(
  t: number,
  beatGrid: BeatGrid,
  soonest: number,
  gridName: string,
  { straight = false, nearest = false, late = Infinity }: SnapOptions = {},
): { at: number; on: number } {
  const spec = GRIDS[gridName];
  const soon = Math.max(t, soonest);
  if (!spec) {
    const at = soon + 0.005;
    return { at, on: at };
  }
  const grid = gridOf(beatGrid, straight || !!spec.triplet);
  if (nearest) {
    return snapNearest(t, soon, spec.g, late, grid);
  }
  const at = grid.time(Math.ceil(grid.place(soon + 0.004) / spec.g - 1e-9) * spec.g);
  return { at, on: at };
}
function gridOf(beatGrid: BeatGrid, flat: boolean): GridOf {
  if (flat) {
    return { place: (moment) => beatGrid.straightAt(moment), time: (step) => beatGrid.straightTime(step) };
  }
  return { place: (moment) => beatGrid.stepAt(moment), time: (step) => beatGrid.timeAt(step) };
}
// to the step nearer it, the one just gone if it's at most late s after it, or the next; at once, a little after its step, if that's
// gone or too close for the audio to make
function snapNearest(t: number, soon: number, spacing: number, late: number, grid: GridOf): { at: number; on: number } {
  const index = Math.floor(grid.place(t) / spacing + 1e-9);
  const prev = grid.time(index * spacing);
  const next = grid.time((index + 1) * spacing);
  const on = t - prev < next - t && t - prev <= late ? prev : next;
  return { at: on < soon + 0.004 ? soon + 0.005 : on, on };
}
