import { test, expect } from "@playwright/test";

for (const locale of ["tr", "en"]) {
  test(`${locale}: neutral static HTML without JavaScript`, async ({ browser, request }) => {
    const html = await (await request.get(`/${locale}`)).text();
    expect(html).not.toMatch(/data-(?:time-state|era)=|style=|\b(?:past|live|upcoming)\b/);
    expect(html).toContain('dateTime="2026-11-07T10:00:00Z"');
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:4173/${locale}`);
    await expect(page.locator("#event time")).toHaveText(locale === "tr" ? "7 Kasım 2026" : "November 7, 2026");
    await expect(page.locator("[data-time-state]")).toHaveCount(0);
    await expect(page.locator("#selected li")).toHaveText(["later", "event", "earlier"]);
    await expect(page.locator("#counts")).toHaveText("0,1,50");
    await context.close();
  });

  test(`${locale}: August HTML remains correct through December`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.clock.install({ time: new Date("2026-08-02T00:00:00Z") });
    await page.goto(`/${locale}`);
    await expect(page.locator("#event time")).toHaveAttribute("data-time-state", "upcoming");
    await expect(page.locator("#selected li")).toHaveText(["event", "later"]);
    await expect(page.locator("#sorted")).toHaveText("later,event,tie,earlier,invalid");
    await page.clock.pauseAt(new Date("2026-11-07T09:59:59Z"));
    await page.clock.runFor(1000);
    await expect(page.locator("#event time")).toHaveAttribute("data-time-state", "live");
    await expect(page.locator("#offset time")).toHaveAttribute("data-time-state", "live");
    await expect(page.locator("#day time")).toHaveAttribute("data-time-state", "live");
    await page.clock.fastForward(3_600_000);
    await expect(page.locator("#event time")).toHaveAttribute("data-time-state", "past");
    await page.clock.pauseAt(new Date("2026-12-02T00:00:00Z"));
    await page.clock.runFor(1000);
    await expect(page.locator("#later time")).toHaveAttribute("data-time-state", "past");
    await expect(page.locator("#day time")).toHaveAttribute("data-time-state", "past");
    await expect(page.locator("#selected li")).toHaveCount(0);
    await expect(page.locator("#counts")).toHaveText("0,0,0");
    expect(errors).toEqual([]);
  });

  test(`${locale}: invalid inputs stay neutral and remount refreshes clock`, async ({ page }) => {
    await page.clock.install({ time: new Date("2026-11-07T10:30:00Z") });
    await page.goto(`/${locale}`);
    await expect(page.locator("#event time")).toHaveAttribute("data-time-state", "live");
    for (const id of ["invalid", "ambiguous", "reversed", "bad-end"]) {
      await expect(page.locator(`#${id} time`)).not.toHaveAttribute("data-time-state");
    }
    await expect(page.locator("#missing time")).toHaveCount(0);
    await page.getByRole("button").click();
    await page.clock.setSystemTime(new Date("2026-12-02T00:00:00Z"));
    await page.getByRole("button").click();
    await expect(page.locator("#event time")).toHaveAttribute("data-time-state", "past");
    await page.clock.setSystemTime(new Date("2026-11-07T10:30:00Z"));
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page.locator("#event time")).toHaveAttribute("data-time-state", "live");
  });
}
