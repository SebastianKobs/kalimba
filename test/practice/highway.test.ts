import { noteShape } from '../../src/practice/highway';

describe('noteShape', () => {
  it('draws a note as long as it lasts, a beat 64 pixels, with a little gap before the next', () => {
    expect(noteShape(1)).toMatchObject({ length: 61, head: 34 });
    expect(noteShape(2)).toMatchObject({ length: 125, head: 34 }); // a held note: a long bar under its head
  });

  it('keeps a short note whole, its head its length, and labels it with its letter only', () => {
    expect(noteShape(0.5)).toEqual({ length: 29, head: 29, label: 'letter' });
    expect(noteShape(0.25)).toEqual({ length: 14, head: 14, label: 'letter' }); // a 16th: never thinner than this
  });

  it('labels a note with room for it with its letter and its number', () => {
    expect(noteShape(1).label).toBe('full');
  });
});
