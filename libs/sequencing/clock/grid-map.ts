// ---------- clock/grid-map: where a song time lies on the grid as it was played, the tempo as it was then ----------
import type { Clock } from './clock.ts';
import type { BeatGrid } from './beat-grid.ts';
import { HISTORY } from './song-time.ts';
import { firstAfter } from '../../base/util/index.ts';

// what it reads of the grid: where a time lies on it and back, its bars and beats, a hold, song time, and a time with the holds alone out
export type HeardGrid = Pick<
  BeatGrid,
  | 'straightAt'
  | 'straightTime'
  | 'stepsPerBar'
  | 'stepsPerBeat'
  | 'heldAt'
  | 'songTime'
  | 'timeOfSong'
  | 'playedTime'
  | 'locate'
>;

// the 16ths heard along one located line, each its number and its straight time's song time, in the order played
interface Run {
  readonly steps: number[];
  readonly songs: number[];
  readonly shift: number; // song time less the time with the holds out: the line's, the same for all of it
}

const KEEP = HISTORY + 60; // s of song time: the history kept, and a minute more
const TRIM_EVERY = 1024; // 16ths: what's past let go this often, not on every one
const SAME_LINE = 1e-6; // s: shifts this close are one line, as sums worked out at different times differ by a hair

// Where each 16th fell as the grid played it, heard as it's scheduled:
//   - a time long past lies where it was played after the tempo has changed,
//     the bars lined up; the grid itself knows only the tempo now;
//   - straight, so a swung note lies where it sounded;
//   - in song time, the times it's asked and answers, so a hold (a stop's, or
//     live play's while a recording played back), where no 16th fell, takes no room;
//   - a locate is a jump in song time between two 16ths, so each located line is
//     kept apart: no interval is stretched over a jump, a song time it skipped lies
//     counted back from the first 16th after it, at the tempo now, and one heard
//     on two lines lies on the later;
//   - its places are the grid's less an offset, nothing until a recording is loaded
//     (startOver()): song time 0 lies at place 0, whatever the page's age.
export class GridMap {
  readonly #grid: HeardGrid;
  readonly #runs: Run[] = []; // each located line's 16ths, in the order played
  #offset = 0; // the grid's place less this map's: where its place 0 lies on the grid

  constructor({ clock }: { clock: Pick<Clock, 'onStep'> & { grid: HeardGrid } }) {
    this.#grid = clock.grid;
    clock.onStep((i) => this.#played(i, clock.grid.straightTime(i)));
  }
  // the song position located at a song time at a clock time, as a recording is loaded and its end is the present: what was heard before
  // let go, song time 0 at the place 0, the present at the place the song time takes at the tempo now, the 16ths after it laid out from there
  startOver(song: number, t: number): void {
    this.#grid.locate(song, t);
    const at = Math.max(t, this.#grid.heldAt ?? t); // held, it stands from where it was held
    const present = this.#grid.songTime(at);
    const place = present / this.#stepNow();
    this.#offset = this.#grid.straightAt(at) - place;
    this.#runs.length = 0;
    this.#runs.push({ steps: [place], songs: [present], shift: present - this.#grid.playedTime(at) });
  }
  // a song time's place, in 16ths: between two 16ths of a line heard as far as it lies between them, a hold taking no room, those skipped as
  // the ticks lagged counted, the latest line first; one a locate skipped, counted back from the first 16th after it; past the last one
  // heard, or before the first, at the tempo now; from the song time the grid was held at, the place it's held at, the 16ths scheduled
  // ahead of it not counted, so the present stands still
  placeOf(song: number): number {
    const heldAt = this.#grid.heldAt;
    if (heldAt !== null && song >= this.#grid.songTime(heldAt)) {
      return this.#grid.straightAt(heldAt) - this.#offset;
    }
    for (let line = this.#runs.length - 1; line >= 0; line--) {
      const { steps, songs } = this.#runs[line]!;
      const after = firstAfter(songs, song, (heard) => heard);
      if (after === songs.length && song === songs[after - 1]) {
        return steps[after - 1]!; // the line's last 16th itself
      }
      if (after <= 0 || after >= songs.length) {
        continue;
      }
      const before = after - 1;
      const from = songs[before]!; // both within, as found
      const span = songs[after]! - from;
      const along = span > 0 ? (song - from) / span : 1;
      return steps[before]! + along * (steps[after]! - steps[before]!);
    }
    const skipped = this.#skippedBefore(song);
    if (skipped === null) {
      return this.#grid.straightAt(this.#grid.timeOfSong(song)) - this.#offset;
    }
    return skipped.steps[0]! - (skipped.songs[0]! - song) / this.#stepNow();
  }
  // a place's song time, the other way: between two 16ths of a line heard as far as it lies between them; before the first of a line,
  // after the last of the one before, counted back from it; past the last one heard, at the tempo now
  timeOf(place: number): number {
    for (const { steps, songs } of this.#runs) {
      if (place < steps[0]!) {
        return songs[0]! - (steps[0]! - place) * this.#stepNow(); // before the line, between two or before them all
      }
      const after = firstAfter(steps, place, (step) => step);
      if (after === steps.length && place === steps[after - 1]) {
        return songs[after - 1]!; // the line's last 16th itself
      }
      if (after >= steps.length) {
        continue;
      }
      const before = after - 1;
      const along = (place - steps[before]!) / (steps[after]! - steps[before]!); // both within, as found
      return songs[before]! + along * (songs[after]! - songs[before]!);
    }
    return this.#grid.songTime(this.#grid.straightTime(place + this.#offset));
  }
  // a bar's length in 16ths, by the time signature now
  stepsPerBar(): number {
    return this.#grid.stepsPerBar();
  }
  // a beat's, a quarter in 4/4
  stepsPerBeat(): number {
    return this.#grid.stepsPerBeat();
  }
  // seconds to a 16th, the tempo now
  #stepNow(): number {
    return this.#grid.straightTime(1) - this.#grid.straightTime(0);
  }
  // the line a song time was skipped before, the nearest that begins after it, or the first of all, one before them: none if it lies past
  // them all
  #skippedBefore(song: number): Run | null {
    let next: Run | null = null;
    for (const run of this.#runs) {
      const first = run.songs[0]!;
      if (first > song && (next === null || first < next.songs[0]!)) {
        next = run;
      }
    }
    return next;
  }
  #played(i: number, t: number): void {
    const song = this.#grid.songTime(t);
    const shift = song - this.#grid.playedTime(t);
    const latest = this.#runs.at(-1);
    const run =
      latest !== undefined && Math.abs(latest.shift - shift) < SAME_LINE ? latest : { steps: [], songs: [], shift };
    if (run !== latest) {
      this.#runs.push(run);
    }
    run.steps.push(i - this.#offset);
    run.songs.push(song);
    if (run.steps.length % TRIM_EVERY === 0) {
      this.#letGoBefore(song - KEEP);
    }
  }
  // what's played before a song time let go, a line emptied with it
  #letGoBefore(horizon: number): void {
    for (const run of this.#runs) {
      const kept = run.songs.findIndex((heard) => heard >= horizon);
      const drop = kept === -1 ? run.songs.length : kept;
      run.steps.splice(0, drop);
      run.songs.splice(0, drop);
    }
    this.#runs.splice(0, this.#runs.length, ...this.#runs.filter((run) => run.songs.length > 0));
  }
}
