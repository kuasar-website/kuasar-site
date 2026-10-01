/**
 * Mission facts (`design/content-model.md`, "Mission"). `status` here is
 * the mission's own lifecycle fact — deliberately not the same name-space
 * as a locale file's `translationStatus` marker (`entries.ts`); see
 * design.md, "Two different meanings of 'status' are named apart, on
 * purpose."
 */

import { parseISO } from "../time/date.ts";
import { loadEntries, type Entry } from "./entries.ts";

export type MissionType = "competition" | "research" | "test";
export type MissionLifecycleStatus = "planned" | "active" | "flown" | "retired";

export type MissionLink = { readonly label: string; readonly url: string };
export type MissionTeamMember = { readonly name: string; readonly role: string };

export type MissionFacts = {
  readonly id: string;
  readonly year: number;
  readonly type: MissionType;
  readonly competition: string | null;
  readonly status: MissionLifecycleStatus;
  readonly launchDate: string | null;
  readonly apogeeMetres: number | null;
  readonly patch: string;
  readonly gallery: readonly string[];
  readonly links: readonly MissionLink[];
  readonly team: readonly MissionTeamMember[];
};

export type Mission = Entry<MissionFacts>;

const MISSION_TYPES = new Set<MissionType>(["competition", "research", "test"]);
const MISSION_STATUSES = new Set<MissionLifecycleStatus>([
  "planned",
  "active",
  "flown",
  "retired",
]);

function fail(entryId: string, message: string): never {
  throw new Error(`Mission "${entryId}": ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function validateMissionFacts(raw: unknown, entryId: string): MissionFacts {
  if (!isRecord(raw)) fail(entryId, "index.json must be an object");

  if (typeof raw.year !== "number" || !Number.isFinite(raw.year)) {
    fail(entryId, `"year" must be a number`);
  }

  if (typeof raw.type !== "string" || !MISSION_TYPES.has(raw.type as MissionType)) {
    fail(entryId, `"type" must be one of competition | research | test`);
  }

  if (
    typeof raw.status !== "string" ||
    !MISSION_STATUSES.has(raw.status as MissionLifecycleStatus)
  ) {
    fail(entryId, `"status" must be one of planned | active | flown | retired`);
  }

  if (typeof raw.patch !== "string" || raw.patch.length === 0) {
    fail(entryId, `"patch" must be a non-empty image path`);
  }

  let launchDate: string | null = null;

  if (raw.launchDate !== undefined && raw.launchDate !== null) {
    if (typeof raw.launchDate !== "string" || parseISO(raw.launchDate) === null) {
      fail(entryId, `"launchDate" must be a valid ISO date`);
    }
    launchDate = raw.launchDate;
  }

  let apogeeMetres: number | null = null;

  if (raw.apogeeMetres !== undefined && raw.apogeeMetres !== null) {
    if (typeof raw.apogeeMetres !== "number" || !Number.isFinite(raw.apogeeMetres)) {
      fail(entryId, `"apogeeMetres" must be a number`);
    }
    apogeeMetres = raw.apogeeMetres;
  }

  const galleryRaw = Array.isArray(raw.gallery) ? raw.gallery : [];

  if (!galleryRaw.every((item) => typeof item === "string")) {
    fail(entryId, `"gallery" must be an array of image paths`);
  }

  const linksRaw = Array.isArray(raw.links) ? raw.links : [];
  const links: MissionLink[] = linksRaw.map((item, index) => {
    if (!isRecord(item) || typeof item.label !== "string" || typeof item.url !== "string") {
      fail(entryId, `"links[${index}]" must be { label: string, url: string }`);
    }
    return { label: item.label as string, url: item.url as string };
  });

  const teamRaw = Array.isArray(raw.team) ? raw.team : [];
  const team: MissionTeamMember[] = teamRaw.map((item, index) => {
    if (!isRecord(item) || typeof item.name !== "string" || typeof item.role !== "string") {
      fail(entryId, `"team[${index}]" must be { name: string, role: string }`);
    }
    return { name: item.name as string, role: item.role as string };
  });

  return {
    id: entryId,
    year: raw.year as number,
    type: raw.type as MissionType,
    competition: typeof raw.competition === "string" ? raw.competition : null,
    status: raw.status as MissionLifecycleStatus,
    launchDate,
    apogeeMetres,
    patch: raw.patch as string,
    gallery: galleryRaw as string[],
    links,
    team,
  };
}

export function loadMissions(): Mission[] {
  return loadEntries("missions", validateMissionFacts);
}
