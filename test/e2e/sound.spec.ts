import { expect, test, type Page } from '@playwright/test';
import type { RenderAsk } from './render';
import { amplitudeAt, at, brightness, db, estimateFrequency, levelDb, spreadAroundFade } from './measure';

// the kalimba rendered offline in Firefox, through the same instruments the player plays
async function render(page: Page, ask: RenderAsk): Promise<number[]> {
  return page.evaluate((a) => window.renderKalimba(a), ask);
}
const pluck = (page: Page, note: string, seconds: number, extra: Partial<RenderAsk> = {}) =>
  render(page, { seconds, plucks: [{ note, t: 0 }], ...extra });

test.beforeEach(async ({ page }) => {
  await page.goto('/test/e2e/render.html');
  await page.waitForFunction(() => typeof window.renderKalimba === 'function');
});

test('a tine sounds at its note', async ({ page }) => {
  for (const [note, frequency] of [['F3', 174.61], ['C4', 261.63], ['E6', 1318.51]] as const) {
    const samples = await pluck(page, note, 1);
    expect(estimateFrequency(samples, frequency) / frequency, note).toBeCloseTo(1, 2);
  }
});

// the reference: a Thomann Sun Kalimba's sound demo, measured; its tines ring 2.3 to 4.8 s to −60 dB, G5 down to B3
test('it rings like a real tine: about 4 s to −60 dB at C4, still singing at 1.5 s, nearly gone at 4 s', async ({ page }) => {
  const samples = await pluck(page, 'C4', 4.5);
  expect(levelDb(samples, 1.5)).toBeGreaterThan(-25);
  expect(levelDb(samples, 4)).toBeLessThan(-50);
});

test('low tines ring longer than high ones', async ({ page }) => {
  const [low, high] = [await pluck(page, 'F3', 5), await pluck(page, 'E6', 5)];
  expect(fadeTime(low)).toBeGreaterThan(1.5 * fadeTime(high));
});

test('it starts with a click: bright energy in the first milliseconds', async ({ page }) => {
  const samples = await pluck(page, 'C4', 0.2);
  const ms = at(0.001);
  expect(brightness(samples, 0, 5 * ms)).toBeGreaterThan(5 * brightness(samples, 100 * ms, 105 * ms));
});

test('it shimmers: its level wobbles around the fade, from its twin a hair above', async ({ page }) => {
  expect(spreadAroundFade(await pluck(page, 'E6', 1.2), 0.1, 1)).toBeGreaterThan(0.4);
});

test('the tine alone is nearly a pure tone: a 2nd harmonic around −55 dB, the odd ones a tad, 3rd −62, 5th −68 dB', async ({ page }) => {
  const f = 261.63;
  // the tine alone: at 2f the octave tongue rings along too, which the halo's test measures
  const samples = await pluck(page, 'C4', 0.5, { klang: { resonanz: 0 } });
  const fundamental = amplitudeAt(samples, f, 0.2, 0.4);
  const [second, third, fifth] = [2, 3, 5].map((n) => db(amplitudeAt(samples, n * f, 0.2, 0.4) / fundamental));
  expect(second).toBeLessThan(-50); // the demo: −51 to −68 dB
  expect(second).toBeGreaterThan(-70);
  // odd harmonics a tad stronger than the demo's (−81 to −93 dB), by ear
  expect(third).toBeGreaterThan(-68);
  expect(third).toBeLessThan(-56);
  expect(fifth).toBeGreaterThan(-75);
  expect(fifth).toBeLessThan(-62);
});

