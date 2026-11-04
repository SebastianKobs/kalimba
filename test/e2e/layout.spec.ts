import { expect, test } from '@playwright/test';

test('the page fits a phone: nothing scrolls sideways, not even the longest transposition', async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 900 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(420);
});

test('on a laptop screen the controls are one row, and the kalimba fits under them without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const controls = ['.field.song', '.field.mode', '.field.transpose', '.field.tempo', '.field.meter', '.click-toggle', '[name="start"]'];
  const middles = await page.locator(controls.join(', ')).evaluateAll((all) => all.map((c) => Math.round(c.getBoundingClientRect().bottom / 20)));
  expect(new Set(middles).size).toBe(1); // their bottoms line up
  const kalimbaBottom = await page.locator('.kalimba').evaluate((k) => k.getBoundingClientRect().bottom);
  expect(kalimbaBottom).toBeLessThanOrEqual(800);
});

test('the song text is edited in an overlay that fits a phone; the strip shows it meanwhile', async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 800 });
  await page.goto('/');
  const editor = page.locator('dialog.song-editor');
  await expect(page.locator('.tab-view')).toBeVisible();
  // stopped, its first notes on top, past the title and tempo lines
  expect(await page.locator('.tab-view').evaluate((v) => v.scrollTop)).toBeGreaterThan(0);
  await expect(editor).toBeHidden();
  await page.click('[name="edit-text"]');
  await expect(editor).toBeVisible();
  const box = await editor.evaluate((d) => d.getBoundingClientRect().toJSON());
  expect(box.left).toBeGreaterThanOrEqual(0);
  expect(box.right).toBeLessThanOrEqual(420);
  await page.fill('[name="text"]', 'C4 E4 G4');
  await page.click('[name="format-help"]'); // the help over it
  await expect(page.locator('dialog.format-help')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog.format-help')).toBeHidden();
  await expect(editor).toBeVisible();
  await page.screenshot({ path: 'test-results/song-editor.png' });
  await page.click('[name="song-editor-close"]');
  await expect(page.locator('.tab-view')).toHaveText('C4 E4 G4');
});

test.describe('the tab format’s help', () => {
  test('opens over the song text’s editor, fits a phone and shuts with its button or Escape', async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 800 });
    await page.goto('/');
    const help = page.locator('dialog.format-help');
    await expect(help).toBeHidden();
    await page.click('[name="edit-text"]'); // it sits in the song text’s editor
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

test('a click on a tongue’s end, through the bridge, retunes it; the screw on the body puts the tuning back', async ({ page }) => {
  await page.goto('/');
  const tuning = page.locator('.tuning');
  await expect(tuning).toHaveText('Stimmung: Standard-C');
  // the middle of the bridge over F3, the centre tongue: what's hit there is that tongue's end
  const onBridge = await page.locator('.kalimba').evaluate((k) => {
    const f3 = k.querySelector('[data-note="F3"]')!.getBoundingClientRect();
    const bridgeMiddle = getComputedStyle(k, '::before');
    return { x: f3.left + f3.width / 2, y: k.getBoundingClientRect().top + parseFloat(bridgeMiddle.top) + parseFloat(bridgeMiddle.height) / 2 };
  });
  await page.mouse.click(onBridge.x, onBridge.y);
  await expect(tuning).toContainText('erhöht von F auf F#');
  await page.click('.tuning-reset');
  await expect(tuning).toHaveText('Stimmung: Standard-C');
  await expect(page.locator('.tuning-reset')).toBeDisabled();
});

test('the engraved tuning stays on the wood, clear of every tongue, even with all of them retuned', async ({ page }) => {
  for (const width of [1280, 420]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const heads = page.locator('.tongue-head');
    for (let i = 0; i < 21; i++) await heads.nth(i).dispatchEvent('pointerdown', { button: 0 });
    for (let i = 0; i < 21; i += 2) await heads.nth(i).dispatchEvent('pointerdown', { button: 0 }); // every other one flat
    const fit = await page.locator('.kalimba').evaluate((k) => {
      const box = k.querySelector('.engraving')!.getBoundingClientRect();
      const body = k.getBoundingClientRect();
      const overlaps = (r: DOMRect) => box.left < r.right && r.left < box.right && box.top < r.bottom && r.top < box.bottom;
      return {
        lines: k.querySelectorAll('.engraving > span').length,
        onBody: box.left >= body.left && box.right <= body.right && box.bottom <= body.bottom - body.height * 0.15,
        clear: [...k.querySelectorAll('.tongue')].every((t) => !overlaps(t.getBoundingClientRect())),
      };
    });
    expect(fit, `at ${width} px`).toEqual({ lines: 4, onBody: true, clear: true });
  }
});

test('is styled before any script runs: no flash of the unstyled page', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(16, 26, 20)'); // --bg, from the stylesheet alone
  await expect(page.locator('h1')).toHaveCSS('font-size', /^20\.8/); // the header as styled (1.3rem, Firefox rounds to 1/60 px), not the browser's 2em
  await context.close();
});
