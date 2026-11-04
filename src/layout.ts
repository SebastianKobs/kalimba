import { midiToFrequency, parseNote } from './pitch';

export interface Tongue {
  /** position from the left, 0-based */
  readonly index: number;
  readonly note: string;
  readonly letter: string;
  readonly midi: number;
  readonly frequency: number;
  /** cipher (jianpu) digit: 1 = C … 7 = B */
  readonly cipher: number;
  /** dots on the tongue: positive above the digit, negative below; octave 4 has none */
  readonly octaveDots: number;
  /** length relative to the longest tongue */
  readonly lengthRatio: number;
}

// read off kalimba.jpg, left to right; lowest tongue in the centre
const NOTES_LEFT_TO_RIGHT = [
  'D6', 'B5', 'G5', 'E5', 'C5', 'A4', 'F4', 'D4', 'B3', 'G3',
  'F3',
  'A3', 'C4', 'E4', 'G4', 'B4', 'D5', 'F5', 'A5', 'C6', 'E6',
];

const CIPHER_DIGITS = 'CDEFGAB';

function buildTongues(notes: string[]): Tongue[] {
  const lowest = Math.min(...notes.map((n) => midiToFrequency(parseNote(n))));
  return notes.map((note, index) => {
    const midi = parseNote(note);
    const frequency = midiToFrequency(midi);
    const letter = note[0];
    return {
      index,
      note,
      letter,
      midi,
      frequency,
      cipher: CIPHER_DIGITS.indexOf(letter) + 1,
      octaveDots: Number(note.slice(1)) - 4,
      // cantilever tine: f ∝ 1/L², so L ∝ 1/√f
      lengthRatio: Math.sqrt(lowest / frequency),
    };
  });
}

export const KALIMBA_21: readonly Tongue[] = buildTongues(NOTES_LEFT_TO_RIGHT);
