import { KALIMBA } from '../../src/sound/kalimba-card';
import { DEFAULT_KLANG, instrumentsWith, MACROS, parseStoredKlang, pitchOffset, presetFor, ringFactor, type KlangValues } from '../../src/sound/klang';

const values = (changes: Partial<KlangValues>): KlangValues => ({ ...DEFAULT_KLANG, ...changes });
const preset = (changes: Partial<KlangValues>) => presetFor(values(changes)).values as Record<string, number>;

describe('the Klang macros', () => {
  it('are seven, labelled in German', () => {
    expect(MACROS.map((m) => m.label)).toEqual(['Obertöne', 'Helligkeit', 'Anschlag', 'Körper', 'Schwebung', 'Stimmung', 'Nachklang']);
  });

  it('at their defaults, sound like the voice card as written', () => {
    expect(preset({})).toMatchObject({
      '2nd/level': 0.08, '3rd/level': 0.025, 'ping/level': 0.2, 'ting/level': 0.08,
      'knock/level': 0.08, 'twin/level': 0.12, 'twin/tune': 0.03, 'click/level': 0.25, 'click env/decay': 0.02,
    });
    expect(preset({})['tone/cutoff']).toBeCloseTo(3500, -1); // within 5 Hz
    expect(pitchOffset(DEFAULT_KLANG)).toBe(0);
    expect(ringFactor(DEFAULT_KLANG)).toBe(1);
  });

  it('Obertöne scales the harmonics and the ping modes together: 0 pure, 2 twice as metallic', () => {
    expect(preset({ obertoene: 0 })).toMatchObject({ '2nd/level': 0, '3rd/level': 0, 'ping/level': 0, 'ting/level': 0 });
    expect(preset({ obertoene: 2 })['ping/level']).toBeCloseTo(0.4, 6);
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
    expect(preset({ anschlag: 2 })['click/level']).toBeCloseTo(0.5, 6);
    expect(preset({ anschlag: 2 })['click env/decay']).toBeCloseTo(0.04, 6);
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
