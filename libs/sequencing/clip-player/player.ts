// ---------- clip-player/player: tracks of clip slots, a clip launched on its track ----------
// As Ableton's session view: tracks of clip slots, each slot holding a clip, a pattern of notes.
// Launched from its slot, a clip plays on its track, one a track:
//   - looping on the grid;
//   - or once, from the next beat, its first note to its last, on its track or on one its
//     owner lends it for that long, as it starts.
// Launched from a 16th to come (launch quantization), it waits for that 16th, what its track
// plays playing on till then.
// Its notes:
//   - pitches, transposed as the clip is launched;
//   - each with its part, its own per-note values and a held note's glides, as MIDI 2.0 has them;
//   - sent into the input as they come due, so they reach their instrument and the stream as
//     a played note does;
//   - each with its note on and its note off together, a fresh index each, the player one
//     source (note rotation).
// The looping, and when each note comes due, are the sequencer's clip launcher's.
import type { Ticks } from '../clock/index.ts';
import type { Seconds } from '../../base/util/index.ts';
import { ClipLauncher, type ClipGrid, type Pattern, type Span } from '../sequencer/index.ts';
import type { SentTo, Input, PatternNote } from '../midi-sequencer/index.ts';
import { NoteRotation, noteMessages, type PerNoteValues } from '../../midi/protocol/index.ts';

// A clip's note, as a pattern's, and what it plays with:
//   - pitch: its note number; a clip holds pitches, a step of a scale is the Scale device's;
//   - part: which part of its element sounds it, as the way back lights it;
//   - values: its per-note controllers as it starts;
//   - glides: a held note's, each [ticks after its start, the pitch it glides to].
export interface ClipNote extends PatternNote {
  step?: undefined;
  pitch: number;
  part?: number | undefined;
  values?: PerNoteValues | undefined;
  glides?: readonly (readonly [after: Ticks, pitch: number])[] | undefined;
}
// A clip: where its notes go, its pattern, and how it plays.
// transpose: semitones, added to each note's pitch as it's launched.
// straight: under the grid's swing, or on it.
// velocity: read as each note comes due, as a velocity device sets it; full if it has none,
// none leaving the note out.
// once: played once.
// lend(): a track lent to a clip played once, as it starts, from its first note's time to its
// last's end, handed its own address, its track the one it borrows from; else its own track.
export type Clip<Track extends string> = {
  to: SentTo<Track>;
  pattern: Pattern<ClipNote>;
  transpose?: number | undefined;
  straight?: boolean | undefined;
  velocity?: (() => number) | undefined;
} & (
  { once?: false | undefined; lend?: undefined } | { once: true; lend?(to: SentTo<Track>, span: Span): SentTo<Track> }
);
// A clip as it plays: its slot, and where its notes go, once a lent track is known.
interface Playing<Track extends string, Slot> {
  clip: Clip<Track>;
  slot: Slot;
  to?: SentTo<Track>;
}

// The clip slots, and the clips playing, one a track.
// Each 16th (step()): every playing clip's notes due there sent on, in the order the clips
// were launched.
// Each launch is a region of its own, its notes carrying its number.
// Slot: what its owner knows a slot by.
// A launch queued for a 16th: one a slot, a later one on its track in its place.
// A lent clip plays one a slot: launched again, it starts again on a track lent again.
export class ClipPlayer<Track extends string, Slot = unknown> {
  readonly #input: Input<Track>;
  readonly #grid: ClipGrid;
  readonly #rotation = new NoteRotation();
  readonly #launcher: ClipLauncher<Track | Slot, ClipNote>;
  readonly #slots = new Map<Slot, Clip<Track>>(); // in the order put
  readonly #playing = new Map<Track | Slot, Playing<Track, Slot>>(); // by its track, or its slot where lent
  readonly #sounding = new Map<Slot, Seconds>(); // a clip played once: when its last note ends, from its start
  readonly #queued = new Map<Slot, number>(); // the 16th it waits for, in the order asked
  #now: Seconds = -Infinity; // the last 16th's time
  #stepped = -Infinity; // the last 16th's number

