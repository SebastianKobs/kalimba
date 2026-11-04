// ---------- libs/music/music-theory/scales: scales, and a degree's note in a key ----------
// A scale is its steps in semitones from its root, in one octave; a key is { root, scale }, the root a MIDI note. A degree counts
// the scale's steps from an octave below the root, so degree 0 is the root an octave down, one scale's length on is the root itself, and
// a negative degree goes on down
import { modulo } from '../../base/util/index.ts';

// a key: its root a MIDI note, its scale its steps in semitones from it
export interface Key {
  root: number;
  scale: number[];
}

// the standard scales, each its steps in semitones from its root, in one octave; major is Ionian, minor Aeolian
export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  minor: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  melodicMinor: [0, 2, 3, 5, 7, 9, 11],
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  wholeTone: [0, 2, 4, 6, 8, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
} satisfies Record<string, number[]>;

export function degreeNote(degree: number, { root, scale }: Key): number {
  const steps = scale.length;
  const octave = Math.floor(degree / steps);
  const i = modulo(degree, steps);
  const step = scale[i];
  if (step === undefined) {
    throw new Error('a scale with no steps');
  }
  return root - 12 + 12 * octave + step;
}
