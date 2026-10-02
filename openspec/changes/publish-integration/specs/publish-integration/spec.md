## Purpose

Keep the statically generated site truthful after editors publish in Strapi, and let
editors preview drafts safely. It provides on-demand revalidation from Strapi webhooks,
editor preview through Draft Mode, and one registry and fetch convention that every Strapi
loader uses. It never adds a cron, never adds time-based revalidation, and never fetches
Strapi in the public request path.

## ADDED Requirements

### Requirement: Authorised revalidation endpoint
The system SHALL expose `POST /api/revalidate`. It SHALL accept a request only when a
request header carries a secret equal to `REVALIDATE_SECRET`, compared in constant time.
Requests without it, with a wrong value, with the secret only in the query string, with any
method other than POST, or with an unparseable body SHALL be rejected (401, 405 or 400),
and nothing SHALL be revalidated. The response and logs SHALL never contain the secret.

#### Scenario: Unauthenticated call
- **WHEN** a request reaches `/api/revalidate` without the secret header, or with a wrong one
- **THEN** it receives 401, and no tag or path is revalidated

#### Scenario: Secret in the query string only
- **WHEN** a request sends `?secret=<correct value>` but no secret header
- **THEN** it receives 401

### Requirement: Revalidation on publish, update, unpublish and delete
For an authorised Strapi webhook whose event is `entry.publish`, `entry.unpublish`,
`entry.update`, `entry.delete` or `entry.create`, the system SHALL call
`revalidateTag(tag, 'max')` for every cache tag that the registry maps to the event's
model uid, which covers every route and the sitemap that fetched with that tag, in both
locales. It SHALL NOT call `revalidatePath` on the fallback-false localized content routes,
where a hard path expiry produces a persistent 404 (design D2). After a successful webhook, the next request for
an affected page SHALL return the changed content: publish in Strapi, wait seconds, reload
the public page, and the change is visible. For `media.update` and `media.delete`, it SHALL revalidate
every registered tag. For a model the registry does not map, or one deliberately without
public output (Sponsor, while the showcase is held), it SHALL respond 200 with nothing
revalidated, and SHALL NOT fail. The single-argument `revalidateTag(tag)` form SHALL NOT
be used.

#### Scenario: Publish a Schedule Event
- **WHEN** Strapi sends an authorised `entry.publish` for `api::schedule-event.schedule-event`
- **THEN** the `schedule-calendar` tag is revalidated with the `max` profile, covering `/en/schedule`, `/tr/takvim` and the sitemap, and no page responds 404 afterwards

#### Scenario: Reload after publish shows the change
- **WHEN** a published Schedule Event's title changes in Strapi, the webhook succeeds, and a visitor reloads `/en/schedule` a few seconds later
- **THEN** that reload shows the changed title

#### Scenario: Unpublish an Announcement
- **WHEN** Strapi sends an authorised `entry.unpublish` for `api::announcement.announcement`
- **THEN** the reserved `announcements` tag and the News paths in both locales are revalidated, whether or not Dev 3's route exists yet

#### Scenario: Turkish edit falls back to English
- **WHEN** only the English version of a Stellar Talk is updated
- **THEN** the revalidation covers both locales' Events paths, because the Turkish page may display English fallback

### Requirement: No time-based freshness
The system SHALL NOT add any cron, scheduled job, `revalidate` interval, or time-based
cache lifetime. Every page that currently has `revalidate = false` SHALL keep it.

#### Scenario: Nothing published
- **WHEN** no webhook arrives for any length of time
- **THEN** no page is regenerated

### Requirement: Content-type registry and fetch convention
One registry SHALL map each Strapi content-type uid to its cache tags, its public paths
for both locales, and its preview route. Every Strapi loader SHALL fetch through one shared
request convention:
- the base URL from the server-only `STRAPI_URL`;
- the optional server-only `STRAPI_API_TOKEN`;
- `cache: 'force-cache'`, `next.tags` taken from the registry, and `revalidate: false`;
- `status=published` outside Draft Mode.

The registry SHALL reserve `announcements` and `alumni-directory` tags, and their paths,
for Dev 3's capabilities.

#### Scenario: A loader's tag matches the registry
- **WHEN** the events, schedule or Galactic Summit loader builds its request
- **THEN** its `next.tags` equal the registry's tags for its content types, and a unit test fails if they diverge