test.describe('the dirt in the upper partials', () => {
  const f = 261.63;
  // the strongest bin near n·f, in 0.2 % steps: its level against the note and how far it's off, in Cent
  const partial = (samples: number[], n: number, from = 0.05, to = 0.25) => {
    let [best, at] = [0, 0];
    for (let g = 0.995 * n * f; g <= 1.012 * n * f; g += 0.002 * f) {
      const a = amplitudeAt(samples, g, from, to);
      if (a > best) [best, at] = [a, g];
    }
    return { level: db(best / amplitudeAt(samples, f, from, to)), cents: 1200 * Math.log2(at / (n * f)) };
  };
  // the noise band around the 8th partial, away from the 7th and 9th, per bin
  const grit = (samples: number[]) => {
    let sum = 0;
    for (let r = 7.3; r <= 8.7; r += 0.05) sum += amplitudeAt(samples, r * f, 0.05, 0.25) ** 2;
    return db(Math.sqrt(sum / 29) / amplitudeAt(samples, f, 0.05, 0.25));
  };

  test('the 7th and 9th harmonics ring a few Cent sharp, quieter as they go up', async ({ page }) => {
    const samples = await pluck(page, 'C4', 0.4, { klang: { resonanz: 0 } });
    const [seventh, ninth] = [partial(samples, 7), partial(samples, 9)];
    expect(seventh.cents).toBeCloseTo(13, -0.5); // within 1.6 Cent of the 0.2 % steps
    expect(ninth.cents).toBeCloseTo(19, -0.5);
    expect(seventh.level).toBeGreaterThan(-68);
    expect(seventh.level).toBeLessThan(-56);
    expect(ninth.level).toBeLessThan(seventh.level);
  });

  test('a bit of grit: a band of noise around the 8th partial', async ({ page }) => {
    const level = grit(await pluck(page, 'C4', 0.4, { klang: { resonanz: 0 } }));
    expect(level).toBeGreaterThan(-90);
    expect(level).toBeLessThan(-70);
  });

  test('Rauheit off: clean, the upper partials exactly harmonic, no grit', async ({ page }) => {
    const samples = await pluck(page, 'C4', 0.4, { klang: { resonanz: 0, rauheit: 0 } });
    expect(Math.abs(partial(samples, 7).cents)).toBeLessThan(1);
    expect(grit(samples)).toBeLessThan(-120);
  });

  test('the dirt sits in the attack: the upper partials fade much faster than the note', async ({ page }) => {
    const samples = await pluck(page, 'C4', 1.4, { klang: { resonanz: 0 } });
    const fall = (n: number) => partial(samples, n, 0.05, 0.25).level - partial(samples, n, 1.0, 1.2).level;
    // against the note, the 7th has fallen far further after a second
    expect(fall(7)).toBeGreaterThan(10);
  });
});

test('Ungerade Obertöne at 400 %: the 3rd and 5th harmonics 12 dB louder', async ({ page }) => {
  const f = 261.63;
  const odd = async (ungerade: number) => {
    const samples = await pluck(page, 'C4', 0.5, { klang: { resonanz: 0, ungerade } });
    return db(amplitudeAt(samples, 3 * f, 0.2, 0.4) / amplitudeAt(samples, f, 0.2, 0.4));
  };
  expect((await odd(4)) - (await odd(1))).toBeCloseTo(12, 0);
});

test('its metallic ping sits at 6.5× the note, 15 to 35 dB under it in the attack, as the demo’s', async ({ page }) => {
  const f = 261.63;
  const samples = await pluck(page, 'C4', 0.1);
  const ping = db(amplitudeAt(samples, 6.5 * f, 0.005, 0.05) / amplitudeAt(samples, f, 0.005, 0.05));
  expect(ping).toBeLessThan(-15);
  expect(ping).toBeGreaterThan(-35);
});

test('the box knocks briefly at 240 Hz', async ({ page }) => {
  // E6: no partial near 240 Hz, so what sounds there is the box
  const samples = await pluck(page, 'E6', 0.5);
  const [early, late] = [amplitudeAt(samples, 240, 0, 0.05), amplitudeAt(samples, 240, 0.3, 0.4)];
  expect(early).toBeGreaterThan(0.02);
  expect(late).toBeLessThan(early / 20);
});

