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

test('it’s nearly a pure tone after the attack, as a real tine: a 2nd harmonic around −55 dB, the 3rd far below', async ({ page }) => {
  const f = 261.63;
  const samples = await pluck(page, 'C4', 0.5);
  const fundamental = amplitudeAt(samples, f, 0.2, 0.4);
  const [second, third] = [2, 3].map((n) => db(amplitudeAt(samples, n * f, 0.2, 0.4) / fundamental));
  expect(second).toBeLessThan(-50); // the demo: −51 to −68 dB, the 3rd −81 to −93 dB
  expect(second).toBeGreaterThan(-70);
  expect(third).toBeLessThan(second!);
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

test('the metronome clicks short, the first beat of a bar higher and louder', async ({ page }) => {
  const samples = await render(page, { seconds: 1, clicks: [{ accent: true, t: 0 }, { accent: false, t: 0.5 }] });
  const peak = (from: number, to: number) => Math.max(...samples.slice(at(from), at(to)).map(Math.abs));
  expect(peak(0, 0.1)).toBeGreaterThan(1.5 * peak(0.5, 0.6));
  expect(peak(0.15, 0.45)).toBeLessThan(peak(0, 0.1) / 100);
});
