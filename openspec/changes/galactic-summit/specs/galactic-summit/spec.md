## Purpose

Present the Galactic Summit in Turkish and English: the current edition, with its
bounded per-year theme, programme, speakers, registration and sponsorship PDF, plus an
archive of other editions. Adding a year must be a data operation, and the page never
claims anything time-relative from build time.

## ADDED Requirements

### Requirement: Localized static Summit route
The system SHALL serve the Summit at `/en/galactic-summit` and `/tr/galactic-summit`. The
segment is the brand name and is unchanged in both locales. The pages SHALL be statically
generated, with no time-based revalidation and no CMS request while a page is served.
Each route SHALL carry the shared shell, a language switcher targeting the other locale's
Summit route, self-canonical and `hreflang` alternates, and the title "Galactic Summit |
KUASAR" in both locales. When the CMS origin is not configured outside production, neither
route SHALL be generated. A production build without a CMS origin SHALL fail explicitly.

#### Scenario: Both locales resolve
- **WHEN** a visitor opens `/en/galactic-summit` or `/tr/galactic-summit`
- **THEN** the page renders in that locale, and the switcher links to the other locale's Summit route

#### Scenario: No request-time CMS dependency
- **WHEN** built Summit pages are served in either locale while the CMS is unreachable
- **THEN** they render from the build output, and no request reaches the CMS

### Requirement: Published editions with locale fallback
The system SHALL load only published Galactic Summit editions at build or revalidation
time, following every pagination page. It SHALL consume only:
- `year`, `date`, `location`, `isCurrent`;
- `purpose`, `programme`, `speakers`, `photos`, `contactAddress`;
- `sponsorshipPdf`, `registrationUrl`;
- `accentToken`, `heroTreatment`, `backgroundImage`.

It SHALL NOT add fields. On the Turkish route, a document's Turkish publication SHALL
replace its English one by `documentId`. A document published only in English SHALL appear
on the Turkish route with its localized text (`purpose`, `programme`, `contactAddress`)
in English, marked `lang="en"`. The English route SHALL show English publications only.

#### Scenario: Draft never shown
- **WHEN** an edition exists only as a draft
- **THEN** it appears on neither locale's route and does not count toward the current-edition invariant

#### Scenario: Missing Turkish translation
- **WHEN** the current edition is published in English but not in Turkish
- **THEN** `/tr/galactic-summit` shows its purpose and programme in English with `lang="en"`, while the interface labels, dates and the registration label are Turkish

### Requirement: Exactly one current edition
Among published editions, exactly one SHALL have `isCurrent` true whenever any edition is
published. The build SHALL fail loudly, naming the years and `documentId`s involved and
pointing to `docs/ops/cms-runbook.md`, when one or more editions are published and none is
current, or when more than one is current. The system SHALL NOT choose an edition
arbitrarily.

#### Scenario: Zero editions
- **WHEN** no edition is published
- **THEN** both routes exist and show "Details of the next Galactic Summit will be announced soon." / "Bir sonraki Galactic Summit'in ayrıntıları yakında duyurulacak.", with no hero, CTA or archive

#### Scenario: One edition
- **WHEN** exactly one edition is published and it is current
- **THEN** both locales show it as the current edition, with no archive section

#### Scenario: Many editions
- **WHEN** several editions are published and exactly one is current
- **THEN** both locales show the current edition first, then every other edition in an archive ordered by `year`, newest first

#### Scenario: No current edition
- **WHEN** editions are published but none has `isCurrent` true
- **THEN** the build fails, naming every published year

#### Scenario: Two current editions
- **WHEN** two published editions both have `isCurrent` true
- **THEN** the build fails, naming both years and `documentId`s

