import { parseSong, SongTextError } from '../../src/music/notation';

const notes = (text: string) => parseSong(text).notes.map((n) => [n.beat, n.beats, n.midi]);

describe('parseSong', () => {
  it('reads note names, one beat each by default', () => {
    expect(notes('C4 D4 F#4 Bb3')).toEqual([[0, 1, 60], [1, 1, 62], [2, 1, 66], [3, 1, 58]]);
  });

  it('reads kalimba cipher digits like the card: 1 = C4, \' per octave up, , per octave down', () => {
    expect(notes("1 5 1' 4, 6''")).toEqual([[0, 1, 60], [1, 1, 67], [2, 1, 72], [3, 1, 53], [4, 1, 93]]);
    expect(notes('#4 b7')).toEqual([[0, 1, 66], [1, 1, 70]]);
  });

  it('reads durations: _ halves, . adds half, - holds one more beat, 0 rests', () => {
    expect(notes('C4_ D4_ E4. F4__ 0 G4 - -')).toEqual([
      [0, 0.5, 60], [0.5, 0.5, 62], [1, 1.5, 64], [2.5, 0.25, 65], [3.75, 3, 67],
    ]);
  });

  it('reads chords in brackets as notes sharing one onset', () => {
    expect(notes('[1 3 5]_ 1\'')).toEqual([[0, 0.5, 60], [0, 0.5, 64], [0, 0.5, 67], [0.5, 1, 72]]);
  });

  it('ignores bar lines, line breaks and // comments', () => {
    expect(notes('C4 | D4 // the rest is a comment C4\n|| E4')).toEqual([[0, 1, 60], [1, 1, 62], [2, 1, 64]]);
  });

  it('reads the title and tempo headers, defaulting tempo to 90', () => {
    const song = parseSong('title: Test tune\ntempo: 120\nC4 D4');
    expect(song.title).toBe('Test tune');
    expect(song.beatsPerMinute).toBe(120);
    expect(song.lengthBeats).toBe(2);
    expect(parseSong('C4').beatsPerMinute).toBe(90);
  });

  it('rejects an unknown token, naming it and its line', () => {
    expect(() => parseSong('C4\nD4 H4')).toThrow(SongTextError);
    expect(() => parseSong('C4\nD4 H4')).toThrow(/line 2.*"H4"/i);
  });

  it('rejects a hold with nothing before it, an empty song, and a tempo out of range', () => {
    expect(() => parseSong('- C4')).toThrow(/hold/i);
    expect(() => parseSong('// nothing\n')).toThrow(/no notes/i);
    expect(() => parseSong('tempo: 5\nC4')).toThrow(/tempo/i);
  });
});
