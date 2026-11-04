import { expect, test } from '@playwright/test';

test('the page fits a phone: nothing scrolls sideways, not even the longest transposition', async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 900 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(420);
});

test('on a wide screen the song, mode and transposition share one row', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto('/');
  const tops = await page.locator('.field.song, .field.mode, .field.transpose').evaluateAll((fields) => fields.map((f) => f.getBoundingClientRect().top));
  expect(new Set(tops).size).toBe(1);
});
