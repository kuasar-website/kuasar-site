## Purpose

The public, bilingual Project Platform page: it explains the platform, invites visitors into
its WhatsApp group, lists its functions, and shows KUASAR's current and past non-rocket space
and aerospace projects from Strapi, with an application link where one is open.

## ADDED Requirements

### Requirement: The page has localized routes and the full product name
The page SHALL be served at `/en/projects` and `/tr/projeler`, statically generated. Its
`<h1>` and its primary navigation label SHALL be the full product name: "Project Platform" in
English and "Proje Platformu" in Turkish. `/tr/projects` and `/en/projeler` SHALL NOT be
routes. Each locale's page SHALL carry a self-referencing canonical URL and hreflang
alternates for `en`, `tr` and `x-default` (the English URL). The language switcher SHALL move
between the two paths. The page SHALL NOT be shown when the CMS is not configured outside
production, and a production build without the CMS SHALL fail.

#### Scenario: English route
- **WHEN** a visitor opens `/en/projects`
- **THEN** the page returns 200 with `<html lang="en">`, the heading "Project Platform", and the navigation entry "Project Platform" linking to `/en/projects`

#### Scenario: Turkish route
- **WHEN** a visitor opens `/tr/projeler`
- **THEN** the page returns 200 with `<html lang="tr">`, the heading "Proje Platformu", and the navigation entry "Proje Platformu" linking to `/tr/projeler`

#### Scenario: Mixed paths are not routes
- **WHEN** a visitor opens `/tr/projects` or `/en/projeler`
- **THEN** the response is 404

#### Scenario: Switching language
- **WHEN** a visitor on `/en/projects` uses the language switcher, and then switches back
- **THEN** they reach `/tr/projeler`, and then `/en/projects` again

#### Scenario: Canonical and alternates
- **WHEN** either locale's page is rendered
- **THEN** its canonical URL is its own path, and it lists `/en/projects` as `en` and `x-default` and `/tr/projeler` as `tr`

### Requirement: The intro and WhatsApp call to action come from the Project Platform entry
The page SHALL show the Project Platform entry's `intro` as formatted text under the heading.
It SHALL show a WhatsApp button, opening in a new tab, only when `whatsappUrl` is an HTTPS
link to `whatsapp.com`, one subdomain of it, or `wa.me`, with a non-empty path and no
credentials. The button text SHALL be the entry's `whatsappLabel` when it is not blank, and
otherwise "Join the Project Platform WhatsApp group" in English and "Project Platform
WhatsApp grubuna katıl" in Turkish. When no Project Platform entry is published for the page
(after the Turkish fallback below), the page SHALL still return 200 with its heading and its
project sections, and SHALL show no intro, no WhatsApp button and no functions section.
Editor Markdown in `intro` SHALL never break the page: unsupported syntax and raw HTML are
shown as escaped text, never injected.

#### Scenario: Intro with a WhatsApp link and label
- **WHEN** the entry has an intro, a valid `whatsappUrl` and a `whatsappLabel` in the page's locale
- **THEN** the page shows the intro and a WhatsApp button with that label, linking to `whatsappUrl` in a new tab

#### Scenario: No label
- **WHEN** the entry has a valid `whatsappUrl` and a blank `whatsappLabel`
- **THEN** the button reads "Join the Project Platform WhatsApp group" on `/en/projects` and "Project Platform WhatsApp grubuna katıl" on `/tr/projeler`

#### Scenario: No WhatsApp link
- **WHEN** the entry has no `whatsappUrl`
- **THEN** the page shows the intro and no WhatsApp button

#### Scenario: An invalid WhatsApp link
- **WHEN** the CMS returns a `whatsappUrl` that is not an HTTPS WhatsApp link, for example `http://` or another host
- **THEN** the page shows no WhatsApp button, and the build does not fail

#### Scenario: No published entry
- **WHEN** the Project Platform entry is not published in either locale
- **THEN** both pages return 200 with their heading and project sections, and show no intro, no WhatsApp button and no functions section

### Requirement: The platform's functions keep the editor's order
The page SHALL list the entry's `features`, each with its title and description, in the order
the editor saved them for that locale. When there are no features, the page SHALL omit the
functions section entirely, heading included.

#### Scenario: Zero functions
- **WHEN** the entry is published with no features
- **THEN** the page has no functions section

#### Scenario: One function
- **WHEN** the entry has one feature
- **THEN** the functions section shows that feature's title and description

#### Scenario: Many functions in each locale's order
- **WHEN** the English entry has four features and the Turkish entry has three, in a different order
- **THEN** `/en/projects` shows the four in the English order and `/tr/projeler` shows the three in the Turkish order

### Requirement: Current projects show their application link only when it is valid
The page SHALL have a current-projects section listing exactly the published Platform
Projects whose `projectStatus` is `current`, each with its title, summary, cover image when
one is set, and its years. A project SHALL show an Apply button ("Apply" in English, "Başvur"
in Turkish), opening in a new tab, only when its `applicationUrl` is an absolute HTTPS URL
without credentials. With no current project, the section SHALL show a localized empty
message. A project without a cover image SHALL render as a text-only card with no empty
image slot.

#### Scenario: Zero current projects
- **WHEN** no published project is `current`
- **THEN** the section shows its empty message: "There are no current projects right now." in English and "Şu anda güncel proje yok." in Turkish

#### Scenario: One current project with an application link
- **WHEN** one current project has an HTTPS `applicationUrl`
- **THEN** its card shows an Apply / Başvur button to that URL, opening in a new tab