### Requirement: Authorised preview entry
The system SHALL expose `GET /api/preview`. It SHALL accept only a `secret` equal to
`PREVIEW_SECRET` (compared in constant time), a `uid` present in the registry with a
preview route, a `documentId` of the Strapi form, a `locale` of `en` or `tr`, and a
`status` of `draft` or `published`. Any other or missing value SHALL be rejected with 401
(bad secret) or 400 (bad input), with no redirect and no change to Draft Mode.

#### Scenario: Unauthenticated preview
- **WHEN** `/api/preview` is called without the correct secret
- **THEN** it responds 401, sets no Draft Mode cookie, and does not redirect

### Requirement: Derived redirect, never an arbitrary URL
On success, the system SHALL redirect to a pathname derived only from the registry's
preview route for `uid` and `locale`, and, for slug-routed types, from the document's own
slug fetched server-side. It SHALL ignore any `url`, `path`, `slug`, `redirect` or similar
parameter, and SHALL only redirect to a same-origin path starting with `/en/` or `/tr/`.

#### Scenario: Open-redirect attempt
- **WHEN** an authorised request also carries `url=https://evil.example/`
- **THEN** the redirect target is the derived same-origin path, and the extra parameter has no effect

### Requirement: Draft Mode toggling
The preview entry SHALL call `const draft = await draftMode()`. It SHALL call
`draft.enable()` for `status=draft` and `draft.disable()` for `status=published`. Draft
Mode SHALL also be exitable through a POST exit handler. Pages SHALL keep their static
configuration. In Draft Mode, loaders SHALL request `status=draft` with
`STRAPI_PREVIEW_TOKEN`, and SHALL show draft entries only in that mode. Outside Draft
Mode, public output SHALL remain published-only, with every existing published-only
safeguard intact.

#### Scenario: Editor previews a draft Schedule Event
- **WHEN** an editor opens preview for a draft Schedule Event in the Strapi admin
- **THEN** the iframe shows `/en/schedule` or `/tr/takvim` rendered on request, including that draft, with `Cache-Control: private, no-store`

#### Scenario: Visitor without the cookie
- **WHEN** a public visitor requests the same page at the same time
- **THEN** they receive the static published page, with no draft content

### Requirement: Preview-only indexing and framing policy
Responses from `/api/preview` and every response served under Draft Mode SHALL carry
`X-Robots-Tag: noindex` and a `Content-Security-Policy` whose only directive is
`frame-ancestors 'self'` plus the Strapi origin. Public responses (no Draft Mode cookie)
SHALL NOT gain any new CSP, framing or indexing header from this capability. No CSP
directive SHALL be added or relaxed site-wide.

#### Scenario: Public page headers are unchanged
- **WHEN** a visitor without the Draft Mode cookie requests any public page
- **THEN** the response carries no `Content-Security-Policy` or `X-Robots-Tag` added by this capability

#### Scenario: Strapi admin frames a preview
- **WHEN** the Strapi admin iframe loads a Draft Mode page
- **THEN** framing is allowed for the Strapi origin only, and the response is `noindex`

### Requirement: Strapi preview configuration
`apps/cms` SHALL configure `admin.preview` with `allowedOrigins` set to the frontend origin
(`CLIENT_URL`), and a handler that returns the frontend `/api/preview` URL built from
`uid`, `documentId`, `locale` and `status` with `PREVIEW_SECRET`. For content types
without a public page (Sponsor), it SHALL return null so that no preview is offered.

#### Scenario: Sponsor has no preview
- **WHEN** an editor opens a Sponsor entry
- **THEN** the admin offers no preview

### Requirement: Publish-integration verification
Tier A SHALL cover:
- route-handler unit tests: authorisation, methods, malformed input, the event → tag/path
  mapping with `'max'`, and the open-redirect, locale and uid rejections;
- registry/loader tag consistency;
- the header policy in the built output.

A production-build check SHALL prove that:
- the routes stay static with `revalidate: false`;
- an unauthenticated call to each handler is rejected;
- after an authorised webhook, the **first** reload of the affected page shows the changed content;
- Draft Mode renders a page per request with draft data from a synthetic CMS, fetched only with the preview token;
- non-draft requests never receive draft data or preview headers.

#### Scenario: Regression to the one-argument call
- **WHEN** a change calls `revalidateTag(tag)` without the profile argument
- **THEN** typecheck or the unit tests fail
