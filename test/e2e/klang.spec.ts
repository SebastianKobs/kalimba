import { expect, test, type Page } from '@playwright/test';

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

// the bonnet's own transitions: what is moving while it lifts or shuts
const lifting = (page: Page) =>
  page.locator('.klang-bay').evaluate((bay) =>
    bay.getAnimations({ subtree: true }).flatMap((a) => ('transitionProperty' in a ? [(a as CSSTransition).transitionProperty] : [])),
  );

test.describe('the Klang bonnet', () => {
  test('shut, the kalimba is whole: its latch on the belly, inside the body, and no sliders', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.klang')).toBeHidden();
    const latch = await page.locator('.kalimba').evaluate((kalimba) => {
      const box = document.querySelector('[name="klang"]')!.getBoundingClientRect();
      const body = kalimba.getBoundingClientRect();
      return { inside: box.left > body.left && box.right < body.right && box.top > body.top && box.bottom < body.bottom };
    });
    expect(latch.inside).toBe(true); // nothing hangs under the body
  });

  test('lifts the body on its hinge, its top edge staying put, and shows every slider where it lay', async ({ page }) => {
    await page.goto('/');
    const hingeBefore = await page.locator('.bonnet').evaluate((b) => b.getBoundingClientRect().top);
    await page.click('[name="klang"]');
    expect(await lifting(page)).toContain('transform');
    await expect.poll(() => lifting(page)).toEqual([]);
    await expect(page.locator('.klang')).toBeVisible();
    const open = await page.locator('.klang-bay').evaluate((bay) => ({
      lifted: getComputedStyle(bay.querySelector('.bonnet')!).transform !== 'none',
      sliderTop: bay.querySelector('.klang input')!.getBoundingClientRect().top,
      bayTop: bay.getBoundingClientRect().top,
    }));
    expect(open.lifted).toBe(true);
    expect(open.bayTop).toBeCloseTo(hingeBefore, 0);
    expect(open.sliderTop).toBeGreaterThan(open.bayTop); // under where the body was
  });

  test('shuts from its button and from Escape, and hides its sliders once down', async ({ page }) => {
    await page.goto('/');
    for (const shut of [() => page.click('[name="klang-close"]'), () => page.keyboard.press('Escape')]) {
      await page.click('[name="klang"]');
      await expect.poll(() => lifting(page)).toEqual([]);
      await shut();
      await expect.poll(() => lifting(page)).toEqual([]);
      await expect(page.locator('.klang')).toBeHidden();
      await expect(page.locator('[name="klang"]')).toBeVisible();
    }
  });

  test('at phone width every slider and its value fit, and the lifted lid widens nothing', async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 900 });
    await page.goto('/');
    await page.click('[name="klang"]');
    await expect.poll(() => lifting(page)).toEqual([]);
    const overflowing = await page.locator('.klang').evaluate((klang) => {
      const inside = klang.getBoundingClientRect();
      return [...klang.querySelectorAll('output, input, button')].filter((e) => e.getBoundingClientRect().right > inside.right || e.getBoundingClientRect().bottom > inside.bottom).map((e) => e.getAttribute('name'));
    });
    expect(overflowing).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(420);
  });

  test('opens without moving when the system asks for less motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.click('[name="klang"]');
    expect(await lifting(page)).toEqual([]);
    await expect(page.locator('.klang')).toBeVisible();
  });
});
