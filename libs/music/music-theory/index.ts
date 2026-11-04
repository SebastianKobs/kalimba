// ---------- music-theory: notes, frequencies, scales and keys; a play style ----------
// Its parts:
//   - pitch.ts: a note's frequency and a chord's note in a key;
//   - scales.ts: scales, a key, and a degree's note in it;
//   - style.ts: a play style, its contours and its rhythms, and the style as it plays;
//   - walk.ts: a contour walked, a step at a time.
export { mtof, chordNote, type ChordNote } from './pitch.ts';
export { SCALES, degreeNote, type Key } from './scales.ts';
export { PlayingStyle, type PlayStyle } from './style.ts';
export { walkOn, type Walk } from './walk.ts';
