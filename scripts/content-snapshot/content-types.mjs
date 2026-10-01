#!/usr/bin/env node
/**
 * The fixed, hardcoded allowlist of content types this backup exports, and
 * the exact `populate` parameters each one needs — see
 * openspec/changes/content-backup/design.md, "Completeness," which this
 * list was built against field-by-field. `alumnus` is the seventh schema
 * under apps/cms/src/api/ and is deliberately absent: this is the
 * structural half of Alumni's exclusion (the other half is that the API
 * token this script authenticates with is never granted permission on it
 * either — see design.md, "Mechanism").
 *
 * Each `populate` entry is a literal, explicit Strapi bracket-notation
 * query fragment, not a generic query-builder — the set of content types
 * and their nesting depth is small and fixed, so writing them out plainly
 * is more directly reviewable against the schema audit than a generic
 * serializer would be. Review this file again whenever any of the six
 * schemas or apps/cms/src/components/** changes.
 */

export const CONTENT_TYPES = Object.freeze([
  Object.freeze({
    uid: "stellar-talk",
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
    pluralName: "nebula-nights",
    // photos: repeatable shared.image.
    populate: Object.freeze(["populate[photos][populate]=image"]),
  }),
  Object.freeze({
    uid: "galactic-summit",
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
    ]),
  }),
  Object.freeze({
    uid: "schedule-event",
    pluralName: "schedule-events",
    // No relation, media, or component attribute on this schema.
    populate: Object.freeze([]),
  }),
  Object.freeze({
    uid: "announcement",
    pluralName: "announcements",
    // coverImage: shared.image.
    populate: Object.freeze(["populate[coverImage][populate]=image"]),
  }),
  Object.freeze({
    uid: "sponsor",
    pluralName: "sponsors",
    // logo, logoLight: shared.image.
    populate: Object.freeze([
      "populate[logo][populate]=image",
      "populate[logoLight][populate]=image",
    ]),
  }),
]);

export const LOCALES = Object.freeze(["en", "tr"]);
