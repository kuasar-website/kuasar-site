import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const L = {
  en: { upcoming: "Upcoming", live: "Live", register: "Register for Galactic Summit 2026 (opens in a new tab)", soon: "Registration opens soon",
    partner: "Become a Partner: sponsorship file (PDF, opens in a new tab)", partnerText: "Become a Partner (PDF)", date: "November 7, 2026",
    noDate: "Date to be announced", archive: "Other editions", empty: "Details of the next Galactic Summit will be announced soon.",
    headings: ["Programme", "Speakers", "Photos", "Contact"], archivePhotos: "Photos from Galactic Summit 2025" },
  tr: { upcoming: "Yaklaşan", live: "Şimdi", register: "Galactic Summit 2026 için kayıt ol (yeni sekmede açılır)", soon: "Kayıtlar yakında",
    partner: "İş ortağımız olun: sponsorluk dosyası (PDF, yeni sekmede açılır)", partnerText: "İş ortağımız olun (PDF)", date: "7 Kasım 2026",
    noDate: "Tarih yakında açıklanacak", archive: "Diğer yıllar", empty: "Bir sonraki Galactic Summit'in ayrıntıları yakında duyurulacak.",
    headings: ["Program", "Konuşmacılar", "Fotoğraflar", "İletişim"], archivePhotos: "Galactic Summit 2025 fotoğrafları" },
} as const;

const SUMMIT_TOKENS = ["aurora", "ion", "violet", "ember"];
const badge = (page: Page) => page.locator("[data-time-state]");
const noHorizontalScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  return errors;
}
/** Record analytics events by stubbing window.va, which @vercel/analytics' track() calls. */
async function captureAnalytics(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __events: unknown[] }).__events = [];
    (window as unknown as { va: (...args: unknown[]) => void }).va = (...args) => (window as unknown as { __events: unknown[] }).__events.push(args);
  });
  return () => page.evaluate(() => (window as unknown as { __events: unknown[] }).__events);
}

