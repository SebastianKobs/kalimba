import type { ClipNote } from '../../libs/sequencing/clip-player/index.ts';
import { beatTicks, type Meter } from '../../libs/sequencing/clock/index.ts';
import type { Pattern } from '../../libs/sequencing/sequencer/index.ts';
import type { ArrangedNote } from '../music/arrange';

/**
 * The song as a clip for the clip player, played once: each note at its beat in ticks (a beat the meter's unit), its tongue as its part,
 * so the kalimba plucks that tongue, whatever its pitch.
 */
export function songClip(notes: readonly ArrangedNote[], meter: Meter): Pattern<ClipNote> {
  const ticks = beatTicks(meter);
  const events = notes.map((note) => ({
    start: Math.round(note.beat * ticks),
    duration: Math.max(1, Math.round(note.beats * ticks)), // a tine rings on regardless: the length only closes the clip's span
    pitch: note.tongue.midi,
    part: note.tongue.index,
  }));
  return { meter, events };
}

/** Where the song lies on the clock's grid of 16ths: the 16th its start's beat falls on, and that beat in the song. */
export interface SongPlacement {
  readonly startStep: number;
  /** the whole beat the song's first note is in: a clip played once drops the beats before it */
  readonly startBeat: number;
  readonly stepsPerBeat: number;
}

export interface PlacementAsk {
  /** the grid's place now, in 16ths */
  readonly now: number;
  /** the first 16th not handed out yet: a clip can wait for it, not for one already scheduled */
  readonly handedOut: number;
  readonly leadInBeats: number;
  readonly stepsPerBeat: number;
  /** the song's first note's beat */
  readonly firstBeat: number;
}

/** The song started on the first beat line at least its lead-in from now, and none already scheduled. */
export function songPlacement({ now, handedOut, leadInBeats, stepsPerBeat, firstBeat }: PlacementAsk): SongPlacement {
  const earliest = Math.max(now + leadInBeats * stepsPerBeat, handedOut);
  return { startStep: Math.ceil(earliest / stepsPerBeat - 1e-9) * stepsPerBeat, startBeat: Math.floor(firstBeat), stepsPerBeat };
}

/** The 16th a beat of the song falls on, fractional between them. */
export function placeOf(placement: SongPlacement, beat: number): number {
  return placement.startStep + (beat - placement.startBeat) * placement.stepsPerBeat;
}

/** And back: the song's beat at a place on the grid; before its start, the lead-in, negative from its first beat. */
export function beatAt(placement: SongPlacement, place: number): number {
  return placement.startBeat + (place - placement.startStep) / placement.stepsPerBeat;
}
