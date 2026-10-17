#!/usr/bin/env node
/**
 * The fixed, hardcoded allowlist of content types this backup exports, and
 * the exact `populate` parameters each one needs — see
 * openspec/changes/content-backup/design.md, "Completeness," which this
 * list was built against field-by-field,
 * openspec/changes/project-platform-cms/design.md for the two Project
 * Platform types, and openspec/changes/resources-cms/design.md for Resource. `alumnus` is the one schema under apps/cms/src/api/ that
 * is deliberately absent: this is the
 * structural half of Alumni's exclusion (the other half is that the API
 * token this script authenticates with is never granted permission on it
 * either — see design.md, "Mechanism").
 *
 * Each `populate` entry is a literal, explicit Strapi bracket-notation
 * query fragment, not a generic query-builder — the set of content types
 * and their nesting depth is small and fixed, so writing them out plainly
 * is more directly reviewable against the schema audit than a generic
 * serializer would be. Review this file again whenever any of the nine
 * schemas or apps/cms/src/components/** changes.
 *
 * `kind` is the Strapi content-type kind. A "collection" is read page by page
 * from /api/<pluralName>; a "single" type has no pages and is read once per
 * locale from /api/<singularName> (single.mjs). `pluralName` always names the
 * snapshot file, for both kinds.
 */

export const CONTENT_TYPES = Object.freeze([
  Object.freeze({
    uid: "stellar-talk",
    kind: "collection",
    pluralName: "stellar-talks",
    // speakerPortrait: shared.image -> its own `image` media field.
    // hoverVideo: a direct media field, no component wrapper.
    populate: Object.freeze([
      "populate[speakerPortrait][populate]=image",
      "populate[hoverVideo]=true",
    ]),
  }),
  Object.freeze({
    uid: "nebula-night",
    kind: "collection",
    pluralName: "nebula-nights",
    // photos: repeatable shared.image.
    populate: Object.freeze(["populate[photos][populate]=image"]),
  }),
  Object.freeze({
    uid: "galactic-summit",
    kind: "collection",
    pluralName: "galactic-summits",
    populate: Object.freeze([
      // sponsors: manyToMany relation to Sponsor.
      "populate[sponsors]=true",
      // photos, backgroundImage: shared.image.
      "populate[photos][populate]=image",
      "populate[backgroundImage][populate]=image",
      // sponsorshipPdf: a direct media field (allowedTypes: files), no component wrapper.
      "populate[sponsorshipPdf]=true",
      // speakers: repeatable summit.speaker, whose own `portrait` field is a
      // *nested* shared.image component — two levels deep.
      "populate[speakers][populate][portrait][populate]=image",
      // programme: repeatable summit.programme-item. Its own fields (time,
      // title, description) are plain scalars with no media/relation of
      // their own, but the component attribute itself still requires an
      // explicit populate entry to be returned at all — Strapi's REST API
      // does not include component/relation/media attributes by default
      // regardless of their own nesting depth. Omitting this was a real
      // bug (found in PR #34 review): the API silently returned no
      // `programme` key at all, and the picker's `Array.isArray(...) : []`
      // fallback then correctly, but misleadingly, produced an empty
      // array that looked like "no programme items exist."
      "populate[programme]=true",
    ]),
  }),
  Object.freeze({
    uid: "schedule-event",
    kind: "collection",
    pluralName: "schedule-events",
    // No relation, media, or component attribute on this schema.
    populate: Object.freeze([]),
  }),
  Object.freeze({
    uid: "announcement",
    kind: "collection",
    pluralName: "announcements",
    // coverImage: shared.image.
    populate: Object.freeze(["populate[coverImage][populate]=image"]),
  }),
  Object.freeze({
    uid: "sponsor",
    kind: "collection",
    pluralName: "sponsors",
    populate: Object.freeze([
      // logo, logoLight: shared.image.
      "populate[logo][populate]=image",
      "populate[logoLight][populate]=image",
      // summits: the inverse side of Galactic Summit's `sponsors` relation
      // (manyToMany, mappedBy "sponsors"). Same bug class as `programme`
      // above, found in the same review: a relation attribute still needs
      // its own populate entry even though it carries no further nesting.
      "populate[summits]=true",
    ]),
  }),
  Object.freeze({
    uid: "platform-project",
    kind: "collection",
    pluralName: "platform-projects",
    // coverImage: shared.image.
    populate: Object.freeze(["populate[coverImage][populate]=image"]),
  }),
  Object.freeze({
    uid: "project-platform",
    kind: "single",
    singularName: "project-platform",
    pluralName: "project-platforms",
    // features: repeatable platform.feature. Its fields (title, description)
    // are plain scalars, but the component attribute still needs its own
    // populate entry to be returned at all (the PR #34 lesson above).
    populate: Object.freeze(["populate[features]=true"]),
  }),
  Object.freeze({
    uid: "resource",
    kind: "collection",
    pluralName: "resources",
    // file: a direct, localized media field (allowedTypes: files), no component wrapper.
    populate: Object.freeze(["populate[file]=true"]),
  }),
]);

export const LOCALES = Object.freeze(["en", "tr"]);
