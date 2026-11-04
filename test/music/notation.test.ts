import { parseSong, SongTextError, tempoOf, titleOf } from '../../src/music/notation';
import { KALIMBA_21, retune } from '../../src/layout';

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

  it('skips what it cannot read in a line of notes, and reports it', () => {
    const song = parseSong('C4\nD4 H4 E4');
    expect(song.notes.map((n) => n.midi)).toEqual([60, 62, 64]);
    expect(song.ignored).toEqual([{ line: 2, text: 'H4' }]);
  });

  it('skips a hold with nothing before it and a tempo out of range, keeping the default', () => {
    const song = parseSong('tempo: 5\n- C4');
    expect(song.beatsPerMinute).toBe(90);
    expect(notes('- C4')).toEqual([[0, 1, 60]]);
    expect(song.ignored.map((i) => i.line)).toEqual([1, 2]);
  });

  it('still fails when nothing in the text is a note', () => {
    expect(() => parseSong('// nothing\n')).toThrow(SongTextError);
    expect(() => parseSong('Hello world')).toThrow(/no notes/i);
  });

  describe('pasted kalimba tabs', () => {
    it('reads *, ° and º as octave-up marks, doubled for two octaves', () => {
      expect(notes('1* 1° 1º 1** C* E°°').map(([, , midi]) => midi)).toEqual([72, 72, 72, 84, 72, 88]);
    });

    it('reads dots above and below the note, combined or precomposed', () => {
      expect(notes('1\u0307 4\u0323 \u010A').map(([, , midi]) => midi)).toEqual([72, 53, 72]);
    });

    it('reads bare letters as octave 4, like the card', () => {
      expect(notes('C D E F G A B F# Bb').map(([, , midi]) => midi)).toEqual([60, 62, 64, 65, 67, 69, 71, 66, 70]);
    });

    it('reads chords in parentheses, spaced or run together', () => {
      expect(notes('(135) (C E G) (1°3°)')).toEqual([
        [0, 1, 60], [0, 1, 64], [0, 1, 67],
        [1, 1, 60], [1, 1, 64], [1, 1, 67],
        [2, 1, 72], [2, 1, 76],
      ]);
    });

    it('reads a - after a note as holding it a beat longer, also when the next note follows without a space', () => {
      expect(notes('1-3  5  2--4  6-')).toEqual([
        [0, 2, 60], [2, 1, 64],
        [3, 1, 67],
        [4, 3, 62], [7, 1, 65],
        [8, 2, 69],
      ]);
    });

    it('reads ( ) as notes played together, also after a held note', () => {
      expect(notes('1-(5-7)  (4-6)-2  (135)')).toEqual([
        [0, 2, 60], [2, 1, 67], [2, 1, 71],
        [3, 2, 65], [3, 2, 69], [5, 1, 62],
        [6, 1, 60], [6, 1, 64], [6, 1, 67],
      ]);
    });

    it('reads prime marks, and double primes or quotes as two octaves', () => {
      expect(notes('1′ 1′′ 1″ 1” 3"').map(([, , midi]) => midi)).toEqual([72, 84, 84, 84, 88]);
    });

    it('still reads a lone - as holding the note before', () => {
      expect(notes('1-3 - 5')).toEqual([[0, 2, 60], [2, 2, 64], [4, 1, 67]]);
    });

    it('reads a tab with section headings and a source line', () => {
      const song = parseSong('Verse:\n\n5-1  3  2′-5  1\n\nSource: Some Tabs - Example.net (https://example.net/t/)');
      expect(song.notes.map((n) => [n.beat, n.midi])).toEqual([[0, 67], [2, 60], [3, 64], [4, 74], [6, 67], [7, 60]]);
      expect(song.ignored.map((i) => i.line)).toEqual([1, 5]);
    });

    it('still reads a trailing . as dotted, not as an octave mark', () => {
      expect(notes('G. A_')).toEqual([[0, 1.5, 67], [1.5, 0.5, 69]]);
    });

    it('skips a • after a note, since plain text cannot say if it was above or below', () => {
      const song = parseSong('1• 2 3');
      expect(song.notes.map((n) => n.midi)).toEqual([62, 64]);
      expect(song.ignored).toEqual([{ line: 1, text: '1•', reason: expect.stringMatching(/above.*below/) }]);
    });

    it('skips whole lines that are mostly not notes, like the source line a copied page adds', () => {
      const song = parseSong(
        'Source: Sweden Kalimba Tabs Letter & Number Notes Tutorial - KalimbaTabs.net (https://www.kalimbatabs.net/x/)\nC D E',
      );
      expect(song.notes.map((n) => n.midi)).toEqual([60, 62, 64]);
      expect(song.ignored).toEqual([{ line: 1, text: expect.stringMatching(/^Source: Sweden/) }]);
    });

    it('skips a lyrics line whole, even when a word looks like a note', () => {
      expect(notes('A ma-zing grace\nVerse 1\nC')).toEqual([[0, 1, 60]]);
    });
  });
});

