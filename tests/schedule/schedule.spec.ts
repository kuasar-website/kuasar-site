import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const L = {
  en: { nov: "November 2026", dec: "December 2026", jan: "January 2027", live: "Live now", next: "Next month",
    previous: "Previous month", today: "Today", showing: (m: string) => `Showing ${m}`, empty: "No events are scheduled yet.",
    emptyMonth: (m: string) => `No events in ${m}.`, note: "All times are shown in Istanbul time (GMT+3).", dec1: "December 1, 2026" },
  tr: { nov: "Kasım 2026", dec: "Aralık 2026", jan: "Ocak 2027", live: "Şimdi", next: "Sonraki ay",
    previous: "Önceki ay", today: "Bugün", showing: (m: string) => `${m} gösteriliyor`, empty: "Henüz planlanmış etkinlik yok.",
    emptyMonth: (m: string) => `${m} ayında etkinlik yok.`, note: "Tüm saatler İstanbul saatiyle (GMT+3) gösterilir.", dec1: "1 Aralık 2026" },
} as const;

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  return errors;
}
const noHorizontalScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const caption = (page: Page) => page.locator("table caption");
const live = (page: Page) => page.locator('[aria-live="polite"]');
// Existing L3 primitives (button press feedback in the controls) are allowed; nothing else may move.
const scheduleAnimations = (page: Page) => page.evaluate(() => document.getAnimations()
  .filter((animation) => !((animation.effect as KeyframeEffect | null)?.target as Element | null)?.closest('[role="group"]')).length);
const article = (page: Page, id: string) => page.locator(`#schedule-event-${id}`);

