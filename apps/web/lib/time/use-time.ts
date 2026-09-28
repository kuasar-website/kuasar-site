"use client";

import { useSyncExternalStore } from "react";
import { classifyTime, parseISO, type TimeRange, type TimeState } from "./date";

let now: number | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
const serverSnapshot = () => null;
const snapshot = () => now;

function refresh() {
  now = Date.now();
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  if (listeners.size === 1) {
    refresh();
    timer = setInterval(refresh, 1000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
  }
  return () => {
    listeners.delete(notify);
    if (listeners.size === 0) {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      now = null;
    }
  };
}

export function useBrowserNow(): number | null {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

export function useTimeState(range: TimeRange): TimeState | null {
  return classifyTime(range, useBrowserNow());
}

export type TimeCollectionOptions = {
  state?: TimeState;
  sort?: "ascending" | "descending";
};

/** Always pass the full dataset. Until mount, preserve its neutral source order. */
export function useTimeCollection<T extends TimeRange>(
  entries: readonly T[], options: TimeCollectionOptions = {},
): readonly T[] {
  const clock = useBrowserNow();
  if (clock === null) return entries;
  const result = entries.filter((entry) => !options.state || classifyTime(entry, clock) === options.state);
  if (options.sort) {
    const direction = options.sort === "ascending" ? 1 : -1;
    result.sort((a, b) => {
      const left = parseISO(a.startsAt);
      const right = parseISO(b.startsAt);
      if (left === null) return right === null ? 0 : 1;
      if (right === null) return -1;
      return direction * (left - right);
    });
  }
  return result;
}
