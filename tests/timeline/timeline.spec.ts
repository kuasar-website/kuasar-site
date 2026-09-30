import { expect, test } from "@playwright/test";

for (const locale of ["en", "tr"] as const) {
  test(`${locale}: zero entries hide the whole section`, async ({ page }) => {
    await page.goto(`/${locale}?count=0`);
    await expect(page.locator('section')).toHaveCount(0);
    await expect(page.locator('script')).toHaveCount(0);
  });

  test(`${locale}: one entry keeps date and direction without JavaScript`, async ({ page }) => {
    await page.goto(`/${locale}?count=1`);
    await expect(page.getByRole('listitem')).toHaveCount(1);
    await expect(page.getByText(locale === 'tr' ? 'Şimdi · Bugünden → Geçmişe' : 'Now · Present → Past')).toBeVisible();
    await expect(page.locator('time')).toHaveAttribute('datetime', '2022-01-01');
    await expect(page.locator('time')).toHaveText('2022-01-01');
    await expect(page.locator('img, script, [data-state]')).toHaveCount(0);
    const link = page.getByRole('link', { name: locale === 'tr' ? 'Zaman çizelgesini keşfet' : 'Explore the timeline' });
    await expect(link).toHaveAttribute('href', locale === 'tr' ? '/tr/zaman-cizelgesi' : '/en/timeline');
  });

  test(`${locale}: all fifty entries reachable by keyboard with no trap`, async ({ page }) => {
    await page.goto(`/${locale}?count=50`);
    const region = page.getByRole('region').and(page.locator('[tabindex="0"]'));
    await region.focus();
    await expect(region).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    const cards = page.getByRole('listitem');
    // Starting from the native scroll region, tab visits each card and its optional link.
    await region.focus();
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('Tab');
      await expect(cards.nth(i)).toBeFocused();
      const link = cards.nth(i).getByRole('link');
      if (await link.count()) {
        await page.keyboard.press('Tab');
        await expect(link).toBeFocused();
      }
    }
    await page.keyboard.press('Tab');
    await expect(page.locator('#after')).toBeFocused();
    await expect.poll(() => region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(1000);
  });

  for (const width of [320, 768, 1280]) {
    test(`${locale}: ${width}px confines overflow to the native region`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`/${locale}?count=50`);
      const region = page.getByRole('region').and(page.locator('[tabindex="0"]'));
      await expect(page.getByRole('listitem')).toHaveCount(50);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await region.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
      await expect(region).toHaveCSS('overflow-x', 'auto');
      await expect(region).toHaveCSS('scroll-snap-type', /^x(?: proximity)?$/);
      const cardsFit = await page.getByRole('listitem').evaluateAll((els) => els.every((el) => el.scrollWidth <= el.clientWidth));
      expect(cardsFit).toBe(true);
    });
  }

  test(`${locale}: reduced motion has no snap, smooth scroll or animation`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/${locale}?count=50`);
    await expect(page.getByRole('region').and(page.locator('[tabindex="0"]'))).toHaveCSS('scroll-snap-type', 'none');
    await expect(page.getByRole('region').and(page.locator('[tabindex="0"]'))).toHaveCSS('scroll-behavior', 'auto');
    const animated = await page.locator('section, section *').evaluateAll((els) => els.some((el) => getComputedStyle(el).animationName !== 'none'));
    expect(animated).toBe(false);
  });
}

test('native touch swipe moves the timeline on a phone', async ({ browser, browserName }) => {
  test.skip(browserName !== 'chromium', 'Touch gesture injection uses Chromium CDP; Firefox covers keyboard and layout.');
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4174/tr?count=50');
  const region = page.getByRole('region').and(page.locator('[tabindex="0"]'));
  const box = await region.boundingBox();
  expect(box).not.toBeNull();
  const cdp = await context.newCDPSession(page);
  const y = box!.y + Math.min(box!.height / 2, 100);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 320, y }] });
  for (const x of [280, 220, 160, 100]) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  await context.close();
});
