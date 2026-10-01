#!/usr/bin/env node
/**
 * Turns one raw REST API entry into its snapshot shape.
 *
 * Every `pick*` function below names every field it copies, explicitly —
 * nothing is spread from the raw entry. This is what "export code must
 * reject/guard against unexpected Alumni relations" means in practice:
 * since a pick function can only ever produce the fields it names, a
 * relation, field, or component this file was never told about — whether
 * that's a future accidental relation to Alumni, or anything else no
 * schema audit anticipated — cannot reach a snapshot file no matter what
 * the API returns. `warnUnexpectedKeys` additionally surfaces (to the job's
 * own log, never to the snapshot) any such surprise, so it is noticed
 * rather than silently absorbed.
 *
 * See openspec/changes/content-backup/design.md, "Completeness" and
 * "Relations and media," which this file implements field-by-field.
 */

/** Keys every entry carries regardless of what was populated. */
const BASE_KEYS = ["id", "documentId", "locale", "createdAt", "updatedAt", "publishedAt"];

/**
 * Recursively sorts object keys (arrays keep their order — ordering the
 * *array* of entries is export.mjs's job, by documentId; this only makes a
 * single entry's own object shape byte-stable).
 * @param {*} value
 * @returns {*}
 */
export function sortKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === "object") {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeysDeep(value[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * Reduces a `shared.image` component to its public URL plus both required
 * alt strings — never the file's id, provider metadata, hash, or size.
 * @param {{ image?: { url?: string } | null, altEn?: string, altTr?: string } | null | undefined} component
 */
export function reduceImage(component) {
  if (component === null || component === undefined) return null;
  return {
    url: component.image?.url ?? null,
    altEn: component.altEn ?? null,
    altTr: component.altTr ?? null,
  };
}

/**
 * Reduces a direct (non-component) media attribute — e.g. `hoverVideo`,
 * `sponsorshipPdf` — to its public URL only. Never a binary, never an R2
 * endpoint or bucket name: Strapi's own file `url` field is already the
 * public `media.<DOMAIN>` URL this project's upload provider produces.
 * @param {{ url?: string } | null | undefined} file
 */
export function reduceMedia(file) {
  if (file === null || file === undefined) return null;
  return { url: file.url ?? null };
}

/**
 * Reduces a populated many-to-many relation to stable documentId
 * references only, in the array order the API returned (entry-level
 * ordering is sorted separately by export.mjs; this is per-entry so is not
 * a top-level sort target).
 * @param {Array<{ documentId?: string }> | null | undefined} relation
 */
export function reduceRelation(relation) {
  if (!Array.isArray(relation)) return [];
  return relation.map((related) => ({ documentId: related?.documentId ?? null }));
}

/**
 * Logs (never throws) a warning naming any key on `raw` that isn't in
 * `expectedKeys` — the generic form of the Alumni-relation guard: this
 * project's schemas today have no relation to Alumni, so this can only
 * fire if a schema changes without this file being updated to match, or
 * if the API ever returns something this design did not anticipate.
 * @param {object} raw
 * @param {string[]} expectedKeys
 * @param {string} contentTypeUid
 */
export function warnUnexpectedKeys(raw, expectedKeys, contentTypeUid) {
  const expected = new Set([...BASE_KEYS, ...expectedKeys]);
  const unexpected = Object.keys(raw ?? {}).filter((key) => !expected.has(key));
  if (unexpected.length > 0) {
    console.warn(
      `[content-snapshot] ${contentTypeUid}: unexpected field(s) ${unexpected.join(", ")} present in API response and dropped from the snapshot`,
    );
  }
}

const EXPECTED = {
  "stellar-talk": ["speakerName", "speakerPortrait", "eventNumber", "date", "title", "insight", "watchUrl", "readUrl", "hoverVideo"],
  "nebula-night": ["date", "photos", "title", "description", "filmTitle"],
  "galactic-summit": ["year", "date", "location", "isCurrent", "purpose", "programme", "speakers", "sponsors", "photos", "contactAddress", "sponsorshipPdf", "registrationUrl", "accentToken", "heroTreatment", "backgroundImage"],
  "schedule-event": ["startsAt", "endsAt", "type", "location", "title", "description", "url"],
  announcement: ["pinned", "title", "slug", "excerpt", "body", "coverImage"],
  sponsor: ["name", "logo", "logoLight", "url", "since", "isCurrent", "blurb", "summits"],
};

function pickStellarTalk(raw, locale) {
  warnUnexpectedKeys(raw, EXPECTED["stellar-talk"], "stellar-talk");
  return {
    documentId: raw.documentId,
    locale,
    speakerName: raw.speakerName ?? null,
    speakerPortrait: reduceImage(raw.speakerPortrait),
    eventNumber: raw.eventNumber ?? null,
    date: raw.date ?? null,
    title: raw.title ?? null,
    insight: raw.insight ?? null,
    watchUrl: raw.watchUrl ?? null,
    readUrl: raw.readUrl ?? null,
    hoverVideo: reduceMedia(raw.hoverVideo),
  };
}

function pickNebulaNight(raw, locale) {
  warnUnexpectedKeys(raw, EXPECTED["nebula-night"], "nebula-night");
  return {
    documentId: raw.documentId,
    locale,
    date: raw.date ?? null,
    photos: Array.isArray(raw.photos) ? raw.photos.map(reduceImage) : [],
    title: raw.title ?? null,
    description: raw.description ?? null,
    filmTitle: raw.filmTitle ?? null,
  };
}

function pickSpeaker(speaker) {
  return {
    speakerName: speaker?.speakerName ?? null,
    portrait: reduceImage(speaker?.portrait),
    role: speaker?.role ?? null,
  };
}

function pickProgrammeItem(item) {
  return {
    time: item?.time ?? null,
    title: item?.title ?? null,
    description: item?.description ?? null,
  };
}

function pickGalacticSummit(raw, locale) {
  warnUnexpectedKeys(raw, EXPECTED["galactic-summit"], "galactic-summit");
  return {
    documentId: raw.documentId,
    locale,
    year: raw.year ?? null,
    date: raw.date ?? null,
    location: raw.location ?? null,
    isCurrent: raw.isCurrent ?? null,
    purpose: raw.purpose ?? null,
    programme: Array.isArray(raw.programme) ? raw.programme.map(pickProgrammeItem) : [],
    speakers: Array.isArray(raw.speakers) ? raw.speakers.map(pickSpeaker) : [],
    sponsors: reduceRelation(raw.sponsors),
    photos: Array.isArray(raw.photos) ? raw.photos.map(reduceImage) : [],
    contactAddress: raw.contactAddress ?? null,
    sponsorshipPdf: reduceMedia(raw.sponsorshipPdf),
    registrationUrl: raw.registrationUrl ?? null,
    accentToken: raw.accentToken ?? null,
    heroTreatment: raw.heroTreatment ?? null,
    backgroundImage: reduceImage(raw.backgroundImage),
  };
}

function pickScheduleEvent(raw, locale) {
  warnUnexpectedKeys(raw, EXPECTED["schedule-event"], "schedule-event");
  return {
    documentId: raw.documentId,
    locale,
    startsAt: raw.startsAt ?? null,
    endsAt: raw.endsAt ?? null,
    type: raw.type ?? null,
    location: raw.location ?? null,
    title: raw.title ?? null,
    description: raw.description ?? null,
    url: raw.url ?? null,
  };
}

function pickAnnouncement(raw, locale) {
  warnUnexpectedKeys(raw, EXPECTED.announcement, "announcement");
  return {
    documentId: raw.documentId,
    locale,
    pinned: raw.pinned ?? null,
    title: raw.title ?? null,
    // The exact recorded slug — restore must set this verbatim, never
    // regenerate it from title. See design.md, "Restore procedure."
    slug: raw.slug ?? null,
    excerpt: raw.excerpt ?? null,
    body: raw.body ?? null,
    coverImage: reduceImage(raw.coverImage),
  };
}

function pickSponsor(raw, locale) {
  warnUnexpectedKeys(raw, EXPECTED.sponsor, "sponsor");
  return {
    documentId: raw.documentId,
    locale,
    name: raw.name ?? null,
    logo: reduceImage(raw.logo),
    logoLight: reduceImage(raw.logoLight),
    url: raw.url ?? null,
    since: raw.since ?? null,
    isCurrent: raw.isCurrent ?? null,
    blurb: raw.blurb ?? null,
    summits: reduceRelation(raw.summits),
  };
}

/** @type {Record<string, (raw: object, locale: "en" | "tr") => object>} */
export const PICKERS = Object.freeze({
  "stellar-talk": pickStellarTalk,
  "nebula-night": pickNebulaNight,
  "galactic-summit": pickGalacticSummit,
  "schedule-event": pickScheduleEvent,
  announcement: pickAnnouncement,
  sponsor: pickSponsor,
});

/**
 * Picks, then deeply sorts, one raw entry into its final snapshot shape.
 * @param {string} uid
 * @param {object} raw
 * @param {"en" | "tr"} locale
 */
export function reduceEntry(uid, raw, locale) {
  const picker = PICKERS[uid];
  if (!picker) {
    throw new Error(`[content-snapshot] No picker registered for content type "${uid}"`);
  }
  return sortKeysDeep(picker(raw, locale));
}
