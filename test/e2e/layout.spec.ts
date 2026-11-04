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

test.describe('the tab format’s help', () => {
  test('opens over the page, fits a phone and shuts with its button or Escape', async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 800 });
    await page.goto('/');
    const help = page.locator('dialog.format-help');
    await expect(help).toBeHidden();
    await page.click('[name="format-help"]');
    await expect(help).toBeVisible();
    const box = await help.evaluate((d) => ({ modal: d.matches(':modal'), ...d.getBoundingClientRect().toJSON() }));
    expect(box.modal).toBe(true); // over the page, the rest out of reach
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(420);
    expect(box.bottom).toBeLessThanOrEqual(800);
    await page.screenshot({ path: 'test-results/format-help.png' });
    await page.click('[name="format-help-close"]');
    await expect(help).toBeHidden();
    await page.click('[name="format-help"]');
    await page.keyboard.press('Escape');
    await expect(help).toBeHidden();
  });
});
