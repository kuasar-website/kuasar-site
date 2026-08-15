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

`ASSUMPTION:` a vector wordmark exists. Commit it to `apps/web/public/brand/` and record
its source file's location in [../docs/HANDOVER.md](../docs/HANDOVER.md) — a logo that
exists only in one member's design tool is a logo the club loses.

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

**Orbitron does not cover the full Turkish alphabet.** Its coverage is Basic Latin plus
Latin-1 Supplement plus only **8** glyphs from Latin Extended-A. That means:

| Characters | Status |
| --- | --- |
| `ç Ç ö Ö ü Ü` | **Safe** — Latin-1 Supplement, covered |
| `ğ Ğ ş Ş ı İ` | **At risk** — Latin Extended-A, likely missing |

> **Any heading or label containing `ğ Ğ ş Ş ı İ` is set in Inter, not Orbitron.**

A fallback glyph mid-word at 64px is unmissable, and it is **the Turkish half of the site
that will break while the English half is the half that gets tested.** Record it as a
rule rather than relying on it being noticed.

`ASSUMPTION:` verify the shipped font file's actual coverage before launch rather than
trusting the summary above, and if Orbitron turns out to cover all six, delete this
section rather than keeping a rule that no longer applies.

### The consequence: navigation is set in Inter, in both locales

The Turkish navigation reads **Görevler, Etkinlikler, Bize Katıl, Mezunlar** — short
labels, which is exactly what the display face is for, and containing exactly the
at-risk characters.

Applied naively, the rule above would set the English navbar in Orbitron and the Turkish
navbar in Inter: two navigations in two different typefaces, which reads as a bug.

`ASSUMPTION:` **navigation is set in Inter in both locales.** The two halves match, the
restriction cannot be tripped in the component most likely to trip it, and the display
face is reserved for section headings and the hero — where it has more effect anyway.
Correct this if you would rather accept the mixed navigation.

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
