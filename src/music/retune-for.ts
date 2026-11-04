import { retune, type Tongue } from '../layout';
import { arrange } from './arrange';
import type { Song } from './notation';

/** One letter's tongues retuned: from F to F#, say. */
export interface TuningChange {
  readonly letter: string;
  readonly to: string;
}

/** The kalimba retuned to play a song in its own key, instead of moving the song onto the tongues. */
export interface TuningOption {
  /** a half step up or down per tongue, as retune takes them */
  readonly halfSteps: readonly number[];
  /** octaves only: the song keeps its key */
  readonly transpose: number;
  /** notes with a tongue at their pitch */
  readonly exact: number;
  readonly changes: readonly TuningChange[];
}

// the song moved by octaves at most, as far as the arranger looks
const OCTAVES = [-48, -36, -24, -12, 0, 12, 24, 36, 48];

interface Candidate {
  readonly halfSteps: number[];
  readonly steps: readonly number[]; // per letter
  readonly transpose: number;
  readonly exact: number;
  readonly playable: number;
}

const pitchClass = (midi: number) => ((midi % 12) + 12) % 12;
const changed = (c: Candidate) => c.steps.filter((s) => s !== 0).length;
const lowered = (c: Candidate) => c.steps.filter((s) => s < 0).length;

/** Higher first: most notes exact, most playable, fewest letters retuned, the smallest shift, sharps before flats. */
function rank(c: Candidate): number[] {
  return [c.exact, c.playable, -changed(c), -Math.abs(c.transpose), -lowered(c)];
}

function better(a: Candidate, b: Candidate): boolean {
  const [ra, rb] = [rank(a), rank(b)];
  const i = ra.findIndex((v, k) => v !== rb[k]);
  return i >= 0 && ra[i]! > rb[i]!;
}

// every way to pick one choice from each list
function* combinations(choices: readonly (readonly number[])[], picked: number[] = []): Generator<number[]> {
  if (picked.length === choices.length) {
    yield picked;
    return;
  }
  for (const choice of choices[picked.length]!) yield* combinations(choices, [...picked, choice]);
}

function bestByOctave(song: Song, tongues: readonly Tongue[], halfSteps: number[], steps: readonly number[]): Candidate {
  let best: Candidate | undefined;
  for (const transpose of OCTAVES) {
    const arranged = arrange(song, tongues, { transpose });
    const candidate = { halfSteps, steps, transpose, exact: arranged.notes.filter((n) => n.fit === 'exact').length, playable: arranged.notes.length };
    if (!best || better(candidate, best)) best = candidate;
  }
  return best!;
}

/**
 * The tuning that plays the song in its own key: each letter's tongues raised a half step, lowered, or left, all of a letter alike,
 * as a key is the same in every octave. Only offered when it plays more of the song in its key than the tongues as they are.
 */
export function tuningFor(song: Song, tongues: readonly Tongue[]): TuningOption | undefined {
  const used = new Set(song.notes.map((n) => pitchClass(n.midi)));
  const letters = [...new Set(tongues.map((t) => t.letter))];
  const naturalOf = (letter: string) => {
    const tongue = tongues.find((t) => t.letter === letter)!;
    return pitchClass(tongue.midi - tongue.tuning);
  };
  // a letter is only worth moving onto a pitch the song plays
  const choices = letters.map((letter) => [0, 1, -1].filter((step) => step === 0 || used.has(pitchClass(naturalOf(letter) + step))));

  let best: Candidate | undefined;
  for (const steps of combinations(choices)) {
    const byLetter = new Map(letters.map((letter, i) => [letter, steps[i]!]));
    const halfSteps = tongues.map((t) => byLetter.get(t.letter)!);
    const candidate = bestByOctave(song, retune(tongues, halfSteps), halfSteps, steps);
    if (!best || better(candidate, best)) best = candidate;
  }
  const asTheyAre = bestByOctave(song, tongues, tongues.map((t) => t.tuning), []);
  if (!best || best.exact <= asTheyAre.exact) return undefined;

  const changes = letters
    .map((letter, i) => ({ letter, step: best!.steps[i]! }))
    .filter(({ step }) => step !== 0)
    .map(({ letter, step }) => ({ letter, to: `${letter}${step > 0 ? '#' : 'b'}` }))
    .sort((a, b) => a.letter.localeCompare(b.letter));
  return { halfSteps: best.halfSteps, transpose: best.transpose, exact: best.exact, changes };
}

const LETTER_CLASSES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Where a song comes home, as a pitch class: the root of its key line ("Em": E), else the lowest note sounding last. */
export function homeNoteOf(song: Song, keyName?: string): number | undefined {
  const named = /^([A-G])([#b]?)/.exec(keyName ?? '');
  if (named) return pitchClass(LETTER_CLASSES[named[1]!]! + (named[2] === '#' ? 1 : named[2] === 'b' ? -1 : 0));
  if (song.notes.length === 0) return undefined;
  const last = Math.max(...song.notes.map((n) => n.beat));
  return pitchClass(Math.min(...song.notes.filter((n) => n.beat === last).map((n) => n.midi)));
}