test('a note’s end damps the tine within 50 ms, as a re-pluck does to the note before', async ({ page }) => {
  const messages = [
    { type: 'note on', index: 1, pitch: 60, velocity: 1, t: 0 },
    { type: 'per-note controller', index: 1, controller: 'decay time', value: 3.3, t: 0 },
    { type: 'note off', index: 1, t: 0.5 },
  ] as RenderAsk['messages'];
  const samples = await render(page, { seconds: 1, messages });
  const [before, after] = [
    db(amplitudeAt(samples, 261.63, 0.4, 0.5)),
    db(amplitudeAt(samples, 261.63, 0.55, 0.65)),
  ];
  expect(after - before).toBeLessThan(-40);
});

test('no two plucks click alike, and one render is the same every time', async ({ page }) => {
  const [a, b, again] = [
    await pluck(page, 'C4', 0.05, { seed: 1 }),
    await pluck(page, 'C4', 0.05, { seed: 2 }),
    await pluck(page, 'C4', 0.05, { seed: 1 }),
  ];
  expect(b).not.toEqual(a);
  expect(again).toEqual(a);
});

// how long until 40 dB down, in 50 ms steps
function fadeTime(samples: number[]): number {
  let t = 0.1;
  while (t < 4.8 && levelDb(samples, t) > -40) t += 0.05;
  return t;
}

test.describe('the Klang panel’s macros, as heard', () => {
  test('Schwebung off: the shimmer goes', async ({ page }) => {
    expect(spreadAroundFade(await pluck(page, 'E6', 1.2, { klang: { schwebung: 0 } }), 0.1, 1)).toBeLessThan(0.1);
  });

  test('Helligkeit down: the metallic ping goes dark against the note', async ({ page }) => {
    const f = 261.63;
    const ping = async (helligkeit: number) => {
      const samples = await pluck(page, 'C4', 0.1, { klang: { helligkeit } });
      return db(amplitudeAt(samples, 6.5 * f, 0.005, 0.05) / amplitudeAt(samples, f, 0.005, 0.05));
    };
    expect((await ping(1)) - (await ping(0))).toBeGreaterThan(10);
  });

  test('Stimmung +50 Cent: every note a quarter tone higher', async ({ page }) => {
    const samples = await pluck(page, 'C4', 1, { klang: { stimmung: 50 } });
    const expected = 261.63 * 2 ** (0.5 / 12);
    expect(estimateFrequency(samples, expected) / expected).toBeCloseTo(1, 2);
  });

  test('Nachklang ½: the tines ring half as long', async ({ page }) => {
    const [full, half] = [await pluck(page, 'C4', 5), await pluck(page, 'C4', 5, { klang: { nachklang: 0.5 } })];
    expect(fadeTime(half) / fadeTime(full)).toBeGreaterThan(0.4);
    expect(fadeTime(half) / fadeTime(full)).toBeLessThan(0.6);
  });

  test('Obertöne off: the metallic ping goes', async ({ page }) => {
    const ping = async (obertoene: number) =>
      amplitudeAt(await pluck(page, 'C4', 0.1, { klang: { obertoene } }), 6.5 * 261.63, 0.005, 0.05);
    expect(db((await ping(0)) / (await ping(1)))).toBeLessThan(-20);
  });

  test('Anschlag off: the thumb’s click goes', async ({ page }) => {
    const ms = at(0.001);
    const click = async (anschlag: number) => brightness(await pluck(page, 'C4', 0.05, { klang: { anschlag } }), 0, 5 * ms);
    expect(await click(0)).toBeLessThan((await click(1)) / 3);
  });

  test('Körper off: the box knock goes', async ({ page }) => {
    expect(amplitudeAt(await pluck(page, 'E6', 0.5, { klang: { koerper: 0 } }), 240, 0, 0.05)).toBeLessThan(0.002);
  });
});