### Requirement: Strict data contract
The system SHALL fail the build with an error that names Strapi, the `documentId`, the
field and the runbook when:
- the CMS is unreachable or unauthorised, or returns a malformed response;
- an edition's `year` is not an integer, or two published editions share a year;
- `isCurrent` is not a boolean;
- `date` is present but not an ISO datetime with an offset;
- `accentToken` or `heroTreatment` is outside its enum;
- `registrationUrl` is present but not an absolute HTTP(S) URL without credentials;
- `sponsorshipPdf` is present but fails the PDF rules;
- a speaker has no `speakerName`;
- a programme item has none of `time`, `title` or `description`;
- the current edition's `heroTreatment` is `still` or `wash` without a `backgroundImage`;
- any image fails the shared media pipeline's rules.

The system SHALL NOT skip an invalid edition or render it degraded.

#### Scenario: Treatment without its image
- **WHEN** the current edition has `heroTreatment` `wash` and no `backgroundImage`
- **THEN** the build fails, naming the edition, `heroTreatment` and `backgroundImage`

#### Scenario: Non-current edition hero fields
- **WHEN** a non-current edition has `heroTreatment` `still` and no `backgroundImage`
- **THEN** the build succeeds, because hero fields render only for the current edition

### Requirement: Bounded per-year theming
The current edition's appearance SHALL vary only by `accentToken`, `heroTreatment` and
`backgroundImage`. `accentToken` SHALL map to the matching existing token:
- `aurora` → `--color-summit-aurora`;
- `ion` → `--color-summit-ion`;
- `violet` → `--color-summit-violet`;
- `ember` → `--color-summit-ember`.

`heroTreatment` SHALL select one of three treatments of a single hero layout:
- `still`: the background image, unmodified;
- `wash`: the background image under an accent wash;
- `gradient`: an accent gradient, over the background image if one is present.

The accent SHALL be applied only to decorative surfaces: the hero wash or gradient, and a
heading rule. It SHALL never colour a button, link, focus ring, state badge or text
carrying meaning. Every edition SHALL use the same components and layout. Hero text SHALL
sit on a solid surface token, never over the image.

#### Scenario: Ember is not mistaken for a state or CTA
- **WHEN** the current edition uses `accentToken` `ember`
- **THEN** the Register CTA still uses the CTA tokens, the Upcoming and Live badges still use the state tokens, and no interactive element or text uses `--color-summit-ember`

#### Scenario: Adding next year is data only
- **WHEN** a 2028 edition is published as current with any permitted accent and treatment
- **THEN** it renders with the existing layout, and no code change is required

### Requirement: Media through the shared pipeline
`backgroundImage`, speaker portraits and `photos` SHALL be rendered only through the
shared media pipeline (`toMediaImage` and `MediaImage`). That gives the approved media
host, reserved dimensions and alt text in the page locale, with the CMS's `altEn`/`altTr`
chosen by the page locale and not the content locale. The capability SHALL NOT add its own
image validation, resizing or loader.

#### Scenario: Turkish alt text on fallback content
- **WHEN** the Turkish route shows an English-fallback edition's photos
- **THEN** each image's alt text is its `altTr`

### Requirement: Sponsorship PDF link
When the current edition has a `sponsorshipPdf`, the system SHALL render "Become a Partner"
/ "İş ortağımız olun" as a Secondary outline link with a visible "(PDF)" marker, opening the
file directly in a new tab. The file SHALL be accepted only if:
- its URL is `https` on the approved media host, with no credentials;
- its path ends in `.pdf`;
- its MIME type is `application/pdf`.

It SHALL never pass through the image resizer. When there is no `sponsorshipPdf`, no
partner link or placeholder SHALL render. Opening the link SHALL call the existing
`trackSponsorshipPdfOpened()` exactly once per activation. No other analytics call SHALL be
added.

#### Scenario: PDF present
- **WHEN** the current edition has a valid PDF and a visitor activates the link in either locale
- **THEN** the PDF opens in a new tab from the media host, and the "Sponsorship PDF opened" event is sent once

#### Scenario: PDF absent
- **WHEN** the current edition has no `sponsorshipPdf`
- **THEN** neither locale shows a partner link, disabled control or placeholder

#### Scenario: PDF on the wrong host
- **WHEN** `sponsorshipPdf` points to the CMS host, `r2.dev` or the R2 S3 endpoint, or is not a PDF
- **THEN** the build fails, naming the edition and `sponsorshipPdf`

