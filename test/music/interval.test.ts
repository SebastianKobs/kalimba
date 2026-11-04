import { describeShift } from '../../src/music/interval';

describe('describeShift', () => {
  it.each([
    [0, 'as written'],
    [-7, 'down a fifth (7 semitones)'],
    [5, 'up a fourth (5 semitones)'],
    [-2, 'down a whole tone (2 semitones)'],
    [1, 'up a semitone'],
    [12, 'up an octave (12 semitones)'],
    [19, 'up an octave and a fifth (19 semitones)'],
    [-24, 'down two octaves (24 semitones)'],
  ])('names a shift of %i semitones: %s', (semitones, text) => {
    expect(describeShift(semitones)).toBe(text);
  });
});
