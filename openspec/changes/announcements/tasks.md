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

## 6. Explicitly blocked — not attempted

- [ ] 6.1 **Blocked by `site-shell`:** `app/[locale]/(news)/` list and
      detail pages. No `app/[locale]/` directory exists yet; not created
      here even as a placeholder.
- [ ] 6.2 **Blocked by `publish-integration`:** the live fetch function,
      its base-URL environment variable, and revalidation tags. No such
      convention exists anywhere in the codebase yet; not invented here.
- [ ] 6.3 **Flagged, not fixed here:** `design/i18n.md`'s incorrect claim
      that Strapi provides silent locale fallback automatically — a
      correction to that shared document is offered as a follow-up
      decision, not made unilaterally as part of this capability.