  constructor({ input, grid }: { input: Input<Track>; grid: ClipGrid }) {
    this.#input = input;
    this.#grid = grid;
    this.#launcher = new ClipLauncher<Track | Slot, ClipNote>({
      grid,
      play: (track, note, at) => this.#send(track, note, at),
      started: (track, launch, span) => this.#started(track, launch, span),
      ended: (track) => this.#playing.delete(track),
    });
  }
  // a clip into its slot, in place of the one it held; on the track its notes go to, or borrow from
  put(slot: Slot, clip: Clip<Track>): void {
    this.#slots.set(slot, clip);
  }
  // a slot emptied: its clip gone, stopped where it plays
  remove(slot: Slot): void {
    this.#slots.delete(slot);
    this.#queued.delete(slot);
    this.#sounding.delete(slot);
    for (const [track, playing] of this.#playing) {
      if (playing.slot === slot) {
        this.#launcher.stop(track);
        this.#playing.delete(track);
      }
    }
  }
  // a track's slots, in the order they were first put
  slotsOn(track: Track): Slot[] {
    return [...this.#slots].filter(([, clip]) => clip.to.track === track).map(([slot]) => slot);
  }
  clipIn(slot: Slot): Clip<Track> | undefined {
    return this.#slots.get(slot);
  }
  // A slot's clip launched on its track, in place of what the track played.
  // Its notes carrying a fresh region, one while it loops.
  // An empty slot launches nothing.
  // from: a 16th not stepped yet:
  //   - the clip waits for it, launched as that 16th comes, before it plays;
  //   - what its track plays plays on till then.
  launch(slot: Slot, from?: number): void {
    const clip = this.#slots.get(slot);
    if (!clip) {
      return;
    }
    this.#unqueue(trackOf(slot, clip));
    if (from !== undefined && from > this.#stepped) {
      this.#queued.set(slot, from);
      return;
    }
    this.#launchNow(slot, clip);
  }
  stop(track: Track): void {
    this.#unqueue(track);
    const playing = this.#playing.get(track);
    if (playing) {
      this.#sounding.delete(playing.slot);
    }
    this.#launcher.stop(track);
    this.#playing.delete(track);
  }
  // Whether a slot's clip plays, as of the last 16th:
  //   - one played once: from its start until its last note ends, or as long as its track
  //     is lent, its ring-out among it;
  //   - a looping one: from its launch until it's stopped.
  // A clip queued for a 16th to come doesn't play yet.
  playing(slot: Slot): boolean {
    if ((this.#sounding.get(slot) ?? -Infinity) > this.#now) {
      return true;
    }
    return [...this.#playing.values()].some((playing) => playing.slot === slot && !playing.clip.once);
  }
  // Each queued launch whose 16th has come is launched first, then the 16th's notes sent.
  step(i: number, t: Seconds): void {
    this.#now = t;
    this.#stepped = i;
    this.#launchQueued(i);
    this.#launcher.step(i, t);
  }
  #launchQueued(i: number): void {
    for (const [slot, from] of this.#queued) {
      if (from > i) {
        continue;
      }
      this.#queued.delete(slot);
      this.#launchNow(slot, this.#slots.get(slot)!); // remove() lets a queued one go
    }
  }
  // a queued launch on a track let go
  #unqueue(track: Track | Slot): void {
    for (const slot of this.#queued.keys()) {
      if (trackOf(slot, this.#slots.get(slot)!) === track) {
        this.#queued.delete(slot);
      }
    }
  }
  #launchNow(slot: Slot, clip: Clip<Track>): void {
    const track = trackOf(slot, clip);
    const pattern = transposed(clip.pattern, clip.transpose ?? 0);
    const region = this.#launcher.launch({ track, pattern, straight: clip.straight, once: clip.once });
    const playing: Playing<Track, Slot> = { clip, slot };
    if (!clip.lend) {
      playing.to = inRegion(clip.to, region);
    }
    this.#playing.set(track, playing);
  }
  // A clip played once as it starts:
  //   - a lent one on the track its owner lends it for its span, its notes carrying its region;
  //   - sounding until its span's end, or as long as its track is lent, its ring-out among it.
  #started(track: Track | Slot, region: number, span: Span): void {
    const playing = this.#playing.get(track)!; // told only of a clip launched
    if (playing.clip.lend) {
      playing.to = inRegion(playing.clip.lend(playing.clip.to, span), region);
    }
    this.#sounding.set(playing.slot, Math.max(span.until, playing.to?.play?.until ?? -Infinity));
  }
  // a note due, at its time and velocity, its note on and its note off together; left out
  // where its velocity is none
  #send(track: Track | Slot, note: ClipNote, at: Seconds): void {
    const playing = this.#playing.get(track)!; // a note comes only of a clip launched
    const velocity = playing.clip.velocity?.() ?? 1;
    if (velocity <= 0) {
      return;
    }
    const index = this.#rotation.noteOn();
    this.#rotation.noteOff(index);
    const grid = this.#grid;
    const duration = grid.secondsOf(note.duration!); // its length on the straight grid
    const glides = note.glides?.map(([after, pitch]) => [at + grid.secondsOf(after), pitch] as const);
    const sent = { pitch: note.pitch, velocity, t: at, duration, part: note.part, controllers: note.values, glides };
    this.#input.send(playing.to!, noteMessages(sent, index)); // a lent track's lent as it started
  }
}

// where a slot's clip plays: its own slot where lent, else its track
function trackOf<Track extends string, Slot>(slot: Slot, clip: Clip<Track>): Track | Slot {
  return clip.lend ? slot : clip.to.track;
}
// an address, its notes carrying a launch's region
function inRegion<Track extends string>(to: SentTo<Track>, region: number): SentTo<Track> {
  return { ...to, play: { ...to.play, region } };
}
// a pattern's notes transposed by semitones; a held note's glides transposed with it
function transposed(pattern: Pattern<ClipNote>, transpose: number): Pattern<ClipNote> {
  const events = pattern.events.map((note) => ({
    ...note,
    pitch: note.pitch + transpose,
    ...(note.glides ? { glides: note.glides.map(([after, pitch]) => [after, pitch + transpose] as const) } : {}),
  }));
  return { ...pattern, events };
}
