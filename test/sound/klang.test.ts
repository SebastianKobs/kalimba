import { KALIMBA } from '../../src/sound/kalimba-card';
import { DEFAULT_KLANG, hallGain, instrumentsWith, KLANG_STORAGE_KEY, MACROS, parseStoredKlang, pitchOffset, presetFor, resonanceGain, ringFactor, type KlangValues } from '../../src/sound/klang';

const values = (changes: Partial<KlangValues>): KlangValues => ({ ...DEFAULT_KLANG, ...changes });
const preset = (changes: Partial<KlangValues>) => presetFor(values(changes)).values as Record<string, number>;

describe('the Klang macros', () => {
  it('are eleven, labelled in German', () => {
    expect(MACROS.map((m) => m.label)).toEqual([
      'Obertöne', 'Ungerade Obertöne', 'Rauheit', 'Helligkeit', 'Anschlag', 'Körper', 'Schwebung', 'Resonanz', 'Hall',
      'Stimmung', 'Nachklang',
    ]);
  });

  it('at their defaults, sound like the voice card as written', () => {
    expect(preset({})).toMatchObject({
      // the user's ear at 100 %: Obertöne as 163 %, Anschlag 154 %, Rauheit 162 % of before
      '2nd/level': 0.00163, '3rd/level': 0.00082, '5th/level': 0.00041, '7th/level': 0.00049, '9th/level': 0.00033,
      'ping/level': 0.13, 'ting/level': 0.0098, 'grit/level': 0.0148, '7th/tune': 0.13, '9th/tune': 0.19,
      'knock/level': 0.08, 'twin/level': 0.12, 'twin/tune': 0.03, 'click/level': 0.385, 'click env/decay': 0.031,
    });
    expect(preset({})['tone/cutoff']).toBeCloseTo(3500, -1); // within 5 Hz
    expect(pitchOffset(DEFAULT_KLANG)).toBe(0);
    expect(ringFactor(DEFAULT_KLANG)).toBe(1);
  });

  it('Obertöne scales the harmonics and the ping modes together: 0 pure, 2 twice as metallic', () => {
    expect(preset({ obertoene: 0 })).toMatchObject({ '2nd/level': 0, '3rd/level': 0, 'ping/level': 0, 'ting/level': 0 });
    expect(preset({ obertoene: 2 })['ping/level']).toBeCloseTo(0.26, 6);
  });

  it('Ungerade Obertöne scales the 3rd and 5th harmonics: 0 none, 4 twelve dB more; Obertöne scales them too', () => {
    expect(preset({ ungerade: 0 })).toMatchObject({ '3rd/level': 0, '5th/level': 0, '7th/level': 0, '9th/level': 0, '2nd/level': 0.00163 });
    expect(preset({ ungerade: 4 })['5th/level']).toBeCloseTo(0.00164, 6);
    expect(preset({ obertoene: 2, ungerade: 2 })['3rd/level']).toBeCloseTo(0.00328, 6);
  });

  it('Rauheit scales the grit and how sharp the upper partials are: 0 clean and exactly harmonic', () => {
    expect(preset({ rauheit: 0 })).toMatchObject({ 'grit/level': 0, '7th/tune': 0, '9th/tune': 0 });
    expect(preset({})).toMatchObject({ '7th/tune': 0.13, '9th/tune': 0.19 });
    expect(preset({ rauheit: 2 })['grit/level']).toBeCloseTo(2 * preset({})['grit/level']!, 9);
  });

  it('starts every macro at 100 %, Helligkeit at 3500 Hz, Schwebung at 50 %, Stimmung at 0', () => {
    expect(DEFAULT_KLANG).toMatchObject({ obertoene: 1, ungerade: 1, rauheit: 1, anschlag: 1, koerper: 1, resonanz: 1, nachklang: 1 });
  });

  it('Helligkeit closes a lowpass from 20 kHz down to 300 Hz, evenly by octaves', () => {
    expect(preset({ helligkeit: 0 })['tone/cutoff']).toBeCloseTo(300, 6);
    expect(preset({ helligkeit: 0.5 })['tone/cutoff']).toBeCloseTo(Math.sqrt(300 * 20000), 3);
  });

  it('Helligkeit starts at 3500 Hz, shown so', () => {
    const helligkeit = MACROS.find((m) => m.name === 'helligkeit')!;
    expect(helligkeit.format(DEFAULT_KLANG.helligkeit)).toBe('3500 Hz');
  });

  it('Anschlag scales the thumb’s click, louder and a little longer: 0 none, 2 twice', () => {
    expect(preset({ anschlag: 0 })['click/level']).toBe(0);
    expect(preset({ anschlag: 2 })['click/level']).toBeCloseTo(0.77, 6);
    expect(preset({ anschlag: 2 })['click env/decay']).toBeCloseTo(0.062, 6);
  });

  it('Körper scales the box knock', () => {
    expect(preset({ koerper: 0 })['knock/level']).toBe(0);
    expect(preset({ koerper: 2 })['knock/level']).toBeCloseTo(0.16, 6);
  });

  it('Schwebung moves the twin: off at 0, as written at ½, twice as fast and deep at 1', () => {
    expect(preset({ schwebung: 0 })).toMatchObject({ 'twin/level': 0, 'twin/tune': 0 });
    expect(preset({ schwebung: 1 })['twin/tune']).toBeCloseTo(0.06, 6);
    expect(preset({ schwebung: 1 })['twin/level']).toBeCloseTo(0.24, 6);
  });

  it('Resonanz scales how loud the other tongues ring along, as the other sliders do: none at 0, twice at 200 %', () => {
    expect(resonanceGain(values({ resonanz: 0 }))).toBe(0);
    expect(resonanceGain(values({ resonanz: 2 })) / resonanceGain(DEFAULT_KLANG)).toBeCloseTo(2, 9);
    // 100 % is the halo that sounded right by ear: 93 % of the slider before, on its 30 dB curve to 100
    expect(resonanceGain(DEFAULT_KLANG)).toBeCloseTo(100 * 10 ** ((-0.07 * 30) / 20), 6);
  });

  it('Hall sends the kalimba into a small room: none at 0, twice at 200 %', () => {
    expect(hallGain(values({ hall: 0 }))).toBe(0);
    expect(hallGain(values({ hall: 2 })) / hallGain(DEFAULT_KLANG)).toBeCloseTo(2, 9);
    expect(DEFAULT_KLANG.hall).toBe(1);
    expect(hallGain(DEFAULT_KLANG)).toBeCloseTo(0.15, 9); // 100 %: half the first room's send, by ear
  });

  it('Stimmung moves every note in cents; Nachklang scales how long they ring', () => {
    expect(pitchOffset(values({ stimmung: 50 }))).toBe(0.5);
    expect(ringFactor(values({ nachklang: 0.5 }))).toBe(0.5);
  });
});

