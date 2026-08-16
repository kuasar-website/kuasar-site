# Brand

Voice, wordmark, typography, photography.

- **Last updated:** 2026-08-15
- **Related:** [tokens.md](tokens.md), [motion.md](motion.md), [i18n.md](i18n.md)

## Voice

KUASAR is a student team that builds rockets and flies them at TEKNOFEST and the Spaceport
America Cup. The voice follows from that: **specific, plain, and unembarrassed about being
students.**

- **Lead with facts.** "Apogee 3,048 m, Spaceport America Cup 2025" beats "pushing the
  boundaries of student rocketry." A sponsor evaluating whether to fund this team is
  looking for evidence, and a judge is looking for precision.
- **Never inflate.** No "revolutionary," no "cutting-edge," no "passionate team of
  innovators." A failed launch described honestly is more credible than a success
  described breathlessly — and the audience includes people who can tell.
- **Short sentences.** Most readers are on a phone, and half are reading their second
  language.
- **Name things.** Propulsion, Avionics, Structures, Software are real disciplines with
  real people. Say which team did what.
- **Turkish is not a translation of English.** Write it as Turkish. See
  [i18n.md](i18n.md).

Where the two audiences diverge: sponsors need **evidence and reach**, prospective members
need **what you would actually do here**. Everyone else is served by the site being
credible, which is the same thing as the above.

## Wordmark

The wordmark is committed at **`apps/web/public/brand/kuasar-wordmark.svg`**, so a fresh
clone has it. Next.js serves `public/` from the root, so its URL is
`/brand/kuasar-wordmark.svg`. It is the only file under `apps/web/` — the workspace itself
is not scaffolded yet.

### It inherits colour. Never hardcode a fill.

Every path in the file is `fill="currentColor"` / `stroke="currentColor"`, so the mark takes
the CSS `color` of whatever contains it. Set that to `--color-ink` on dark and
`--color-ink-inverted` on light, per the rules below.

**This is load-bearing rather than tidy.** The delivered vector was `fill="black"`, and this
site's canvas is dark navy through near-black — a black wordmark on it is not "slightly low
contrast", it is invisible. The failure would have appeared the first time the logo was
placed in the hero and looked like a broken asset path rather than a colour bug. If anyone
re-exports from the design tool, **re-apply `currentColor` before committing**; design tools
export literal colours and will silently reintroduce this.

Only colour attributes were changed. The path geometry is byte-identical to the delivered
file — this is artwork, and the rule below about not re-typesetting applies to editing it
too.

### Clear space, in real numbers

The rule below is "clear space equal to the height of the K". In the file's own coordinates
the K is **86 units tall** in a **311 × 125** viewBox, so:

> **Clear space ≈ 0.28 × the rendered width of the logo, on all four sides.**

At the 120px minimum width that is ~34px of untouched space around it. The viewBox carries
about 15 units of incidental padding, which is nowhere near enough — clear space has to come
from layout, not from the asset.

### Still outstanding: the editable source

**Its source file is not recorded anywhere**, and an SVG export cannot be edited back into
one. Record in [../docs/HANDOVER.md](../docs/HANDOVER.md) which design tool holds it, which
account owns it, and where the file lives. A logo whose source exists only in one member's
Figma or Illustrator is a logo the club loses the year they graduate — and this one is now
one export away from being unmaintainable.

Rules:

- **Clear space** on all sides equal to the height of the K. Nothing enters it.
- **Minimum size** 120px wide on screen. Below that, use the mark alone if one exists,
  never a shrunken wordmark.
- **The wordmark is one colour**: `--color-ink` on dark, `--color-ink-inverted` on light.
- **Never** stretch, rotate, recolour to an accent, outline, add a shadow, or place it on
  a busy photograph without a scrim.
- **Do not re-typeset it.** The wordmark is artwork, not text set in the display face.
  Where a heading needs to read "KUASAR," that is type; where the logo appears, that is
  the asset.

The home hero uses the wordmark large and bold on the left, with "Koç University
Association of Space & Rocketry" beneath it ([motion.md](motion.md)).

There is **no university approval process** for the wordmark and no university brand rules
to satisfy — this site is independent of Koç University's infrastructure and identity.

## Typography

Two tiers. **Display: Orbitron. Body: Inter.**

The display face is used **only** for large headings and short labels. **Never for
paragraph text** — Orbitron is a geometric display face and becomes unreadable at body
sizes and body lengths.

### The Turkish glyph restriction — a correctness rule, not a style rule

**Orbitron does not cover the full Turkish alphabet.** Verified 2026-08-16 against Google
Fonts' coverage metadata for Orbitron v35, not inferred: the family ships **one** subset,
`latin`, and there is no `latin-ext` variant to request. Five Turkish characters are simply
absent from the font.

| Characters | Codepoints | Status |
| --- | --- | --- |
| `ç Ç ö Ö ü Ü` | U+00E7 U+00C7 U+00F6 U+00D6 U+00FC U+00DC | **Safe** — Latin-1 Supplement |
| `ı` | U+0131 | **Safe** — explicitly in Orbitron's `latin` subset |
| `ğ Ğ ş Ş İ` | U+011F U+011E U+015F U+015E U+0130 | **Missing** — not in the font at all |

