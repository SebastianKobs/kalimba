import { expect, test, type Page } from '@playwright/test';

test('the Klang panel opens on its macros, and a slider moves the sound', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto('/');
  await page.click('.drawer-pull');
  await expect(page.locator('.klang')).toBeVisible();
  await page.locator('input[name="stimmung"]').fill('20');
  await expect(page.locator('output[name="stimmung-value"]')).toHaveText('+20 Cent');
  await page.dispatchEvent('.tongue[data-note="C4"]', 'pointerdown'); // played with the new Stimmung
  await page.screenshot({ path: 'test-results/klang-panel.png', fullPage: true });
  expect(errors).toEqual([]);
});

// the drawer's own transitions: what is moving while it opens or shuts
const sliding = (page: Page) =>
  page.locator('.klang-drawer').evaluate((drawer) =>
    drawer.getAnimations({ subtree: true }).flatMap((a) => ('transitionProperty' in a ? [(a as CSSTransition).transitionProperty] : [])),
  );
const frontTop = (page: Page) => page.locator('[name="klang"]').evaluate((front) => front.getBoundingClientRect().top + scrollY); // on the page: the click scrolls

test.describe('the Klang drawer', () => {
  test('shut, it is hidden in the kalimba: its front behind the body, only its pull showing under the belly', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.klang')).toBeHidden();
    const shut = await page.locator('.kalimba').evaluate((kalimba) => {
      kalimba.scrollIntoView({ block: 'center' });
      const front = document.querySelector('[name="klang"]')!.getBoundingClientRect();
      const pull = document.querySelector('.drawer-pull')!.getBoundingClientRect();
      const body = kalimba.getBoundingClientRect();
      const onTop = document.elementFromPoint(front.left + front.width / 2, front.top + front.height / 2);
      return { frontBelow: front.bottom - body.bottom, pullBelow: pull.bottom - body.bottom, covered: kalimba.contains(onTop) };
    });
    expect(shut.frontBelow).toBeLessThan(0);
    expect(shut.covered).toBe(true);
    expect(shut.pullBelow).toBeGreaterThan(10);
  });

  test('pulled out, its front is clear of the kalimba', async ({ page }) => {
    await page.goto('/');
    await page.click('.drawer-pull');
    await expect.poll(() => sliding(page)).toEqual([]);
    const clear = await page.locator('[name="klang"]').evaluate((front) => {
      front.scrollIntoView({ block: 'center' });
      const box = front.getBoundingClientRect();
      return front.contains(document.elementFromPoint(box.left + box.width / 2, box.top + 4));
    });
    expect(clear).toBe(true);
  });

  test('slides open: the drawer grows while its front moves down, then shows every slider', async ({ page }) => {
    await page.goto('/');
    const shut = await frontTop(page);
    await page.click('.drawer-pull');
    expect(await sliding(page)).toContain('grid-template-rows');
    await expect(page.locator('.klang')).toBeVisible();
    await expect.poll(() => sliding(page)).toEqual([]);
    const open = await frontTop(page);
    const sliders = await page.locator('.klang').evaluate((k) => k.getBoundingClientRect().height);
    expect(open - shut).toBeCloseTo(sliders, -1); // moved by the whole drawer
  });

  test('slides shut again, and hides its sliders once shut', async ({ page }) => {
    await page.goto('/');
    await page.click('.drawer-pull');
    await expect.poll(() => sliding(page)).toEqual([]);
    await page.click('.drawer-pull');
    expect(await sliding(page)).toContain('grid-template-rows');
    await expect(page.locator('.klang')).toBeHidden();
  });

  test('at phone width every slider and its value fit in the drawer', async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 900 });
    await page.goto('/');
    await page.click('.drawer-pull');
    await expect.poll(() => sliding(page)).toEqual([]);
    const overflowing = await page.locator('.klang').evaluate((klang) => {
      const inside = klang.getBoundingClientRect();
      return [...klang.querySelectorAll('output, input')].filter((e) => e.getBoundingClientRect().right > inside.right).map((e) => e.getAttribute('name'));
    });
    expect(overflowing).toEqual([]);
  });

  test('opens without sliding when the system asks for less motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.click('.drawer-pull');
    expect(await sliding(page)).toEqual([]);
    await expect(page.locator('.klang')).toBeVisible();
  });
});
