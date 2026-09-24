/**
 * Timeline Entry facts (`design/content-model.md`, "Timeline Entry").
 * Identical directory layout to Mission — `docs/adr/0002-cms.md` §3 notes
 * this is why the CI parity check is one rule covering all git content.
 */

import { parseISO } from "../time/date.ts";
import { loadEntries, type Entry } from "./entries.ts";

export type TimelineKind =
  | "founding"
  | "competition"
  | "launch"
  | "milestone"
  | "recognition";

export type TimelineEntryFacts = {
  readonly id: string;
  readonly date: string;
  readonly kind: TimelineKind;
  readonly image: string | null;
  readonly link: string | null;
};

export type TimelineEntry = Entry<TimelineEntryFacts>;

const TIMELINE_KINDS = new Set<TimelineKind>([
  "founding",
  "competition",
  "launch",
  "milestone",
  "recognition",
]);

function fail(entryId: string, message: string): never {
  throw new Error(`Timeline Entry "${entryId}": ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function validateTimelineEntryFacts(
  raw: unknown,
  entryId: string,
): TimelineEntryFacts {
  if (!isRecord(raw)) fail(entryId, "index.json must be an object");

  if (typeof raw.date !== "string" || parseISO(raw.date) === null) {
    fail(entryId, `"date" must be a valid ISO date`);
  }

  if (typeof raw.kind !== "string" || !TIMELINE_KINDS.has(raw.kind as TimelineKind)) {
    fail(
      entryId,
      `"kind" must be one of founding | competition | launch | milestone | recognition`,
    );
  }

  return {
    id: entryId,
    date: raw.date as string,
    kind: raw.kind as TimelineKind,
    image: typeof raw.image === "string" ? raw.image : null,
    link: typeof raw.link === "string" ? raw.link : null,
  };
}

export function loadTimelineEntries(): TimelineEntry[] {
  return loadEntries("timeline", validateTimelineEntryFacts);
}