### Requirement: Registration CTA or label
When the current edition has a `registrationUrl`, the system SHALL render "Register" /
"Kayıt ol" as the page's single Primary CTA, linking to that URL in a new tab. Its
accessible name SHALL include the edition and the new-tab behaviour. When it is null, the
system SHALL render the non-interactive text "Registration opens soon" / "Kayıtlar
yakında". It SHALL NOT render a disabled or greyed-out control.

#### Scenario: Registration closed
- **WHEN** the current edition has no `registrationUrl`
- **THEN** both locales show the label as plain text, with no link, button, `disabled` or `aria-disabled` element

#### Scenario: Registration open
- **WHEN** `registrationUrl` is set
- **THEN** both locales show the Primary Register link to that URL, opening in a new tab

### Requirement: Sponsors are not rendered
The system SHALL NOT request, render or link sponsor data on the Summit route. The sponsors
showcase is held until trademark permission is recorded per sponsor, and the existence of
the CMS relation SHALL NOT be treated as permission.

#### Scenario: Relation populated in the CMS
- **WHEN** the current edition has sponsors related in the CMS
- **THEN** the Summit request does not populate `sponsors`, and neither locale contains any sponsor name, logo or sponsor section

### Requirement: Neutral date with client-derived Upcoming or Live state
The server-rendered page and the first client render SHALL show the current edition's
`date` as a neutral localized date in the Europe/Istanbul calendar, with the raw ISO value
in a `datetime` attribute. When the date is absent, they SHALL show "Date to be announced" /
"Tarih yakında açıklanacak". They SHALL contain no badge, state attribute or styling derived from
the current time.

After mount, the browser SHALL compare the Europe/Istanbul calendar day of its own clock
with the Istanbul calendar day of `date`:
- **before** the Summit's day: an "Upcoming" / "Yaklaşan" text badge, styled with the
  upcoming state token;
- **on** the Summit's day, from Istanbul midnight to the next Istanbul midnight: a "Live" /
  "Şimdi" text badge, styled with the live state token;
- **after** the Summit's day: no badge, and the page stays neutral.

The comparison SHALL NOT depend on the device's time zone. The system SHALL NOT invent an
end time or duration, and SHALL NOT require any CMS field beyond `date`. A missing or
invalid `date` SHALL show no badge. Archive editions SHALL show neutral dates only. The
badge SHALL update while the page is open, without a reload.

#### Scenario: Old build opened on and after the Summit day
- **WHEN** HTML built in August is opened on the Summit's Istanbul day and again the day after, in either locale
- **THEN** hydration matches the neutral HTML, the badge reads Live on the day, and no badge appears the day after, without a rebuild

#### Scenario: Before the Summit
- **WHEN** a visitor opens either locale before the Summit's Istanbul day
- **THEN** the Upcoming badge appears after mount as text, not by colour alone

#### Scenario: Istanbul midnight boundary
- **WHEN** the Summit is on 7 November and the browser clock passes `2026-11-06T21:00:00Z` (00:00 on 7 November in Istanbul) while the page is open, on a device set to America/New_York
- **THEN** the badge changes from Upcoming to Live, and from `2026-11-07T21:00:00Z` it disappears

#### Scenario: Server output stays neutral
- **WHEN** the built HTML for either locale is inspected
- **THEN** it contains neither badge text nor any `data-time-state` attribute

### Requirement: Bilingual interface copy
The Summit's fixed strings SHALL be exactly the following. Brand names (Galactic Summit,
Stellar Talk, Nebula Night) stay English in both locales, marked `lang="en"` on the Turkish
route.

