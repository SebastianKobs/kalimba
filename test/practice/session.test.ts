import { arrange } from '../../src/music/arrange';
import { parseSong } from '../../src/music/notation';
import { KALIMBA_21, type Tongue } from '../../src/layout';
import { PracticeSession } from '../../src/practice/session';

const tongue = (note: string) => KALIMBA_21.find((t) => t.note === note)!;
const session = (text: string, mode: 'listen' | 'play-along' | 'wait') =>
  new PracticeSession(arrange(parseSong(text), KALIMBA_21), mode, { leadInBeats: 2, hitWindowBeats: 0.25 });
const notes = (ts: readonly Tongue[]) => ts.map((t) => t.note);

describe('PracticeSession', () => {
  it('starts before the first note so it can be seen coming', () => {
    expect(session('C4', 'wait').beat).toBe(-2);
  });

  describe('listen', () => {
    it('hands out each note once, when its beat is reached', () => {
      const s = session('C4 E4 [G4 C5]', 'listen');
      expect(s.advance(2).map((n) => n.tongue.note)).toEqual(['C4']);
      expect(s.advance(0.5)).toEqual([]);
      expect(s.advance(0.5).map((n) => n.tongue.note)).toEqual(['E4']);
      expect(s.advance(5).map((n) => n.tongue.note)).toEqual(['G4', 'C5']);
      expect(s.finished).toBe(true);
    });

    it('ignores the player', () => {
      const s = session('C4', 'listen');
      expect(s.pluck(tongue('C4'))).toBe('ignored');
    });
  });

  describe('wait', () => {
    it('stops at each step until the player plucks it', () => {
      const s = session('C4 E4', 'wait');
      s.advance(10);
      expect(s.beat).toBe(0);
      expect(notes(s.targets())).toEqual(['C4']);
      expect(s.pluck(tongue('E4'))).toBe('miss');
      expect(s.beat).toBe(0);
      expect(s.pluck(tongue('C4'))).toBe('hit');
      s.advance(10);
      expect(s.beat).toBe(1);
      expect(notes(s.targets())).toEqual(['E4']);
    });

    it('needs every tongue of a chord, in any order', () => {
      const s = session('[C4 E4] G4', 'wait');
      s.advance(10);
      expect(notes(s.targets())).toEqual(['C4', 'E4']);
      expect(s.pluck(tongue('E4'))).toBe('hit');
      expect(notes(s.targets())).toEqual(['C4']);
      expect(s.pluck(tongue('C4'))).toBe('hit');
      expect(notes(s.targets())).toEqual(['G4']);
    });

    it('accepts a correct pluck before the clock reaches it', () => {
      const s = session('C4', 'wait');
      expect(s.pluck(tongue('C4'))).toBe('hit');
      expect(s.finished).toBe(true);
      expect(s.score).toEqual({ hits: 1, misses: 0, total: 1 });
    });
  });

  describe('play-along', () => {
    it('keeps time and counts a pluck within the hit window as a hit', () => {
      const s = session('C4 E4', 'play-along');
      s.advance(2.2);
      expect(s.pluck(tongue('C4'))).toBe('hit');
      expect(s.pluck(tongue('G4'))).toBe('miss');
      s.advance(10);
      expect(s.finished).toBe(true);
      expect(s.score).toEqual({ hits: 1, misses: 2, total: 2 });
    });

    it('shows the next notes as targets while they are coming', () => {
      const s = session('C4 E4', 'play-along');
      s.advance(1.5);
      expect(notes(s.targets())).toEqual(['C4']);
      s.advance(1);
      expect(notes(s.targets())).toEqual(['E4']);
    });
  });
});