test.describe('the other tongues ringing along', () => {
  // a tongue's ring after a pluck, against the plucked note's
  const ringingAlong = (samples: number[], frequency: number, plucked = 261.63) =>
    db(amplitudeAt(samples, frequency, 0.2, 0.5) / amplitudeAt(samples, plucked, 0.2, 0.5));
  const [A3, E4, C5, C6, E6] = [220, 329.63, 523.25, 1046.5, 1318.51];

  // at Resonanz 93 %, as it sounds right by ear (the demo's mix let its octave tongue ring at most −51 dB); a lower
  // tongue rings longer, so narrower, and a knock moves it less
  test('a pluck sets its neighbours on the bridge ringing along, 30 to 45 dB under the note', async ({ page }) => {
    const samples = await pluck(page, 'C4', 0.6);
    for (const frequency of [A3, E4]) {
      expect(ringingAlong(samples, frequency)).toBeGreaterThan(-45);
      expect(ringingAlong(samples, frequency)).toBeLessThan(-30);
    }
  });

  test('every tongue has its own halo: C4 rings its neighbours along, E6 at the edge its own', async ({ page }) => {
    const fromC4 = await pluck(page, 'C4', 0.6, { klang: { resonanz: 1 } });
    expect(ringingAlong(fromC4, E4) - ringingAlong(fromC4, C6)).toBeGreaterThan(15);
    const fromE6 = await pluck(page, 'E6', 0.6, { klang: { resonanz: 1 } });
    expect(ringingAlong(fromE6, C6, E6) - ringingAlong(fromE6, E4, E6)).toBeGreaterThan(15);
  });

  test('the octave rings along, though it sits far away on the bridge', async ({ page }) => {
    const samples = await pluck(page, 'C4', 0.6, { klang: { resonanz: 1 } });
    // D5 sits nearer to C4 than C5 does, but isn't a partial of it
    expect(ringingAlong(samples, C5) - ringingAlong(samples, 587.33)).toBeGreaterThan(6);
  });

  test('Resonanz 200 %: the neighbours ring 6 dB louder than at 100 %', async ({ page }) => {
    const [normal, double] = [await pluck(page, 'C4', 0.6), await pluck(page, 'C4', 0.6, { klang: { resonanz: 2 } })];
    expect(ringingAlong(double, E4) - ringingAlong(normal, E4)).toBeCloseTo(6, 0);
  });

  test('the halo moves with Stimmung: +20 Cent, the tongues ring along 20 Cent higher', async ({ page }) => {
    // E4 plucked, its neighbour G4's ring found in 0.05 Hz steps over a long window
    const samples = await pluck(page, 'E4', 1.4, { klang: { resonanz: 1, stimmung: 20 } });
    let [best, at] = [0, 0];
    for (let f = 386; f <= 398; f += 0.05) {
      const a = amplitudeAt(samples, f, 0.4, 1.4);
      if (a > best) [best, at] = [a, f];
    }
    expect(1200 * Math.log2(at / 392)).toBeCloseTo(20, -0.3); // within 1 Cent
  });

  test('Resonanz off: no other tongue rings along', async ({ page }) => {
    expect(ringingAlong(await pluck(page, 'C4', 0.6, { klang: { resonanz: 0 } }), E4)).toBeLessThan(-80);
  });

  test('a retuned tongue rings along at its new pitch: with F4 raised, F#4 rings, F4 not', async ({ page }) => {
    const tuning = ['D6', 'B5', 'G5', 'E5', 'C5', 'A4', 'F4'].map((note) => (note === 'F4' ? 1 : 0)).concat(Array(14).fill(0));
    // D4 plucked: F4's neighbour on the bridge
    const samples = await pluck(page, 'D4', 0.6, { tuning, klang: { resonanz: 1 } });
    expect(ringingAlong(samples, 369.99, 293.66) - ringingAlong(samples, 349.23, 293.66)).toBeGreaterThan(15);
  });
});

test('the metronome clicks short, the first beat of a bar higher and louder', async ({ page }) => {
  const samples = await render(page, { seconds: 1, clicks: [{ accent: true, t: 0 }, { accent: false, t: 0.5 }] });
  const peak = (from: number, to: number) => Math.max(...samples.slice(at(from), at(to)).map(Math.abs));
  expect(peak(0, 0.1)).toBeGreaterThan(1.5 * peak(0.5, 0.6));
  expect(peak(0.15, 0.45)).toBeLessThan(peak(0, 0.1) / 100);
});