#### Scenario: A current project without an application link
- **WHEN** a current project has no `applicationUrl`
- **THEN** its card shows no application button

#### Scenario: An invalid application link
- **WHEN** the CMS returns an `applicationUrl` that is not an absolute HTTPS URL
- **THEN** the card shows no application button, and the build does not fail

#### Scenario: Many current projects, with and without covers
- **WHEN** several current projects are published, some with a cover image and some without
- **THEN** each appears once, covered cards show their image with alt text in the page's locale, and uncovered cards show no image slot

### Requirement: Past projects never show an application link
The page SHALL have a past-projects section listing exactly the published Platform Projects
whose `projectStatus` is `past`, with the same fields as current projects and never an
application button. With no past project, the section SHALL show a localized empty message.

#### Scenario: Zero past projects
- **WHEN** no published project is `past`
- **THEN** the section shows its empty message: "There are no past projects yet." in English and "Henüz geçmiş proje yok." in Turkish

#### Scenario: A past project with an application link
- **WHEN** a past project has an HTTPS `applicationUrl`
- **THEN** its card shows no application button

#### Scenario: Many past projects
- **WHEN** several past projects are published
- **THEN** each appears once in the past-projects section and in no other section

### Requirement: Sections follow projectStatus and are ordered by year, then title
Which section a project is in SHALL be decided only by `projectStatus`, never by `startYear`,
`endYear` or the current date. Within each section, projects SHALL be ordered by `startYear`,
newest first, then by title in the page locale's collation, then by a stable identifier, so
the order is the same on every build. The years are plain server-rendered text with no
client-derived past/live/upcoming state: `startYear` alone when there is no `endYear` or it
equals `startYear`, otherwise `startYear–endYear` with an en dash.

#### Scenario: Status, not years
- **WHEN** a project marked `current` has an `endYear` in the past, and a project marked `past` has no `endYear`
- **THEN** the first is in current projects and the second in past projects

#### Scenario: Ordering
- **WHEN** a section holds projects starting in 2024, 2026 and 2026, titled "Beta" and "Alpha" for the two 2026 projects
- **THEN** the order is Alpha (2026), Beta (2026), then the 2024 project

#### Scenario: Year display
- **WHEN** projects have only `startYear` 2025, `startYear` and `endYear` both 2025, and `startYear` 2024 with `endYear` 2026
- **THEN** they show "2025", "2025" and "2024–2026", identically in both locales and without client-side state

#### Scenario: An end year before the start year
- **WHEN** the CMS returns a project whose `endYear` is before its `startYear`
- **THEN** the build fails with an error naming the project and the field, and a previously generated page keeps being served

### Requirement: Turkish falls back to English, marked as English
On `/tr/projeler`, the Project Platform entry and each project SHALL use their Turkish
version when one is published and otherwise, silently, their English version. Any block shown
in English on the Turkish page SHALL carry `lang="en"`. `/en/projects` SHALL never show a
Turkish-only entry or project. Image alt text and interface copy SHALL always be in the
page's locale.

#### Scenario: English-only project on the Turkish page
- **WHEN** a project is published in `en` only
- **THEN** `/tr/projeler` shows its English title and summary in a card marked `lang="en"`, with Turkish interface copy and Turkish alt text

#### Scenario: English-only page content on the Turkish page
- **WHEN** the Project Platform entry is published in `en` only
- **THEN** `/tr/projeler` shows the English intro and functions marked `lang="en"`, and the Turkish heading and section headings

#### Scenario: Turkish-only content never reaches English
- **WHEN** a project or the Project Platform entry is published in `tr` only
- **THEN** `/en/projects` does not show it

### Requirement: The page reads published content only and changes through revalidation
The page SHALL read only published content, at build time or on revalidation, never per
visitor request, and SHALL NOT use time-based revalidation. A publish, unpublish, edit or
delete of either content type in Strapi SHALL reach both locales' pages and the sitemap
through the existing publish webhook. Editor preview SHALL NOT be offered for either type: a
visitor in another section's preview mode SHALL still see published content. When the CMS is
unreachable, refuses the read, or returns content that breaks the content model (a missing
required field, an unknown `projectStatus`, an invalid image, an end year before the start
year), the build or revalidation SHALL fail with an error naming the problem, so the
previously generated page keeps being served.

#### Scenario: Drafts are never public
- **WHEN** a project or the Project Platform entry exists only as a draft
- **THEN** neither page shows it

#### Scenario: A publish reaches both locales
- **WHEN** an editor publishes or unpublishes a Platform Project or the Project Platform entry
- **THEN** both pages and the sitemap are revalidated, without a deploy

#### Scenario: No request-time reads
- **WHEN** visitors open either page after a build
- **THEN** no request reaches the CMS

#### Scenario: The CMS refuses the read
- **WHEN** the CMS answers a read with an authorization error
- **THEN** the build fails with an error pointing at the CMS runbook

### Requirement: The page is indexed and in the sitemap once it has content
The page SHALL be indexable. The sitemap SHALL list `/en/projects` and `/tr/projeler`, with
hreflang alternates, only when the page has content for that locale: a published Project
Platform entry or at least one published project, after the Turkish fallback. The navigation
SHALL link to the page in both locales whether or not it has content.

#### Scenario: Empty
- **WHEN** nothing is published for either type
- **THEN** both pages render with their empty states, the navigation links to them, and the sitemap lists neither

#### Scenario: Populated
- **WHEN** at least one project, or the Project Platform entry, is published in English
- **THEN** the sitemap lists both `/en/projects` and `/tr/projeler` with alternates
