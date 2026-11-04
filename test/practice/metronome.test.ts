import { clicksBetween } from '../../src/practice/metronome';

describe('clicksBetween', () => {
  it('gives every beat the clock passes, from where it was up to where it is now', () => {
    expect(clicksBetween(-4, -2.5, 4)).toEqual([{ beat: -4, accent: true }, { beat: -3, accent: false }]);
  });

  it('accents the first beat of each bar', () => {
    expect(clicksBetween(0.5, 4.2, 3).map((c) => [c.beat, c.accent])).toEqual([[1, false], [2, false], [3, true], [4, false]]);
  });

  it('gives nothing while the clock stands still', () => {
    expect(clicksBetween(2, 2, 4)).toEqual([]);
  });
});
