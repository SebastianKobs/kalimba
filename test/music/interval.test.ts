import { describeShift } from '../../src/music/interval';

describe('describeShift', () => {
  it.each([
    [0, 'wie notiert'],
    [-7, 'eine Quinte tiefer (7 Halbtöne)'],
    [5, 'eine Quarte höher (5 Halbtöne)'],
    [-2, 'einen Ganzton tiefer (2 Halbtöne)'],
    [1, 'einen Halbton höher'],
    [12, 'eine Oktave höher (12 Halbtöne)'],
    [19, 'eine Oktave und eine Quinte höher (19 Halbtöne)'],
    [-24, 'zwei Oktaven tiefer (24 Halbtöne)'],
  ])('names a shift of %i semitones: %s', (semitones, text) => {
    expect(describeShift(semitones)).toBe(text);
  });
});
