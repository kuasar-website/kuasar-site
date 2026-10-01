import { test, expect } from '@playwright/test';
for (const locale of ['en', 'tr']) {
  for (const width of [320, 768, 1280]) {
    test(`${locale} ${width}px: static content and keyboard links without JavaScript`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}`);
      await expect(page.getByRole('heading', { name: 'Stellar Talk', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Nebula Night', exact: true })).toBeVisible();
      await expect(page.locator('article')).toHaveCount(2);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const watch = page.getByRole('link', { name: locale === 'tr' ? 'Konuşmayı izle' : 'Watch talk' });
      await page.keyboard.press('Tab');
      await expect(watch).toBeFocused();
      expect(await watch.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', { name: 'Destination fixture' })).toBeVisible();
    });
  }
  for (const count of [0, 50]) test(`${locale}: ${count} records at phone width`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`/${locale}?talks=${count}&nights=${count}`);
    await expect(page.locator('article')).toHaveCount(count * 2);
    await expect(page.locator('section')).toHaveCount(count ? 2 : 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
  test(`${locale}: reduced motion is static; baseline has no video requests`, async ({ page }) => {
    const videoRequests: string[] = [];
    page.on('request', request => { if (/\.(mp4|webm|mov)(\?|$)/i.test(request.url())) videoRequests.push(request.url()); });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/${locale}`);
    await expect(page.locator('video, source, iframe')).toHaveCount(0);
    const link = page.getByRole('link').first();
    await link.hover();
    const arrow = link.locator('[aria-hidden]');
    expect(await arrow.evaluate(el => getComputedStyle(el).transform)).toBe('none');
    expect(await arrow.evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
    expect(videoRequests).toEqual([]);
  });
}