describe('instrumentsWith', () => {
  it('puts the macros into the kalimba’s patch and leaves the click as it is', () => {
    const instruments = instrumentsWith(values({ koerper: 0 }));
    expect(instruments.patches.kalimba).toEqual(presetFor(values({ koerper: 0 })));
    expect(instruments.patches.click).toBe(KALIMBA.patches.click);
  });
});

describe('the stored macros', () => {
  it('live under a key of their own, new since the scales changed: what was stored before is let go', () => {
    expect(KLANG_STORAGE_KEY).toBe('kalimba.klang.2');
  });
});

describe('parseStoredKlang', () => {
  it('reads stored values, each within its range', () => {
    expect(parseStoredKlang(JSON.stringify({ helligkeit: 0.4, stimmung: -20 }))).toEqual(values({ helligkeit: 0.4, stimmung: -20 }));
  });

  it('puts back the default for a value out of range or not a number, and for anything unreadable', () => {
    expect(parseStoredKlang(JSON.stringify({ helligkeit: 3, stimmung: 'x', other: 1 }))).toEqual(DEFAULT_KLANG);
    expect(parseStoredKlang('not json')).toEqual(DEFAULT_KLANG);
    expect(parseStoredKlang(null)).toEqual(DEFAULT_KLANG);
  });
});
