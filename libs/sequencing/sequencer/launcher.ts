// ---------- libs/sequencing/sequencer/launcher: clips launched on tracks, their events handed on as they come due ----------
// As Ableton's session view launches a clip: a pattern on a track, one a track.
// A clip loops on the beat grid, or plays once from the next beat, its first event to its last.
// Each 16th (step()): every clip's events due there handed on at the clock times they fall at,
//   - on the swing, or straight under it, as its clip plays or as the event says;
//   - an event off its 16th where it falls in it.
// Knows nothing of what its events are: whoever launched them plays them (play()).
// Each launch has a number of its own.
import type { BeatGrid } from '../clock/index.ts';
import type { Seconds } from '../../base/util/index.ts';
import type { Pattern, PatternEvent } from './pattern.ts';
import { beatTicks, STEP } from '../clock/index.ts';
import { due, whole } from './playing.ts';

// A clip as launched: the track it plays on, its pattern, and how it plays.
// straight: under the grid's swing, or on it; an event of its own may say otherwise.
// once: from the next beat, its first event to its last, then it ends; else it loops.
export interface LaunchedClip<Track, Event extends PatternEvent> {
  track: Track;
  pattern: Pattern<Event>;
  straight?: boolean | undefined;
  once?: boolean | undefined;
}
// the grid a clip plays on, the clock's: its time signature, a 16th's swing, the clock time a place on it falls at, ticks in seconds
export type ClipGrid = Pick<BeatGrid, 'meter' | 'swingAt' | 'timeAt' | 'secondsOf'>;
// an event handed on: its track, the event, the clock time it falls at, and its clip's launch
export type PlayEvent<Track, Event extends PatternEvent> = (
  track: Track,
  event: Event,
  at: Seconds,
  launch: number,
) => void;
// A clip played once, as it starts and ends:
//   - started: its span, from its first event's time to its last's end;
//   - ended: its last event handed on; not told for one launched over or stopped.
export interface ClipsTold<Track> {
  started?: ((track: Track, launch: number, span: Span) => void) | undefined;
  ended?: ((track: Track, launch: number) => void) | undefined;
}
export interface Span {
  from: Seconds;
  until: Seconds;
}
// A clip playing: as launched, its number, and a clip played once its events as placed,
// in ticks from the grid's start, once its beat has come.
interface Playing<Track, Event extends PatternEvent> {
  clip: LaunchedClip<Track, Event>;
  launch: number;
  placed?: Event[] | undefined;
}

// the clips playing, one a track, in the order they were launched, a clip launched again in a track's place keeping it
export class ClipLauncher<Track, Event extends PatternEvent = PatternEvent> {
  readonly #grid: ClipGrid;
  readonly #play: PlayEvent<Track, Event>;
  readonly #told: ClipsTold<Track>;
  readonly #playing = new Map<Track, Playing<Track, Event>>(); // by its track
  #launches = 0; // the launches so far

  constructor({ grid, play, started, ended }: { grid: ClipGrid; play: PlayEvent<Track, Event> } & ClipsTold<Track>) {
    this.#grid = grid;
    this.#play = play;
    this.#told = { started, ended };
  }
  // a clip launched on its track, in place of what the track played; its launch's number, a fresh one
  launch(clip: LaunchedClip<Track, Event>): number {
    this.#launches += 1;
    this.#playing.set(clip.track, { clip, launch: this.#launches });
    return this.#launches;
  }
  stop(track: Track): void {
    this.#playing.delete(track);
  }
  // the 16th i, falling at a clock time: every clip's events due there handed on, each at its time
  step(i: number, t: Seconds): void {
    for (const playing of this.#playing.values()) {
      if (playing.clip.once) {
        this.#stepOnce(playing, i, t);
        continue;
      }
      for (const event of due(playing.clip.pattern, i, this.#grid.meter())) {
        this.#play(playing.clip.track, event, this.#timeOf(playing.clip, event, i, t), playing.launch);
      }
    }
  }
  // A clip played once, on the 16th i:
  //   1. waiting: placed on the beat i starts, if it starts one, its start told;
  //   2. its events whose place falls in i handed on;
  //   3. its last handed on: ended, told.
  #stepOnce(playing: Playing<Track, Event>, i: number, t: Seconds): void {
    const { clip, launch } = playing;
    playing.placed ??= this.#placedFrom(clip, launch, i);
    if (!playing.placed) {
      return;
    }
    const placed = playing.placed;
    const from = i * STEP;
    for (const event of placed.filter((each) => each.start >= from && each.start < from + STEP)) {
      const inStep = dueOn(event, i);
      this.#play(clip.track, inStep, this.#timeOf(clip, inStep, i, t), launch);
    }
    const last = placed.at(-1);
    if (!last || last.start < from + STEP) {
      this.#playing.delete(clip.track);
      this.#told.ended?.(clip.track, launch);
    }
  }
  // A clip played once, placed from the beat the 16th i starts, its start told; none
  // before a beat. Its events in time order, each in its place in the beat as kept.
  #placedFrom(clip: LaunchedClip<Track, Event>, launch: number, i: number): Event[] | undefined {
    const meter = this.#grid.meter();
    if ((i * STEP) % beatTicks(meter) !== 0) {
      return undefined;
    }
    const inOrder = { ...clip.pattern, events: [...clip.pattern.events].sort((one, other) => one.start - other.start) };
    const placed = whole(inOrder, i * STEP, meter);
    if (placed.length) {
      this.#told.started?.(clip.track, launch, this.#spanOf(clip, placed));
    }
    return placed;
  }
  // from a clip's first event's time to its last's end
  #spanOf(clip: LaunchedClip<Track, Event>, placed: Event[]): Span {
    const timeOf = (event: Event): Seconds => this.#placeTime(clip, event);
    const ends = placed.map((event) => timeOf(event) + this.#grid.secondsOf(event.duration ?? 0));
    return { from: timeOf(placed[0]!), until: Math.max(...ends) };
  }
  // when an event placed in ticks from the grid's start falls, as #timeOf() times it on its 16th
  #placeTime(clip: LaunchedClip<Track, Event>, event: Event): Seconds {
    const i = Math.floor(event.start / STEP);
    const inStep = dueOn(event, i);
    return this.#timeOf(clip, inStep, i, this.#grid.timeAt(i));
  }
  // when an event due on the 16th i falls: straight, the 16th's swing taken back, its offset on the straight grid; else on the swing, an
  // event off the 16th, a triplet say, where it falls in it
  #timeOf(clip: LaunchedClip<Track, Event>, event: Event, i: number, t: Seconds): Seconds {
    const grid = this.#grid;
    const offset = event.offset ?? 0;
    if (event.straight ?? clip.straight) {
      return t - grid.swingAt(i) + grid.secondsOf(offset);
    }
    return offset ? grid.timeAt(i + offset / STEP) : t;
  }
}

// an event as due on the 16th i: how many ticks into it it starts
function dueOn<Event extends PatternEvent>(event: Event, i: number): Event {
  return { ...event, offset: event.start - i * STEP };
}