describe('numbers name tongues', () => {
  const raised = (...notes: string[]) => retune(KALIMBA_21, KALIMBA_21.map((t) => (notes.includes(t.note) ? 1 : 0)));
  const midis = (text: string, notes: string[]) => parseSong(text, { tongues: raised(...notes) }).notes.map((n) => n.midi);

  it('plays a number on its tongue as tuned: with 4′ raised, 4′ is F#5 and 4 stays F4', () => {
    expect(midis('4′ 4 (4′-1′)', ['F5'])).toEqual([78, 65, 78, 72]);
  });

  it('leaves letters and note names as pitches', () => {
    expect(midis('F′ F5', ['F5'])).toEqual([77, 77]);
  });

  it('lets a key line decide instead of the tongues, so the two never stack', () => {
    expect(midis('key: C\n4′', ['F5'])).toEqual([77]);
    expect(midis('key: G\n4′ 4', ['F5'])).toEqual([78, 66]);
  });

  it('lets a written accidental win', () => {
    expect(midis('b4′', ['F5'])).toEqual([76]);
  });
});

describe('key signatures', () => {
  const midis = (text: string) => parseSong(text).notes.map((n) => n.midi);

  it('raises F to F# throughout with key: G, as on a kalimba with its F tongue tuned up', () => {
    expect(midis('key: G\n4 F F4 4′ 1')).toEqual([66, 66, 66, 78, 60]);
    expect(midis('4 F')).toEqual([65, 65]);
  });

  it('knows sharp, flat and minor keys', () => {
    expect(midis('key: D\n1 4')).toEqual([61, 66]);
    expect(midis('key: F\n7 B')).toEqual([70, 70]);
    expect(midis('key: Em\n4')).toEqual([66]);
    expect(midis('key: E minor\n4')).toEqual([66]);
    expect(midis('key: Bb major\n3 7')).toEqual([63, 70]);
  });

  it('lets a written accidental win over the key', () => {
    expect(midis('key: G\nb4')).toEqual([64]);
  });

  it('skips a key it does not know, and lists it', () => {
    const song = parseSong('key: H\nC');
    expect(song.notes.map((n) => n.midi)).toEqual([60]);
    expect(song.ignored).toEqual([{ line: 1, text: 'key: H', reason: expect.stringMatching(/key/i) }]);
  });
});

describe('tempoOf', () => {
  it('finds the tempo header, if the text has a valid one', () => {
    expect(tempoOf('title: x\ntempo: 72\nC')).toBe(72);
    expect(tempoOf('C D E')).toBeUndefined();
    expect(tempoOf('tempo: 5\nC')).toBeUndefined();
  });
});

describe('titleOf', () => {
  it('finds the title header, if the text has one', () => {
    expect(titleOf('title: Mine\nC')).toBe('Mine');
    expect(titleOf('C D E')).toBeUndefined();
    expect(titleOf('title:   \nC')).toBeUndefined();
  });
});