for (const locale of ["en", "tr"] as const) {
  const t = L[locale];

  for (const width of [320, 1280]) {
    test(`${locale} ${width}px: neutral, sponsor-free baseline without JavaScript`, async ({ browser, request }) => {
      const html = await (await request.get(`/${locale}?set=many&reg=1`)).text();
      expect(html).not.toMatch(/data-time-state=|>(Upcoming|Live|Yaklaşan|Şimdi)</);
      expect(html).toContain('dateTime="2026-11-07T07:00:00.000Z"');
      const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 900 } });
      const page = await context.newPage();
      await page.goto(`/${locale}?set=many&reg=1`);
      await expect(page.locator("h1")).toHaveText("Galactic Summit 2026");
      await expect(page.locator("h1 [lang=en]")).toHaveText("Galactic Summit");
      await expect(page.locator("h2")).toHaveText([...t.headings, t.archive]);
      await expect(page.locator("h3")).toHaveText(["Galactic Summit 2025", "Galactic Summit 2024", "Galactic Summit 2023"]);
      await expect(page.locator("time").first()).toHaveText(t.date);
      await expect(page.getByRole("link", { name: t.register })).toHaveAttribute("href", "https://forms.gle/fixture");
      await expect(page.getByRole("link", { name: t.partner })).toHaveAttribute("href", "https://media.kuasar.org/sponsorship.pdf");
      await expect(page.getByRole("list", { name: t.archivePhotos })).toBeVisible();
      if (locale === "tr") await expect(page.locator("article").nth(1).locator("p[lang=en]")).toHaveCount(1);
      await expect(badge(page)).toHaveCount(0);
      expect(await noHorizontalScroll(page)).toBe(true);
      await context.close();
    });
  }

  test(`${locale}: hydrates without errors; Upcoming before the Summit's Istanbul day`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.clock.install({ time: new Date("2026-08-15T09:00:00Z") });
    await page.goto(`/${locale}`);
    await expect(badge(page)).toHaveText(t.upcoming);
    await expect(badge(page)).toHaveAttribute("data-time-state", "upcoming");
    expect(errors).toEqual([]);
  });

  for (const zone of ["UTC", "Europe/Istanbul", "America/New_York"]) {
    test.describe(`${locale} device zone ${zone}`, () => {
      test.use({ timezoneId: zone });
      test("Upcoming → Live at Istanbul midnight → nothing the next Istanbul midnight, while open", async ({ page }) => {
        await page.clock.install({ time: new Date("2026-11-06T20:59:57Z") }); // 23:59:57 on 6 Nov, Istanbul
        await page.goto(`/${locale}`);
        await expect(badge(page)).toHaveText(t.upcoming);
        await page.clock.runFor(4000);
        await expect(badge(page)).toHaveText(t.live);
        await expect(badge(page)).toHaveAttribute("data-time-state", "live");
        await page.clock.pauseAt(new Date("2026-11-07T20:59:58Z"));
        await page.clock.runFor(1000);
        await expect(badge(page)).toHaveText(t.live);
        await page.clock.runFor(3000);
        await expect(badge(page)).toHaveCount(0);
      });
    });
  }

  test(`${locale}: an August build opened after the Summit day shows no badge`, async ({ page }) => {
    await page.clock.install({ time: new Date("2026-12-01T09:00:00Z") });
    await page.goto(`/${locale}`);
    await expect(page.locator("time").first()).toHaveText(t.date);
    await page.clock.runFor(2000);
    await expect(badge(page)).toHaveCount(0);
  });

  test(`${locale}: no date shows the approved text and no badge`, async ({ page }) => {
    await page.clock.install({ time: new Date("2026-08-15T09:00:00Z") });
    await page.goto(`/${locale}?nodate`);
    await expect(page.getByText(t.noDate)).toBeVisible();
    await page.clock.runFor(2000);
    await expect(badge(page)).toHaveCount(0);
  });

  test(`${locale}: registration closed is plain text, never a disabled control`, async ({ page }) => {
    await page.goto(`/${locale}?reg=0`);
    const label = page.getByText(t.soon, { exact: true });
    await expect(label).toBeVisible();
    expect(await label.evaluate((el) => el.tagName)).toBe("P");
    await expect(page.locator("[disabled], [aria-disabled]")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Register|Kayıt ol/ })).toHaveCount(0);
  });

  test(`${locale}: registration open is the single Primary link in a new tab`, async ({ page }) => {
    await page.goto(`/${locale}?reg=1`);
    const link = page.getByRole("link", { name: t.register });
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener");
    await expect(page.getByText(t.soon)).toHaveCount(0);
  });

  test(`${locale}: opening the PDF sends exactly one analytics event`, async ({ page, context }) => {
    const events = await captureAnalytics(page);
    await page.goto(`/${locale}`);
    const link = page.getByRole("link", { name: t.partner });
    await expect(link).toHaveText(`${t.partnerText} ↗`);
    await expect(link).toHaveAttribute("target", "_blank");
    await context.route("https://media.kuasar.org/**", (route) => route.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.4" }));
    const popup = context.waitForEvent("page");
    await link.click();
    await popup;
    expect(await events()).toEqual([["event", { name: "Sponsorship PDF opened" }]]);
  });

  test(`${locale}: without a PDF there is no partner link or placeholder`, async ({ page }) => {
    await page.goto(`/${locale}?pdf=0`);
    await expect(page.getByText(/Become a Partner|İş ortağımız/)).toHaveCount(0);
    await expect(page.locator('a[href$=".pdf"]')).toHaveCount(0);
  });

  test(`${locale}: zero editions shows the approved message only`, async ({ page }) => {
    await page.goto(`/${locale}?set=zero`);
    await expect(page.locator("h1")).toHaveText("Galactic Summit");
    await expect(page.getByText(t.empty)).toBeVisible();
    await expect(page.locator("h2, a, time")).toHaveCount(0);
  });

  test(`${locale}: a sparse edition omits empty sections without heading gaps`, async ({ page }) => {
    await page.goto(`/${locale}?set=sparse`);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h2, h3")).toHaveCount(0);
  });

  for (const accent of SUMMIT_TOKENS) {
    for (const treatment of ["still", "wash", "gradient"]) {
      test(`${locale}: ${accent} × ${treatment} renders one layout; the accent never reaches interactive or state UI`, async ({ page }) => {
        await page.clock.install({ time: new Date("2026-11-07T09:00:00Z") });
        await page.goto(`/${locale}?accent=${accent}&treatment=${treatment}&reg=1`);
        await expect(page.locator(`[data-accent="${accent}"][data-treatment="${treatment}"]`)).toHaveCount(1);
        await expect(badge(page)).toHaveText(t.live);
        if (treatment !== "gradient") await expect(page.locator("[data-treatment] img").first()).toBeVisible();
        const leaks = await page.evaluate((tokens) => {
          const root = getComputedStyle(document.documentElement);
          const probe = document.createElement("span");
          document.body.append(probe);
          const resolved = tokens.map((name) => {
            probe.style.color = root.getPropertyValue(`--color-summit-${name}`).trim();
            return getComputedStyle(probe).color;
          });
          probe.remove();
          const targets = [...document.querySelectorAll("a, button, [data-time-state]")];
          const found: string[] = [];
          for (const el of targets) {
            const style = getComputedStyle(el);
            for (const value of [style.color, style.backgroundColor, style.borderTopColor, style.outlineColor]) {
              if (resolved.includes(value)) found.push(`${el.textContent?.trim()}: ${value}`);
            }
          }
          return found;
        }, SUMMIT_TOKENS);
        expect(leaks).toEqual([]);
      });
    }
  }

  test(`${locale}: sponsors never render`, async ({ request }) => {
    const html = await (await request.get(`/${locale}?set=many&reg=1`)).text();
    // The approved PDF copy ("sponsorship", "sponsorluk") is allowed; a sponsor section, name or logo is not.
    expect(html).not.toMatch(/\bsponsors?\b/i);
    expect(html).not.toMatch(/logo/i);
  });

  test(`${locale}: keyboard reaches Register and the PDF link with a visible focus ring`, async ({ page }) => {
    await page.goto(`/${locale}?reg=1`);
    await page.locator("body").focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: t.register })).toBeFocused();
    expect(await page.locator(":focus").evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe("none");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: t.partner })).toBeFocused();
    expect(await page.locator(":focus").evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe("none");
  });

  for (const width of [320, 1280]) {
    test(`${locale} ${width}px: no motion with reduced motion, no horizontal scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/${locale}?set=many&treatment=wash&reg=1`);
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
      expect(await noHorizontalScroll(page)).toBe(true);
    });
  }

  test(`${locale}: axe finds no violations before and after mount`, async ({ page }) => {
    await page.route("**/client.js", (route) => route.abort());
    await page.goto(`/${locale}?set=many&treatment=wash&reg=1`);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.unroute("**/client.js");
    await page.clock.install({ time: new Date("2026-11-07T09:00:00Z") });
    await page.goto(`/${locale}?set=many&treatment=wash&reg=1`);
    await expect(badge(page)).toHaveText(t.live);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}
