## 1. Strapi response mapping

- [x] 1.1 Create `apps/web/lib/cms/announcements.ts`: define the domain
      type (`title`, `slug`, `excerpt`, `body`, `pinned`, `publishedAt`,
      `coverImage: { url: string } | null`, `documentId`, `locale`) and
      `mapAnnouncement(raw: unknown)`, validating against Strapi 5's actual
      flattened response shape (`{ documentId, locale, ...fields }`, no
      nested `attributes`) read directly from
      `apps/cms/src/api/announcement/content-types/announcement/schema.json`.
- [x] 1.2 Throw, naming the missing/malformed field, on anything that
      doesn't match — never produce a record with an `undefined` field.

## 2. Ordering

- [x] 2.1 Create `orderAnnouncements(entries)`: pinned entries first, then
      `publishedAt` descending within each group. Works on zero, one, or
      many entries without error.

## 3. Locale-fallback selection

- [x] 3.1 Create `selectAnnouncementLocale(documentId, variants: { en?,
      tr? })`: return the requested locale's variant if present, else
      `en`, silently (no notice, no error) — matching `design/i18n.md`'s
      requirement, which this design's Context notes is **not** provided
      by Strapi itself (verified false against Strapi 5's actual
      behavior).
- [x] 3.2 Throw if neither the requested locale nor `en` is present —
      silently returning nothing would be indistinguishable from a bug.

## 4. Tests (Node's built-in test runner, matching `git-content-pipeline`'s
      established pattern — no new dependency)

- [x] 4.1 A well-formed Strapi fixture maps successfully.
- [x] 4.2 A missing required field (e.g. `title`) throws, naming it.
- [x] 4.3 A wrong-typed field (e.g. `pinned` as a string) throws.
- [x] 4.4 Pinned entries sort before unpinned regardless of `publishedAt`.
- [x] 4.5 Same-group entries sort by `publishedAt` descending.
- [x] 4.6 Ordering succeeds on zero, one, and many entries.
- [x] 4.7 `selectAnnouncementLocale` returns the requested locale when
      present.
- [x] 4.8 `selectAnnouncementLocale` falls back to `en` silently when the
      requested locale is absent.
- [x] 4.9 `selectAnnouncementLocale` throws when neither locale is present.

## 5. Verification

- [x] 5.1 Add `"test:cms": "node --test apps/web/lib/cms/*.test.ts"` to
      root `package.json`'s `scripts` — same pattern as `test:content`,
      `test:budgets`, `test:time`.
- [x] 5.2 Run `npm run typecheck`, `npm run lint`, `npm run test:cms`,
      `npm run build -w apps/web`, `npm run check:budgets` — confirm all
      pass with the new files added. Verified: typecheck clean, lint
      clean, 12/12 tests pass, build succeeds, budgets pass (136.0 KB /
      175.0 KB on `/`).
- [x] 5.3 Confirm nothing under `app/[locale]/`, `apps/cms/`, or
      `apps/web/lib/strapi/fetch.ts` was created or modified. Confirmed via
      `git status`/`git diff --stat` — only `apps/web/lib/cms/**`,
      `apps/web/tsconfig.json` (the same `allowImportingTsExtensions`
      addition `git-content-pipeline` made, needed independently here for
      the same reason), and `package.json`'s new `test:cms` line.

## 6. Pages and live fetch (`launch/news`, 2026-10-03)

`site-shell` and `publish-integration` have both merged, so the two blockers below are gone.
Design: "launch/news" in design.md.

- [x] 6.1 `app/[locale]/(news)/` **list** pages, `/en/news` and `/tr/duyurular`. Each is a
      static Server Component in the events/schedule shape (`components/news/page.tsx`,
      `dynamic = "error"`, `dynamicParams = false`, `revalidate = false`), with canonical
      and hreflang via `sectionAlternates("news", …)`. Each announcement renders in full as
      an `<article id={slug}>`: cover image, pinned marker, publication date, title, excerpt,
      body. Zero announcements show an explicit empty message, never a 404.
- [ ] 6.1a **Deferred, not blocked by missing code:** per-slug detail routes. With
      `dynamicParams = false` on every `[locale]` route, a detail page for an announcement
      published after the last deploy would 404 until the next deploy. That's the same
      fallback-false constraint as publish-integration design D2 and its task 6.4.
      Revisit with that locale-routing decision. Until then the list page carries the
      whole announcement, so nothing is unreachable.
