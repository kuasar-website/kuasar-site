import { expect, test } from '@playwright/test';
for (const locale of ['en', 'tr']) {
  test(`${locale}: desktop scroll advances, reverses and Escape restores native`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await expect(page.locator('[data-signature="active"]')).toHaveCount(1);
    const track = page.locator('ol');
    const x = () => track.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m41);
    await page.evaluate(() => window.scrollTo(0, 600));
    await expect.poll(x).toBeLessThan(-300);
    const middle = await x();
    await page.evaluate(() => window.scrollTo(0, 1000));
    await expect.poll(x).toBeLessThan(middle - 100);
    await page.evaluate(() => window.scrollTo(0, 200));
    await expect.poll(x).toBeGreaterThan(middle);
    await page.keyboard.press('Escape');
    await expect(page.locator('.pin-spacer')).toHaveCount(0);
    await expect(track).toHaveCSS('transform', 'none');
    await expect(page.locator('[role="region"]')).toHaveCSS('overflow-x', 'auto');
  });
  for (const mode of ['mobile', 'reduced', 'home', 'one', 'zero', 'hash']) {
    test(`${locale}: ${mode} never loads the animation engine`, async ({ page }) => {
      const chunks: string[] = [];
      page.on('request', request => { if (request.url().includes('/chunks/')) chunks.push(request.url()); });
      if (mode === 'mobile') await page.setViewportSize({ width: 390, height: 844 });
      if (mode === 'reduced') await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`/${locale}${mode === 'home' ? '?home' : mode === 'one' ? '?count=1' : mode === 'zero' ? '?count=0' : ''}${mode === 'hash' ? '#timeline-entry-fixture-3' : ''}`);
      await expect(page.locator('#after')).toBeVisible();
      await page.waitForTimeout(250);
      await expect(page.locator('.pin-spacer')).toHaveCount(0);
      expect(chunks.filter(url => /engine-|gsap|ScrollTrigger|dist-/.test(url))).toEqual([]);
      await expect(page.locator('li')).toHaveCount(mode === 'zero' ? 0 : mode === 'one' ? 1 : 5);
    });
  }
  test(`${locale}: changing motion preference or width reverts and unmount cleans up`, async ({ page }) => {
    await page.goto(`/${locale}?count=50`);
    await expect(page.locator('.pin-spacer')).toHaveCount(1);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('.pin-spacer')).toHaveCount(0);
    await expect(page.locator('ol')).toHaveCSS('transform', 'none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(page.locator('.pin-spacer')).toHaveCount(1);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.pin-spacer')).toHaveCount(0);
    await page.setViewportSize({ width: 1280, height: 1000 });
    await expect(page.locator('.pin-spacer')).toHaveCount(1);
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Unmount timeline' }).click();
      await expect(page.locator('.pin-spacer')).toHaveCount(0);
      await page.getByRole('button', { name: 'Mount timeline' }).click();
      await expect(page.locator('.pin-spacer')).toHaveCount(1);
    }
  });
  test(`${locale}: keyboard focus restores native access to the last record`, async ({ page }) => {
    await page.goto(`/${locale}?count=50`);
    await expect(page.locator('.pin-spacer')).toHaveCount(1);
    await page.locator('li').last().focus();
    await expect(page.locator('.pin-spacer')).toHaveCount(0);
    await expect(page.locator('li').last()).toBeFocused();
    expect(await page.locator('[role="region"]').evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  });
  test(`${locale}: failed import leaves native content`, async ({ page }) => {
    await page.route('**/chunks/engine-*', route => route.abort());
    await page.goto(`/${locale}`);
    await expect(page.locator('li')).toHaveCount(5);
    await page.waitForTimeout(250);
    await expect(page.locator('.pin-spacer')).toHaveCount(0);
    await expect(page.locator('[role="region"]')).toHaveCSS('overflow-x', 'auto');
  });
  test(`${locale}: JavaScript-disabled baseline works`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:4182/${locale}?count=50`);
    await expect(page.locator('li')).toHaveCount(50);
    await expect(page.locator('.pin-spacer')).toHaveCount(0);
    await context.close();
  });
}
