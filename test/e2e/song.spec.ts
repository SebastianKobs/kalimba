import { expect, test } from '@playwright/test';
import type { LiveSongAsk } from './render';
import { db } from './measure';

// A song played live, as autoplay plays it: each note sent ahead of its time, on the audio's clock (the song player, after stim-garden's
// clip player). Plucked at the audio's "now" instead, a note's voice is built after the audio has already rendered past its start: the
// tine still rings, but the 31 ms click is often over before it's heard.
test.beforeEach(async ({ page }) => {
  await page.goto('/test/e2e/render.html');
  await page.waitForFunction(() => typeof window.liveSong === 'function');
});

test('autoplay: every note clicks, on its time, while the page draws each frame', async ({ page }) => {
  const ask: LiveSongAsk = {
    notes: ['C5', 'E5', 'G5', 'C6', 'G5', 'E5', 'D5', 'F5', 'A5', 'B5', 'G5', 'C5'].map((note, beat) => ({ note, beat: beat / 2 })),
    bpm: 120,
    seconds: 6,
    busyMs: 8,
  };
  const { plucks, start, samples, sampleRate } = await page.evaluate((a) => window.liveSong(a), ask);
  expect(plucks).toHaveLength(ask.notes.length);
  const band = (k: number) => samples[k]! - (samples[k - 1]! + samples[k]! + samples[k + 1]!) / 3; // ~8 kHz up: the click
  const window6ms = Math.round(0.006 * sampleRate);
  const heard = plucks.map((t) => {
    // the loudest 6 ms of the click band from 5 ms before the note to 20 ms after
    const from = Math.round((t - start - 0.005) * sampleRate);
    let best = { level: -Infinity, at: 0 };
    for (let n = from; n < from + Math.round(0.025 * sampleRate); n += 12) {
      let energy = 0;
      for (let k = n; k < n + window6ms; k++) energy += band(k) ** 2;
      const level = db(Math.sqrt(energy / window6ms));
      if (level > best.level) best = { level, at: n / sampleRate + start - t };
    }
    return best;
  });
  heard.forEach(({ level, at }) => {
    expect(level).toBeGreaterThan(-32); // a click: about −21 dB; a missed one under −45
    expect(Math.abs(at)).toBeLessThan(0.006); // where it was asked for
  });
});
