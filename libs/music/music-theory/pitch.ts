// ---------- libs/music/music-theory/pitch: notes and frequencies ----------
// A note is a MIDI note number. A key is { root, scale }, the root a note, the scale its steps in semitones from it (scales.ts)
import { degreeNote, type Key } from './scales.ts';
// a chord's note in a key: semitones from the root, or else a degree of the scale, counted from an octave below the root
export interface ChordNote {
  semi?: number;
  degree?: number;
}

export function mtof(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
export function chordNote(note: ChordNote, key: Key): number {
  return note.semi !== undefined ? key.root + note.semi : degreeNote(note.degree!, key);
}
