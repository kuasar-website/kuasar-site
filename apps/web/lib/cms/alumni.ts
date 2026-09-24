/**
 * Typed, consent-safe consumption of Strapi's `Alumnus` content type.
 * Nothing here fetches from Strapi — see design.md, Non-Goals. The actual
 * live fetch, its base URL, and revalidation tags are
 * `publish-integration`'s (not yet proposed).
 *
 * Schema verified directly against
 * `apps/cms/src/api/alumnus/content-types/alumnus/schema.json` (shipped by
 * `cms-platform`), not assumed from `design/content-model.md`'s summary:
 * only `name`, `consentRecordedAt`, and `consentSource` are
 * `required: true` there. Everything else below is schema-optional.
 */

import { parseISO } from "../time/date.ts";

export type Locale = "en" | "tr";

export type SubTeam = "propulsion" | "avionics" | "structures" | "software";

export type AlumniPhoto = { readonly url: string };

/**
 * Deliberately its own type, not `Omit<RawAlumnus, "consentRecordedAt" |
 * "consentSource">` — see design.md, "The public type is a distinct type,
 * not the raw-response type with two fields deleted." No consent-audit
 * field exists here at all, so a future edit can't accidentally start
 * returning one.
 */
export type PublicAlumni = {
  readonly documentId: string;
  readonly locale: Locale;
  readonly name: string;
  readonly yearJoined: number | null;
  readonly yearLeft: number | null;
  readonly subTeam: SubTeam | null;
  readonly roleHeld: string | null;
  readonly photo: AlumniPhoto | null;
  readonly linkedinUrl: string | null;
};

const SUB_TEAMS = new Set<SubTeam>(["propulsion", "avionics", "structures", "software"]);

function fail(message: string): never {
  throw new Error(`Alumnus: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalNumber(raw: Record<string, unknown>, key: string): number | null {
  const value = raw[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(`"${key}" must be a number`);
  }
  return value;
}

function optionalString(raw: Record<string, unknown>, key: string): string | null {
  const value = raw[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    fail(`"${key}" must be a string`);
  }
  return value;
}

/**
 * Whether the raw record carries valid consent evidence — both fields
 * present and well-formed. Never throws: an absent or malformed consent
 * field means "not eligible to show a photo," not "corrupted data" (see
 * `mapAlumnus`'s handling of `photo` for the one exception, a
 * structurally broken photo, which does throw).
 */
function hasValidConsentEvidence(raw: Record<string, unknown>): boolean {
  const recordedAt = raw.consentRecordedAt;
  const source = raw.consentSource;
  return (
    typeof recordedAt === "string" &&
    parseISO(recordedAt) !== null &&
    typeof source === "string" &&
    source.trim().length > 0
  );
}

/**
 * Validates and maps one Strapi Alumnus response into `PublicAlumni`.
 * Throws, naming the field, on a missing `name` or any present field with
 * an unexpected type — including a structurally malformed `photo`. Never
 * throws for missing or invalid consent evidence; that only suppresses
 * the photo (see design.md, "The photo gate...").
 */
export function mapAlumnus(raw: unknown): PublicAlumni {
  if (!isRecord(raw)) fail("response must be an object");

  if (typeof raw.documentId !== "string" || raw.documentId.length === 0) {
    fail(`"documentId" must be a non-empty string`);
  }
  if (raw.locale !== "en" && raw.locale !== "tr") {
    fail(`"locale" must be "en" or "tr"`);
  }
  if (typeof raw.name !== "string" || raw.name.length === 0) {
    fail(`"name" must be a non-empty string`);
  }

  const yearJoined = optionalNumber(raw, "yearJoined");
  const yearLeft = optionalNumber(raw, "yearLeft");
  const roleHeld = optionalString(raw, "roleHeld");
  const linkedinUrl = optionalString(raw, "linkedinUrl");

  let subTeam: SubTeam | null = null;
  if (raw.subTeam !== undefined && raw.subTeam !== null) {
    if (typeof raw.subTeam !== "string" || !SUB_TEAMS.has(raw.subTeam as SubTeam)) {
      fail(`"subTeam" must be one of propulsion | avionics | structures | software`);
    }
    subTeam = raw.subTeam as SubTeam;
  }

  let photo: AlumniPhoto | null = null;
  if (raw.photo !== undefined && raw.photo !== null) {
    if (!isRecord(raw.photo) || typeof raw.photo.url !== "string") {
      fail(`"photo" must be null or an object with a string "url"`);
    }
    // A well-formed photo is only exposed with valid consent evidence —
    // never throws for that reason, only suppresses it.
    photo = hasValidConsentEvidence(raw) ? { url: raw.photo.url } : null;
  }

  return {
    documentId: raw.documentId,
    locale: raw.locale,
    name: raw.name,
    yearJoined,
    yearLeft,
    subTeam,
    roleHeld,
    photo,
    linkedinUrl,
  };
}

export type AlumniGroup = {
  readonly yearLeft: number | null;
  readonly members: readonly PublicAlumni[];
};

/**
 * Groups by `yearLeft`, newest year first, alphabetical by `name` within
 * a group, entries with no `yearLeft` in one group placed last — an
 * explicit design decision (see design.md), not a specified requirement.
 */
export function groupAndOrderAlumni(entries: readonly PublicAlumni[]): AlumniGroup[] {
  const byYear = new Map<number | null, PublicAlumni[]>();

  for (const entry of entries) {
    const bucket = byYear.get(entry.yearLeft) ?? [];
    bucket.push(entry);
    byYear.set(entry.yearLeft, bucket);
  }

  for (const bucket of byYear.values()) {
    bucket.sort((a, b) => a.name.localeCompare(b.name));
  }

  const years = [...byYear.keys()]
    .filter((year): year is number => year !== null)
    .sort((a, b) => b - a);

  const groups: AlumniGroup[] = years.map((yearLeft) => ({
    yearLeft,
    members: byYear.get(yearLeft)!,
  }));

  const unset = byYear.get(null);
  if (unset !== undefined) {
    groups.push({ yearLeft: null, members: unset });
  }

  return groups;
}
