// features/launchpad/paintCache.ts — THE LAST-DRAWN LAUNCHPAD, KEPT ON THIS DEVICE (custom-experience lane F).
//
// Local first: a launchpad paints what this device last drew while the cloud read runs, then swaps only when
// the saved version changed. A copy of server data, safe to lose (kind "cache"); the record stays the truth.
// Read it after hydration (an effect), never during render: the server paint and the first client paint must
// match (lib/sync/FEATURE.md § Hydration boundary).
import { defineClientKeyFamily } from "@/lib/sync/client-storage";
import type { LaunchpadDoc } from "@/features/shell/shell-layout/contract";
import { parseLaunchpadDoc, serializeLaunchpadDoc } from "./doc";

const lastDrawn = defineClientKeyFamily({
  id: "launchpad.last-drawn",
  area: "local",
  kind: "cache",
  reason: "Paints a launchpad at once from this device's last copy while the saved one is read from the cloud.",
});

export interface PaintedLaunchpad {
  title: string;
  savedAt: string | null;
  doc: LaunchpadDoc;
}

const suffix = (userId: string, key: string) => `${userId}:${key}`;

export function readPaintedLaunchpad(userId: string, key: string): PaintedLaunchpad | null {
  const raw = lastDrawn.get(suffix(userId, key));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { title?: unknown; savedAt?: unknown; doc?: unknown };
    const parsed = parseLaunchpadDoc(value.doc);
    if (!parsed.ok || typeof value.title !== "string") return null;
    return { title: value.title, savedAt: typeof value.savedAt === "string" ? value.savedAt : null, doc: parsed.doc };
  } catch {
    return null;
  }
}

/** Keep what was just drawn from the cloud. Writes only when the saved version moved. */
export function keepPaintedLaunchpad(userId: string, key: string, painted: PaintedLaunchpad): void {
  const before = readPaintedLaunchpad(userId, key);
  if (before && before.savedAt === painted.savedAt && before.title === painted.title) return;
  lastDrawn.set(
    suffix(userId, key),
    JSON.stringify({ title: painted.title, savedAt: painted.savedAt, doc: serializeLaunchpadDoc(painted.doc) }),
  );
}

/** A launchpad that no longer exists (archived, moved) is never painted again. */
export function forgetPaintedLaunchpad(userId: string, key: string): void {
  lastDrawn.remove(suffix(userId, key));
}
