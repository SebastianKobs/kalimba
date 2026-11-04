import { keyForTongue, tongueForKey } from '../src/keymap';
import { KALIMBA_21, retune } from '../src/layout';

describe('keymap', () => {
  it('plays pitches upward along the bottom row, then the home row', () => {
    expect(tongueForKey('KeyZ')?.note).toBe('F3');
    expect(tongueForKey('Slash')?.note).toBe('A4');
    expect(tongueForKey('KeyA')?.note).toBe('B4');
    expect(tongueForKey('Quote')?.note).toBe('E6');
  });

  it('gives every tongue its own key', () => {
    const keys = KALIMBA_21.map(keyForTongue);
    expect(new Set(keys).size).toBe(21);
    KALIMBA_21.forEach((t) => expect(tongueForKey(keys[t.index])).toBe(t));
  });

  it('ignores keys outside the map', () => {
    expect(tongueForKey('Space')).toBeUndefined();
  });

  it('keeps a retuned tongue on its key', () => {
    const tuned = retune(KALIMBA_21, KALIMBA_21.map((t) => (t.note === 'F3' ? 1 : 0)));
    const f3 = tongueForKey('KeyZ', tuned)!;
    expect(f3.note).toBe('F#3');
    expect(keyForTongue(f3)).toBe('KeyZ');
  });
});
