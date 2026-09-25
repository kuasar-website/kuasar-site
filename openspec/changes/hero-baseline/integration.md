# DEV 5 hero integration handoff — 2026-09-25

Preparation only. Shared PRs remain owned by their authors and merge checker.

## Inspected contracts

- Locale routing is merged. `sectionPath('join', locale)` supplies `/en/join`
  or `/tr/bize-katil`; a mapping alone does not create that destination page.
- PR #15 at `0f9a17240330e243ddc00392b57fd7123cd1c82e` exports `ActionLink`
  from `apps/web/components/ui/action-link.tsx`. Props include required `variant`
  (`primary`, `secondary`, `text`), `href`, children and optional aria-label.
- PR #18 at `1989538eb3fee11260a6eb070a58535a86c5a82a` provides the locale
  layout and `SiteShell`. The shell already contains `main#main-content`.
  Its shared `Wordmark` accepts className; do not take ownership of that file.

## Composition contract after the shared PRs merge

The home owner renders Hero **inside** the shell's main. Hero owns the home h1;
other home sections use h2. Keep `sponsorAction` and `joinAction` as required
server-renderable slots, filled using the shared ActionLink. No new hero-local
button variant and no extra client boundary are needed.

Illustrative composition (not a new production home file):

```tsx
<Hero
  locale={locale}
  sponsorAction={
    <ActionLink variant="secondary" href={sponsorHref}>
      {locale === 'tr' ? 'İletişime geç' : 'Contact us'}
    </ActionLink>
  }
  joinAction={
    <ActionLink variant="primary" href={sectionPath('join', locale)}>
      {locale === 'tr' ? 'Bize katıl' : 'Join us'}
    </ActionLink>
  }
/>
```

The variants above are a proposed use of the shared system, not final visual
approval. Both audiences retain equal-sized layout slots and visible explanatory
copy. Review relative emphasis with the actual shell; primary-plus-secondary is
project guidance, not evidence of an unranked visual result.

## Destination still unresolved

`sponsorHref` must be an actual approved contact destination or sponsorship PDF.
Neither the inspected shell nor the merged segment map defines a contact route.
Do not invent `/contact`, a mailbox, a PDF URL or an empty `#` link. The real join
page must also exist before the CTA is published. Record destinations with the
home owner; do not edit DEV 2's navigation or route ownership to make this example
compile.

## Logo and accessibility

The shared shell mark is now known, but the hero's existing generated inline mark
preserves the same canonical geometry and its larger clear-space layout. Either
retain the verified hero copy or consolidate after the shared mark is merged and
its interface is stable; never modify the original artwork. Avoid a duplicate
main, duplicate home h1, duplicate SVG title IDs or nested navigation landmarks.

## Remaining release checks

1. Apply real shared actions and real destinations through home-composition.
2. Verify both localized homes with the shell: skip link, focus, 320px wrapping,
   two visible audience entry points and reduced motion.
3. Measure actual home first-load JS against 160KB; fixture success is not a
   bundle measurement.
4. Record real-phone LCP below 2.5 seconds and bilingual visual/copy review.
5. Review and ship the static baseline before hero-signature.

The isolated 20 browser tests remain valid for the component, but do not cover
these shared integrations. OpenSpec section 2 remains open.