for (const locale of ["en", "tr"] as const) {
  const t = L[locale];

  for (const width of [320, 768, 1280]) {
    test(`${locale} ${width}px: neutral baseline without JavaScript`, async ({ browser, request }) => {
      const html = await (await request.get(`/${locale}`)).text();
      expect(html).not.toMatch(/data-time-state=|<table\b|aria-current=/);
      expect(html).toContain('dateTime="2026-11-30T22:30:00.000Z"');
      const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 900 } });
      const page = await context.newPage();
      await page.goto(`/${locale}`);
      await expect(page.locator("article")).toHaveCount(6);
      await expect(page.locator("h2")).toHaveText([locale === "tr" ? "Ekim 2026" : "October 2026", t.nov, t.dec]);
      await expect(page.getByText(t.note)).toBeVisible();
      await expect(page.locator("table")).toHaveCount(0);
      // The 22:30Z event is listed under December at 01:30 Istanbul time.
      await expect(article(page, "late")).toContainText("01:30");
      if (locale === "tr") await expect(article(page, "fallback").locator("h3")).toHaveAttribute("lang", "en");
      expect(await noHorizontalScroll(page)).toBe(true);
      await context.close();
    });
  }

  test(`${locale}: a build from August opens on December, without hydration errors`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.clock.install({ time: new Date("2026-12-10T09:00:00Z") });
    await page.goto(`/${locale}`);
    await expect(caption(page)).toHaveText(t.dec);
    await expect(live(page)).toHaveText(t.showing(t.dec));
    // Agenda narrows to December: the month-spanning "late" event and the fallback.
    await expect(page.locator("article")).toHaveCount(2);
    await expect(article(page, "late")).toHaveAttribute("data-time-state", "past");
    await expect(article(page, "fallback")).toHaveAttribute("data-time-state", "upcoming");
    await expect(article(page, "fallback")).toContainText(locale === "tr" ? "Yaklaşan" : "Upcoming");
    expect(errors).toEqual([]);
  });

  test(`${locale}: upcoming → live → past while the page stays open`, async ({ page }) => {
    await page.clock.install({ time: new Date("2026-11-07T06:59:58Z") });
    await page.goto(`/${locale}`);
    await expect(article(page, "talk")).toHaveAttribute("data-time-state", "upcoming");
    await expect(article(page, "talk").getByText(t.live)).toHaveCount(0);
    await page.clock.runFor(3000);
    await expect(article(page, "talk")).toHaveAttribute("data-time-state", "live");
    await expect(article(page, "talk").getByText(t.live)).toBeVisible();
    await page.clock.fastForward(2 * 3_600_000);
    await expect(article(page, "talk")).toHaveAttribute("data-time-state", "past");
    await expect(article(page, "talk").getByText(t.live)).toHaveCount(0);
  });

  test(`${locale}: following today rolls over at the Istanbul month boundary`, async ({ page }) => {
    // 20:59:58Z on 30 November is 23:59:58 in Istanbul.
    await page.clock.install({ time: new Date("2026-11-30T20:59:58Z") });
    await page.goto(`/${locale}`);
    await expect(caption(page)).toHaveText(t.nov);
    await page.clock.runFor(4000);
    await expect(caption(page)).toHaveText(t.dec);
  });

  test(`${locale}: previous, next and today with announced, exact copy`, async ({ page }) => {
    await page.clock.install({ time: new Date("2026-11-15T09:00:00Z") });
    await page.goto(`/${locale}`);
    await page.getByRole("button", { name: t.next }).click();
    await expect(caption(page)).toHaveText(t.dec);
    await expect(live(page)).toHaveText(t.showing(t.dec));
    await page.getByRole("button", { name: t.next }).click();
    await expect(live(page)).toHaveText(t.showing(t.jan));
    await expect(page.getByText(t.emptyMonth(t.jan))).toBeVisible();
    // Navigating away stops following the clock.
    await page.clock.fastForward(20 * 86_400_000);
    await expect(caption(page)).toHaveText(t.jan);
    await page.getByRole("button", { name: t.today }).click();
    await expect(caption(page)).toHaveText(t.dec);
    await page.getByRole("button", { name: t.previous }).click();
    await expect(live(page)).toHaveText(t.showing(t.nov));
    await expect(page).toHaveURL(new RegExp(`/${locale}$`));
  });

  test(`${locale}: keyboard walks across the month boundary and into the agenda`, async ({ page }) => {
    await page.clock.install({ time: new Date("2026-11-30T09:00:00Z") });
    await page.goto(`/${locale}`);
    const grid = page.locator("table");
    await expect(grid.locator('button[tabindex="0"]')).toHaveCount(1);
    // Tab order: Previous, Next, Today, then a single stop in the grid.
    await page.locator("body").focus();
    for (let i = 0; i < 4; i++) await page.keyboard.press("Tab");
    const today = grid.locator('button[aria-current="date"]');
    await expect(today).toBeFocused();
    await expect(today).toHaveAttribute("aria-label", new RegExp(locale === "tr" ? "30 Kasım 2026" : "November 30, 2026"));
    expect(await today.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe("none");
    await page.keyboard.press("ArrowRight");
    await expect(caption(page)).toHaveText(t.dec);
    const focused = page.locator(":focus");
    await expect(focused).toHaveAttribute("aria-label", new RegExp(`${t.dec1}.*${locale === "tr" ? "1 etkinlik: Gösterim" : "1 event: Screening"}`));
    await page.keyboard.press("Enter");
    await expect(article(page, "late")).toBeFocused();
    await page.locator('table button[tabindex="0"]').focus();
    await page.keyboard.press("PageUp");
    await expect(caption(page)).toHaveText(t.nov);
    await expect(page.locator(":focus")).toHaveAttribute("aria-label", new RegExp(locale === "tr" ? "^1 Kasım 2026 Pazar" : "^Sunday, November 1, 2026"));
    // Home goes to Monday of the same week, which is in October.
    await page.keyboard.press("Home");
    await expect(caption(page)).toHaveText(locale === "tr" ? "Ekim 2026" : "October 2026");
    await expect(page.locator(":focus")).toHaveAttribute("aria-label", new RegExp(locale === "tr" ? "^26 Ekim 2026" : "^Monday, October 26, 2026"));
    await page.keyboard.press("ArrowDown");
    await expect(caption(page)).toHaveText(t.nov);
    await page.keyboard.press("End");
    await expect(page.locator(":focus")).toHaveAttribute("aria-label", new RegExp(locale === "tr" ? "^8 Kasım 2026 Pazar" : "^Sunday, November 8, 2026"));
  });

  test(`${locale}: screen-reader day cell names date, count and types`, async ({ page }) => {
    await page.clock.install({ time: new Date("2026-11-15T09:00:00Z") });
    await page.goto(`/${locale}`);
    const nov7 = page.locator("table button").nth(6);
    await expect(nov7).toHaveAttribute("aria-label", locale === "tr"
      ? "7 Kasım 2026 Cumartesi, 3 etkinlik: Zirve, Söyleşi, Atölye"
      : "Saturday, November 7, 2026, 3 events: Summit, Talk, Workshop");
    await expect(page.locator("thead th")).toHaveCount(7);
    await expect(page.locator("thead th").first()).toContainText(locale === "tr" ? "Pazartesi" : "Monday");
    // Multi-day summit occupies 6, 7 and 8 November.
    for (const day of [5, 6, 7]) await expect(page.locator("table button").nth(day)).toHaveAttribute("aria-label", new RegExp(locale === "tr" ? "Zirve" : "Summit"));
    await expect(page.locator("table button").nth(8)).toHaveAttribute("aria-label", new RegExp(locale === "tr" ? "0 etkinlik$" : "0 events$"));
  });

  for (const zone of ["UTC", "Europe/Istanbul", "America/New_York"]) {
    test.describe(`${locale} device zone ${zone}`, () => {
      test.use({ timezoneId: zone });
      test(`22:30Z event sits on 1 December at 01:30`, async ({ page }) => {
        await page.clock.install({ time: new Date("2026-12-02T09:00:00Z") });
        await page.goto(`/${locale}`);
        await expect(caption(page)).toHaveText(t.dec);
        await expect(page.locator("table button").first()).toHaveAttribute("aria-label", new RegExp(`${t.dec1}.*1`));
        await expect(article(page, "late")).toContainText("01:30");
      });
    });
  }

  for (const [set, count] of [["zero", 0], ["one", 1], ["many", 50]] as const) {
    for (const width of [320, 1280]) {
      test(`${locale} ${width}px: ${count} events after mount`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.clock.install({ time: new Date("2026-11-15T09:00:00Z") });
        await page.goto(`/${locale}?set=${set}`);
        await expect(caption(page)).toHaveText(t.nov);
        await expect(page.locator("article")).toHaveCount(count);
        if (count === 0) await expect(page.getByText(t.empty)).toBeVisible();
        if (count === 50 && width === 1280) await expect(page.getByText(locale === "tr" ? "+2 daha" : "+2 more").first()).toBeVisible();
        if (count === 50 && width === 320) await expect(page.locator("table button").nth(1).getByText(locale === "tr" ? "S" : "T", { exact: true })).toBeVisible();
        for (const label of [t.today]) await expect(page.getByRole("button", { name: label })).toBeVisible();
        expect(await noHorizontalScroll(page)).toBe(true);
      });
    }
  }

  test(`${locale}: reduced motion changes month instantly`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.clock.install({ time: new Date("2026-11-15T09:00:00Z") });
    await page.goto(`/${locale}`);
    await page.getByRole("button", { name: t.next }).click();
    await expect(caption(page)).toHaveText(t.dec);
    expect(await scheduleAnimations(page)).toBe(0);
  });

  test(`${locale}: phone width month change has no motion`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.clock.install({ time: new Date("2026-11-15T09:00:00Z") });
    await page.goto(`/${locale}`);
    await page.getByRole("button", { name: t.next }).click();
    await expect(caption(page)).toHaveText(t.dec);
    expect(await scheduleAnimations(page)).toBe(0);
  });

  test(`${locale}: axe finds no violations before and after mount`, async ({ page }) => {
    // Before mount: the neutral server DOM, with the client bundle withheld.
    await page.route("**/client.js", (route) => route.abort());
    await page.goto(`/${locale}`);
    await expect(page.locator("table")).toHaveCount(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.unroute("**/client.js");
    await page.clock.install({ time: new Date("2026-11-07T08:00:00Z") });
    await page.goto(`/${locale}`);
    await expect(caption(page)).toHaveText(t.nov);
    await expect(article(page, "talk")).toHaveAttribute("data-time-state", "live");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}
