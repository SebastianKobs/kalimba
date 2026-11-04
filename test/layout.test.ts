import { KALIMBA_21, retune } from '../src/layout';

// read off kalimba.jpg, left to right
const CARD = [
  ['D6', 2, 2], ['B5', 7, 1], ['G5', 5, 1], ['E5', 3, 1], ['C5', 1, 1],
  ['A4', 6, 0], ['F4', 4, 0], ['D4', 2, 0], ['B3', 7, -1], ['G3', 5, -1],
  ['F3', 4, -1],
  ['A3', 6, -1], ['C4', 1, 0], ['E4', 3, 0], ['G4', 5, 0], ['B4', 7, 0],
  ['D5', 2, 1], ['F5', 4, 1], ['A5', 6, 1], ['C6', 1, 2], ['E6', 3, 2],
] as const;

describe('KALIMBA_21', () => {
  it('has the 21 tongues of the card, left to right, with cipher digit and octave dots', () => {
    expect(KALIMBA_21.map((t) => [t.note, t.cipher, t.octaveDots])).toEqual(CARD);
  });

  it('puts the lowest and longest tongue in the centre', () => {
    const centre = KALIMBA_21[10];
    expect(centre.note).toBe('F3');
    expect(Math.min(...KALIMBA_21.map((t) => t.frequency))).toBe(centre.frequency);
    expect(centre.lengthRatio).toBe(1);
  });

  it('alternates sides as pitch rises', () => {
    const byPitch = [...KALIMBA_21].sort((a, b) => a.midi - b.midi);
    const sides = byPitch.slice(1).map((t) => Math.sign(t.index - 10));
    expect(sides[0]).toBe(-1); // G3 is left of F3 on the card
    sides.slice(1).forEach((side, i) => expect(side).toBe(-sides[i]));
  });

  it('makes higher tongues shorter', () => {
    const byPitch = [...KALIMBA_21].sort((a, b) => a.midi - b.midi);
    for (let i = 1; i < byPitch.length; i++) {
      expect(byPitch[i].lengthRatio).toBeLessThan(byPitch[i - 1].lengthRatio);
    }
  });
});

describe('retune', () => {
  const offsets = (changes: Record<string, number>) => KALIMBA_21.map((t) => changes[t.note] ?? 0);

  it('raises tongues by a half step, like a C kalimba with its F tongues raised', () => {
    const tuned = retune(KALIMBA_21, offsets({ F3: 1, F4: 1, F5: 1 }));
    const f4 = tuned.find((t) => t.index === KALIMBA_21.findIndex((k) => k.note === 'F4'))!;
    expect(f4.note).toBe('F#4');
    expect(f4.midi).toBe(66);
    expect(f4.frequency).toBeCloseTo(369.99, 2);
    expect([f4.letter, f4.accidental, f4.cipher, f4.octaveDots, f4.tuning]).toEqual(['F', '#', 4, 0, 1]);
    expect(tuned.map((t) => t.note).filter((n) => n.includes('#'))).toEqual(['F#4', 'F#3', 'F#5']);
  });

  it('lowers tongues by a half step', () => {
    const b3 = retune(KALIMBA_21, offsets({ B3: -1 })).find((t) => t.letter === 'B' && t.octaveDots === -1)!;
    expect([b3.note, b3.midi, b3.accidental]).toEqual(['Bb3', 58, 'b']);
  });

  it('keeps each tongue in its place and length', () => {
    const tuned = retune(KALIMBA_21, offsets({ C4: 1, E6: -1 }));
    expect(tuned.map((t) => [t.index, t.lengthRatio])).toEqual(KALIMBA_21.map((t) => [t.index, t.lengthRatio]));
    expect(retune(KALIMBA_21, offsets({})).map((t) => t.note)).toEqual(KALIMBA_21.map((t) => t.note));
  });
});
