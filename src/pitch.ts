const SEMITONES_FROM_C: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "F3" → 53. Naturals only: the kalimba is diatonic. */
export function parseNote(name: string): number {
  const match = /^([A-G])(-?\d)$/.exec(name);
  if (!match) throw new Error(`Not a natural note with octave: "${name}"`);
  const [, letter, octave] = match;
  return 12 * (Number(octave) + 1) + SEMITONES_FROM_C[letter];
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}
