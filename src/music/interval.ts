const INTERVAL_NAMES = [
  '', 'a semitone', 'a whole tone', 'a minor third', 'a major third', 'a fourth', 'a tritone',
  'a fifth', 'a minor sixth', 'a major sixth', 'a minor seventh', 'a major seventh',
];

function octaves(count: number): string {
  return count === 1 ? 'an octave' : count === 2 ? 'two octaves' : `${count} octaves`;
}

function intervalName(semitones: number): string {
  const [whole, rest] = [Math.floor(semitones / 12), semitones % 12];
  if (whole === 0) return INTERVAL_NAMES[rest];
  return rest === 0 ? octaves(whole) : `${octaves(whole)} and ${INTERVAL_NAMES[rest].replace(/^an? /, 'a ')}`;
}

/** A transposition in a musician's words: -7 → "down a fifth (7 semitones)". */
export function describeShift(semitones: number): string {
  if (semitones === 0) return 'as written';
  const size = Math.abs(semitones);
  const count = size === 1 ? '' : ` (${size} semitones)`;
  return `${semitones < 0 ? 'down' : 'up'} ${intervalName(size)}${count}`;
}
