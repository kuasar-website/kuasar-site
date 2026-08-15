## What and why

<!-- One or two sentences. Link the OpenSpec change if there is one. -->

## Type

- [ ] Content only (data — no component or layout edits)
- [ ] Frontend code
- [ ] CMS schema or configuration
- [ ] Infrastructure, CI, or documentation

---

## Checklist

Delete any section that genuinely does not apply. Do not delete a section because it is
inconvenient.

### Always

- [ ] Both locales are handled — Turkish and English, not one with the other to follow
- [ ] No new runtime dependency, or the PR explains why one is justified
- [ ] No third-party analytics, embed, pixel or tag manager added
      (KVKK is unresolved — see [ADR 0002](../docs/adr/0002-cms.md))
- [ ] Nothing computes "now" on the server — time-relative state is derived in the browser
      ([ADR 0001](../docs/adr/0001-stack.md))

### If content was added

- [ ] Adding this record required **no** component or layout edit
- [ ] The entity lives entirely in git **or** entirely in Strapi, never split across both
- [ ] The collection still renders sensibly with zero, one, and fifty entries
- [ ] Alumni only: consent for the photograph and LinkedIn URL is recorded on the record

### If motion changed

- [ ] **Screen recording attached.** The reviewer watches it — feel is not automatable
- [ ] Motion tier stated: L1 / L2 / L3, and the route it lives on
- [ ] L3 and L2 use **no** animation library
- [ ] A genuine non-animated `prefers-reduced-motion` path exists — not a faster version
- [ ] Mobile fallback stated
- [ ] The un-animated baseline works on its own and shipped first
- [ ] GSAP only: `useGSAP` with a `scope`, `contextSafe` for post-mount handlers, cleanup
      verified

### If a route was added or changed

- [ ] `hreflang` and `canonical` are correct for both locales
- [ ] The language switcher preserves the route rather than dumping the user on the home
      page
- [ ] Run `/impeccable critique` against the new route
- [ ] First-load JS is within budget for this route ([design/motion.md](../design/motion.md))

---

## Recording / screenshots

<!-- Required for any motion change. A short screen capture is enough. -->

## Notes for the reviewer

<!-- Anything you are unsure about, or that you want a second opinion on. -->
