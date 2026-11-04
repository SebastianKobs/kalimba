import { parseStoredTuning } from '../src/stored-tuning';

describe('parseStoredTuning', () => {
  it('accepts a list of -1, 0 and 1, one per tongue', () => {
    expect(parseStoredTuning('[0,1,-1]', 3)).toEqual([0, 1, -1]);
  });

  it.each([
    [null],
    ['not json'],
    ['{"a":1}'],
    ['[0,1]'], // wrong length
    ['[0,2,0]'], // more than a half step
    ['[0,"1",0]'],
  ])('ignores %j', (raw) => {
    expect(parseStoredTuning(raw, 3)).toBeUndefined();
  });
});
