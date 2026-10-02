## ADDED Requirements

### Requirement: The server-rendered document language is the route's locale
Every page under a locale prefix SHALL be server-rendered with `<html lang>` equal to that
locale: `lang="en"` under `/en`, `lang="tr"` under `/tr`. The value SHALL be present in the
statically generated HTML, not set by client script, and SHALL NOT require dynamic
rendering. A URL that matches no locale route SHALL return 404 with a document that has a
`lang` attribute and shows both languages, each tagged with its own `lang`.

#### Scenario: English home
- **WHEN** a visitor requests `/en`
- **THEN** the response is 200 and the HTML contains `<html lang="en"`

#### Scenario: Turkish home
- **WHEN** a visitor requests `/tr`
- **THEN** the response is 200 and the HTML contains `<html lang="tr"`

#### Scenario: Localized section pages
- **WHEN** a visitor requests `/en/events` or `/tr/etkinlikler`
- **THEN** the HTML contains `<html lang="en"` or `<html lang="tr"` respectively

#### Scenario: Bare root still redirects
- **WHEN** a visitor requests `/`
- **THEN** the response is a 307 redirect to `/en`

#### Scenario: Locale routes stay static
- **WHEN** the site is built
- **THEN** `/en`, `/tr` and every localized route are prerendered (SSG), not server-rendered on demand

#### Scenario: URL outside any locale route
- **WHEN** a visitor requests `/some-garbage`, `/tr/olmayan-sayfa` or an unknown mission slug
- **THEN** the response is 404, the document has a `lang` attribute, and it shows a Turkish block tagged `lang="tr"` linking to `/tr` and an English block linking to `/en`
