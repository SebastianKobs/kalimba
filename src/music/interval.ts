// with their accusative article, as in "eine Quinte tiefer"
const INTERVAL_NAMES = [
  '', 'einen Halbton', 'einen Ganzton', 'eine kleine Terz', 'eine große Terz', 'eine Quarte', 'einen Tritonus',
  'eine Quinte', 'eine kleine Sexte', 'eine große Sexte', 'eine kleine Septime', 'eine große Septime',
];

function octaves(count: number): string {
  return count === 1 ? 'eine Oktave' : count === 2 ? 'zwei Oktaven' : `${count} Oktaven`;
}

function intervalName(semitones: number): string {
  const [whole, rest] = [Math.floor(semitones / 12), semitones % 12];
  if (whole === 0) return INTERVAL_NAMES[rest];
  return rest === 0 ? octaves(whole) : `${octaves(whole)} und ${INTERVAL_NAMES[rest]}`;
}

/** A transposition in a musician's words: -7 → "eine Quinte tiefer (7 Halbtöne)". */
export function describeShift(semitones: number): string {
  if (semitones === 0) return 'wie notiert';
  const size = Math.abs(semitones);
  const count = size === 1 ? '' : ` (${size} Halbtöne)`;
  return `${intervalName(size)} ${semitones < 0 ? 'tiefer' : 'höher'}${count}`;
}
