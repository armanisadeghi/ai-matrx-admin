import type { StreamTicketEnvelope } from "@/features/cloud-browser/types";

/** The one stream the Computer tab holds open for a run. */
export interface HeldStream {
  ticket: StreamTicketEnvelope;
  /** What it was minted as; with a watch-capable server either kind stays open. */
  kind: "view" | "control";
  /** The control revision it was minted under (an older server ties a control stream to it). */
  revision: number;
  runId: string;
}

/**
 * Which held stream is the live picture right now, or null.
 *
 * THE ONE CONNECTION (2026-10-17): on a server that streams to watchers
 * (`viewSupport === "yes"`), the stream opened for watching is the same one the
 * person drives after Take control and keeps watching after Stop — it never
 * depends on who is in control. On an older server only a control stream of
 * the current control revision, held while this person drives, is live.
 */
export function liveStream(input: {
  held: HeldStream | null;
  runId: string | null;
  lost: boolean;
  viewSupport: "unknown" | "yes" | "no";
  inControl: boolean;
  revision: number;
}): HeldStream | null {
  const { held, runId, lost, viewSupport, inControl, revision } = input;
  if (!held || lost || held.runId !== runId) return null;
  if (viewSupport === "yes") return held;
  return held.kind === "control" && inControl && held.revision === revision ? held : null;
}