| Purpose | en | tr |
| --- | --- | --- |
| Page title (metadata) | Galactic Summit \| KUASAR | Galactic Summit \| KUASAR |
| Current edition heading (h1) | Galactic Summit {year} | Galactic Summit {year} |
| Date label | Date | Tarih |
| Location label | Location | Yer |
| No date | Date to be announced | Tarih yakında açıklanacak |
| Upcoming badge | Upcoming | Yaklaşan |
| Live badge | Live | Şimdi |
| Register CTA (visible) | Register | Kayıt ol |
| Register accessible name | Register for Galactic Summit {year} (opens in a new tab) | Galactic Summit {year} için kayıt ol (yeni sekmede açılır) |
| Registration not yet open | Registration opens soon | Kayıtlar yakında |
| Partner link (visible) | Become a Partner (PDF) | İş ortağımız olun (PDF) |
| Partner accessible name | Become a Partner: sponsorship file (PDF, opens in a new tab) | İş ortağımız olun: sponsorluk dosyası (PDF, yeni sekmede açılır) |
| Section heading: programme | Programme | Program |
| Section heading: speakers | Speakers | Konuşmacılar |
| Section heading: photos | Photos | Fotoğraflar |
| Section heading: contact | Contact | İletişim |
| Archive heading | Other editions | Diğer yıllar |
| Archive edition heading (h3) | Galactic Summit {year} | Galactic Summit {year} |
| Archive photo list (accessible label) | Photos from Galactic Summit {year} | Galactic Summit {year} fotoğrafları |
| Zero editions | Details of the next Galactic Summit will be announced soon. | Bir sonraki Galactic Summit'in ayrıntıları yakında duyurulacak. |

The current edition's programme, speakers and photos lists are labelled by their section
headings (`aria-labelledby`), so they need no extra strings. The "↗" external-link marker
is `aria-hidden`, because the accessible names above already state the new-tab behaviour.

#### Scenario: Turkish page keeps the brand
- **WHEN** a visitor opens `/tr/galactic-summit`
- **THEN** the heading reads "Galactic Summit {year}", with the brand marked `lang="en"`, and every other fixed string is the Turkish column

### Requirement: Accessible structure
The page SHALL have one `h1` (the current edition, "Galactic Summit {year}"), with `h2`s
for the present sections and `h3`s for archive editions. Programme items SHALL be an
ordered list, and `time` SHALL be shown as text, because it is free text and not a
datetime. Photos SHALL be a labelled list of figures. Speakers SHALL be a list, with each
portrait's alt text from the media pipeline. External links SHALL announce that they open
in a new tab. No meaning SHALL depend on colour alone. Focus SHALL always be visible.
Sections without data SHALL be omitted, not rendered empty.

#### Scenario: Sparse edition
- **WHEN** the current edition has no programme, speakers, photos or contact address
- **THEN** those headings are absent in both locales, and the heading order has no gaps

### Requirement: No motion
The Summit page SHALL introduce no animation. Hero treatments are static compositions, and
links use only the existing L3 interaction primitives.

#### Scenario: Reduced motion
- **WHEN** a visitor with `prefers-reduced-motion: reduce` opens either locale
- **THEN** the page is identical to the default, and no element animates beyond the shared primitives' disabled states

#### Scenario: Mobile fallback
- **WHEN** a visitor below `md` opens either locale
- **THEN** the hero renders as the same static treatment with no horizontal scroll from 320px, and nothing animates

### Requirement: Summit verification
A path-filtered Tier B check on pull requests to `main` SHALL run:
- unit tests for loading, the current-edition invariant, validation, enum mapping, PDF
  rules, locale fallback and the Istanbul calendar-day state;
- browser tests in both locales, covering:
  - the no-JS neutral HTML and the controlled-clock Upcoming/Live badge, including the Istanbul midnight boundary under several device zones;
  - Register as a link versus the plain label, and the partner link present versus absent;
  - the analytics call on PDF activation;
  - sponsor absence and each theme treatment;
  - 320px and desktop widths, reduced motion, and axe;
- production builds against a synthetic CMS that assert prerendering, no CMS requests
  while serving, and the invariant failures.

#### Scenario: Server-frozen time regression
- **WHEN** a change renders the Upcoming or Live badge, or any time-relative claim, in server HTML
- **THEN** the check fails
