import { test, expect } from '@playwright/test';

for (const locale of ['en', 'tr']) {
  test(`${locale}: sequence settles and Escape restores static artwork`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await expect(page.locator('[data-hero-signature]')).toHaveAttribute('data-hero-motion', 'active');
    await expect.poll(() => page.evaluate(() => (window as any).heroSequence?.progress())).toBe(1);
    await expect(page.getByRole('heading', { name: 'KUASAR' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-hero-signature]')).not.toHaveAttribute('data-hero-motion');
    await expect(page.locator('[data-hero-jets]')).toHaveCSS('opacity', '1');
  });
  for (const mode of ['mobile', 'reduced', 'no-js']) {
    test(`${locale}: ${mode} retains complete baseline without deferred requests`, async ({ browser }) => {
      const context = await browser.newContext({ javaScriptEnabled: mode !== 'no-js', reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference', viewport: { width: mode === 'mobile' ? 390 : 1280, height: 1000 } });
      const page = await context.newPage();
      const chunks: string[] = [];
      page.on('request', r => { if (r.url().includes('/chunks/')) chunks.push(r.url()); });
      await page.goto(`http://127.0.0.1:4183/${locale}`);
      await expect(page.getByRole('heading', { name: 'KUASAR' })).toBeVisible();
      await expect(page.locator('[data-hero-jets]')).toHaveCSS('opacity', '1');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(chunks).toEqual([]);
      await context.close();
    });
  }
  test(`${locale}: preference change cleans up and remount is independent`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await expect(page.locator('[data-hero-signature]')).toHaveAttribute('data-hero-motion', 'active');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('[data-hero-signature]')).not.toHaveAttribute('data-hero-motion');
    await expect(page.locator('[data-hero-jets]')).toHaveCSS('opacity', '1');
    await page.getByRole('button', { name: 'Toggle fixture' }).click();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByRole('button', { name: 'Toggle fixture' }).click();
    await expect(page.locator('[data-hero-signature]')).toHaveAttribute('data-hero-motion', 'active');
    await expect(page.getByRole('heading')).toHaveCount(1);
  });
  test(`${locale}: failed import leaves usable actions`, async ({ page }) => {
    await page.route('**/chunks/**', route => route.abort());
    await page.goto(`/${locale}`);
    await page.getByRole('link', { name: locale === 'tr' ? 'Bize katıl' : 'Join us' }).click();
    await expect(page).toHaveURL(/#after$/);
  });
  test(`${locale}: leaving viewport pauses progress`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await expect(page.locator('[data-hero-signature]')).toHaveAttribute('data-hero-motion', 'active');
    await page.locator('#after').scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => (window as any).heroSequence?.paused())).toBe(true);
  });
}
