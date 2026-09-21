import { expect, test } from "@playwright/test";

for (const locale of ['en', 'tr']) {
  for (const width of [320, 390, 1280]) {
    test(`${locale}: static identity and both actions at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/${locale}`);
      await expect(page.getByRole('heading', { name: 'KUASAR', level: 1 })).toBeVisible();
      await expect(page.getByText('Koç University Association of Space & Rocketry')).toBeVisible();
      const logo = page.locator('h1 svg');
      const box = await logo.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(120);
      const frame = await page.locator('h1').evaluate((el) => {
        const s = getComputedStyle(el.parentElement!);
        return [s.paddingTop, s.paddingBottom, s.paddingLeft, s.paddingRight].map(parseFloat);
      });
      for (const padding of frame) expect(padding / box!.width).toBeGreaterThanOrEqual(0.28);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('section a')).toHaveCount(2);
      await expect(page.locator('section a').first()).toBeVisible();
      await expect(page.locator('section a').last()).toBeVisible();
      await expect(page.locator('script, img, video, canvas')).toHaveCount(0);
      // The mark must inherit the semantic ink colour rather than external SVG black.
      expect(await logo.evaluate((el) => getComputedStyle(el).color)).toBe(await page.locator('section').evaluate((el) => getComputedStyle(el).color));
    });
  }
  test(`${locale}: keyboard actions work without JavaScript`, async ({ page }) => {
    await page.goto(`/${locale}`);
    const actions = page.locator('section a');
    await page.keyboard.press('Tab');
    await expect(actions.first()).toBeFocused();
    await expect(actions.first()).toHaveCSS('outline-style', 'solid');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#sponsors$/);
    await actions.first().focus();
    await page.keyboard.press('Tab');
    await expect(actions.last()).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#members$/);
  });
  test(`${locale}: reduced motion is the same static baseline`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/${locale}`);
    const animated = await page.locator('section, section *').evaluateAll((els) => els.some((el) => {
      const s = getComputedStyle(el);
      return s.animationName !== 'none' || s.transitionDuration !== '0s';
    }));
    expect(animated).toBe(false);
    await expect(page.getByRole('heading', { name: 'KUASAR', level: 1 })).toBeVisible();
  });
}
