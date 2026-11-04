const SEMITONES_FROM_C: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ACCIDENTALS: Record<string, number> = { '': 0, '#': 1, b: -1 };

/** "F3" → 53, "F#4" → 66, "Bb3" → 58. */
export function parseNote(name: string): number {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!match) throw new Error(`Not a note with octave: "${name}"`);
  const [, letter, accidental, octave] = match;
  return 12 * (Number(octave) + 1) + SEMITONES_FROM_C[letter] + ACCIDENTALS[accidental];
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}