> **Any heading or label containing `ğ Ğ ş Ş İ` is set in Inter, not Orbitron.**

**Note that `ı` is safe and is deliberately not in that list.** Dotless i is part of the
standard `latin` subset, so `Bize Katıl` and `Hakkımızda` render correctly in Orbitron. An
earlier draft of this document listed six at-risk characters; it was wrong about this one,
and over-applying the rule costs display-face presence for no reason.

A fallback glyph mid-word at 64px is unmissable, and it is **the Turkish half of the site
that will break while the English half is the half that gets tested.** Record it as a
rule rather than relying on it being noticed.

**How this was checked, and how to re-check it** if the font is ever updated or swapped:

```bash
curl -s "https://fonts.google.com/metadata/fonts/Orbitron" | head -c 400
```

The `coverage.latin` list is decimal codepoints. `305` is `ı`; `286/287` (`Ğ ğ`),
`350/351` (`Ş ş`) and `304` (`İ`) are absent. If a future version adds them, delete this
section rather than keeping a rule that no longer applies.

### Navigation is set in Inter, in both locales

**The reason is legibility, not glyph coverage.** That distinction matters, because the
glyph argument that used to sit here does not hold.

Every Turkish navigation label is in fact safe in Orbitron — **Hakkımızda, Takvim,
Görevler, Etkinlikler, Projeler, Mezunlar, Bize Katıl, Duyurular** contain only `ö`, `ı`
and ASCII, all of which the font covers. The navbar never trips the restriction above.

The real argument is the one this document already makes about the display face: Orbitron
is geometric and **becomes unreadable at body sizes**. Navigation labels sit at 14–16px,
which is body-size territory, not heading territory. So the navbar is Inter because small
Orbitron is hard to read, and the display face is reserved for section headings and the
hero — where it has more effect anyway.

Two consequences worth keeping:

- **Both locales match.** Whatever the reason, setting the navbar per-label would mean the
  typeface changing when a visitor switches language, which reads as a bug rather than as
  a design.
- **The nav is immune to a future label that would trip the rule.** `İletişim` — Connect
  Us — contains both `İ` and `ş` and would break in Orbitron. Because the navbar is Inter
  unconditionally, adding it later cannot introduce the failure.

### Inter is a deliberate override of impeccable's guidance

The `impeccable` design skill names Inter among fonts to avoid, as an AI-generated-design
tell. **That guidance is overridden here, deliberately and with a reason:** Inter's
Turkish glyph coverage is complete, and this is a bilingual site whose display face
already cannot be trusted with Turkish.

A body face that cannot render half the site's content is not a stylistic question.

**Do not re-open this on every critique run.** It is recorded here so that
`/impeccable critique` output flagging Inter can be dismissed with a pointer to this
paragraph rather than re-litigated each time. Both faces may be revisited later; neither
is load-bearing on any other decision.

## Colour, in brand terms

Full tokens in [tokens.md](tokens.md). The brand-level rules:

- **The base is dark navy through near-black**, with graphite and fume surfaces. This is a
  night-sky site, and it should feel like one.
- **Purple and orbital blue are accents** — emphasis and depth only. They are not
  decoration and they are not a gradient.
- **Orange is semantic and reserved**: launch, ignition, live, upcoming, and the primary
  CTA. If a proposed use of orange is none of those, it is wrong regardless of how it
  looks.

### The anti-gaming rule

> **No global neon, no glow, no gradient washes. The site must not read as "gaming."**

Space, rockets and a dark palette make this the default failure mode, and it is the one
that most damages the sponsor audience — a serious engineering team that presents like a
Twitch overlay reads as students playing at it.

What keeps it on the right side of that line: **generous whitespace, clean typography,
controlled accent.** When a section feels flat, the fix is more space and better
hierarchy, not more glow.

## Photography

Photography is the site's strongest asset and its heaviest. Treat it as content, not as
decoration.

- **Real photographs of real hardware and real people.** No stock rockets, no stock
  laboratories, no AI-generated imagery. A slightly blurry photo of an actual launch beats
  a perfect photo of somebody else's.
- **Prefer the moment over the pose.** Assembly, integration, the pad, the recovery walk.
  Group photos are for Alumni, not for the hero.
- **Dark and high-contrast**, so images sit inside the palette rather than fighting it.
  Photographs that are bright and flat will look pasted on against
  `--color-canvas`.
- **Faces need consent**, and for alumni it is a required field
  ([content-model.md](content-model.md)).
- **Every image needs alt text in both locales.** The accessibility gate in
  [../docs/adr/0004-verification.md](../docs/adr/0004-verification.md) enforces presence;
  only a human can enforce that it is useful. "Rocket" is not alt text.
- **Originals are the system of record**, not the R2 bucket
  ([ADR 0002](../docs/adr/0002-cms.md)). Keep them in the team's own archive.

## Buttons

Exactly three interaction types site-wide, with no component-local variants. They are
specified with their motion in [motion.md](motion.md) rather than duplicated here — a
button's look and its hover behaviour are one decision, and splitting them across two
documents is how they drift apart.
