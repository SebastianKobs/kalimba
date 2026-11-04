import { expect, test } from '@playwright/test';

test('the Klang panel opens on its macros, and a slider moves the sound', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto('/');
  await page.click('[name="klang"]');
  await expect(page.locator('.klang')).toBeVisible();
  await page.locator('input[name="stimmung"]').fill('20');
  await expect(page.locator('output[name="stimmung-value"]')).toHaveText('+20 Cent');
  await page.dispatchEvent('.tongue[data-note="C4"]', 'pointerdown'); // played with the new Stimmung
  await page.screenshot({ path: 'test-results/klang-panel.png', fullPage: true });
  expect(errors).toEqual([]);
});