- [x] 6.2 Live fetch: `lib/cms/announcements-data.ts` `fetchNewsData()` uses
      `strapiRead(NEWS_CACHE_TAG)` (publish-integration's convention): published only,
      `STRAPI_URL` plus optional `STRAPI_API_TOKEN`, force-cache, tag `announcements`
      (= `CACHE_TAGS.announcements`, asserted in `registry.test.ts`), every pagination page,
      drafts skipped, tr → en fallback via `selectAnnouncementLocale`, ordered via
      `orderAnnouncements`. **No Draft Mode branch**: Announcement preview stays off
      (design.md, "launch/news").
- [x] 6.4 `mapAnnouncement` corrected to the actual schema. `excerpt` and `body` are
      optional and Strapi returns `null` for them. `coverImage` is the `shared.image`
      component (`{ image, altEn, altTr }`), not `{ url }`, and is rendered through
      `toMediaImage`. Tests updated and extended.
- [x] 6.5 `body` (editor Markdown) is rendered by `components/news/body.ts` into
      `MissionProse` blocks. It never throws: unsupported Markdown, images, raw HTML and
      unsafe links degrade to escaped text.
- [x] 6.6 The sitemap lists News only once at least one announcement is published (the
      events rule). The shell navigation already linked `/en/news` and `/tr/duyurular`,
      and is unchanged.
- [x] 6.7 **`announcementDate` is the editorial date; `publishedAt` is never used for
      ordering or display.** Strapi 5 resets `publishedAt` (and `updatedAt`) on every
      republish. Verified on 5.52.3: the published row is deleted and recreated, and only
      `createdAt` survives. So an edited old announcement would jump to the top. The schema
      gains `announcementDate` (datetime, required, non-localized). The mapper requires a
      full date-time and drops `publishedAt`. The order is pinned, then `announcementDate`
      newest first, then `documentId`. The page shows the date **and** 24-hour time in
      Europe/Istanbul via the schedule's formatters, so same-day order is visible. Strapi's
      experimental `firstPublishedAt` was considered and rejected: it's a global experimental
      flag with a database migration. **Supersedes** the `publishedAt` wording of 2.1, 4.4
      and 4.5 above (kept as history).
- [ ] 6.3 **Flagged, not fixed here:** `design/i18n.md`'s incorrect claim
      that Strapi provides silent locale fallback automatically — a
      correction to that shared document is offered as a follow-up
      decision, not made unilaterally as part of this capability.

## 7. Verification (`launch/news`)

- [x] 7.1 Unit tests: `lib/cms/announcements.test.ts`, `lib/cms/announcements-data.test.ts`
      (Tier A `test:cms`), `components/news/body.test.ts` and `components/news/date.test.ts`.
      They cover ordering: old/new, republish, same-day times, pinned, ties. Evidence in the PR.
- [x] 7.3 `tests/news/strapi-order.mjs` (real Strapi, throwaway Postgres, in Tier B news):
      publishing without `announcementDate` fails. After A is edited and republished, Strapi
      gives it a newer `publishedAt` than B, yet News still lists B before A. Same-day later
      time first, pinned first, same order on `/tr`.
- [x] 7.2 `tests/news/check-routes.mjs`: real builds at zero and three announcements against a
      synthetic Strapi, run by `.github/workflows/tier-b-news.yml` (Tier B, not required).
      **Tier A** covers typecheck, lint, the unit tests, the build and the weight budgets.
      **No CI gate checks a live CMS;** that is task 8.1.

## 8. After merge (live; manual)

- [ ] 8.1 Production: `/en/news` and `/tr/duyurular` return 200 with `lang="en"`/`lang="tr"`
      and the empty state (0 published today), and the shell navigation reaches them.
- [ ] 8.2 Publish a test announcement in en and tr: it appears on both pages after
      revalidation (first view may be stale: publish-integration 6.4). Unpublish: it
      disappears from both. Delete the test entry.
- [ ] 8.3 Ordering acceptance: publish two test announcements on the same day at different
      `announcementDate` times. The page shows both times, the later one first. Edit and
      republish the older one: its position and displayed date don't change.
