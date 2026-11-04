/** Letter → semitones every unmarked note of that letter is moved by, e.g. G major: F → +1. */
export type KeySignature = ReadonlyMap<string, number>;

const SHARP_ORDER = 'FCGDAEB';
const FLAT_ORDER = 'BEADGCF';
// index = number of sharps / flats
const MAJOR_SHARPS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
const MAJOR_FLATS = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
const MINOR_SHARPS = ['A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'];
const MINOR_FLATS = ['A', 'D', 'G', 'C', 'F', 'Bb', 'Eb', 'Ab'];
const KEY_NAME = /^([A-G])([#b♯♭]?)\s*(m|min|minor|maj|major)?$/i;

function signature(letters: string, shift: number): KeySignature {
  return new Map([...letters].map((letter) => [letter, shift]));
}

/** "G", "Bb major", "Em", "E minor" → its key signature; undefined for anything else. */
export function keySignature(name: string): KeySignature | undefined {
  const match = KEY_NAME.exec(name.trim());
  if (!match) return undefined;
  const [, letter, accidental, mode] = match;
  const tonic = letter + accidental.replace('♯', '#').replace('♭', 'b');
  const minor = mode !== undefined && /^m(in|inor)?$/i.test(mode) && mode !== 'M';
  const [sharpKeys, flatKeys] = minor ? [MINOR_SHARPS, MINOR_FLATS] : [MAJOR_SHARPS, MAJOR_FLATS];
  const sharps = sharpKeys.indexOf(tonic);
  if (sharps >= 0) return signature(SHARP_ORDER.slice(0, sharps), 1);
  const flats = flatKeys.indexOf(tonic);
  if (flats >= 0) return signature(FLAT_ORDER.slice(0, flats), -1);
  return undefined;
}

export const NO_KEY_SIGNATURE: KeySignature = new Map();
