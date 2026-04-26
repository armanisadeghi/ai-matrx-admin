import type { SandboxInstance, SandboxStatus } from "@/types/sandbox";

/**
 * Single source of truth for sandbox lifecycle/status across every UI.
 *
 * Two views of the same `sandbox_instances` row used to disagree about
 * whether a sandbox was expired (the `/sandbox` list applied a client-side
 * override; `SandboxesPanel` in `/code` showed the raw DB status). Always
 * route status reads through `getEffectiveStatus` to guarantee they don't
 * drift again.
 */

/**
 * Derive the effective status, accounting for time-based expiry the
 * orchestrator may not have written back to the DB yet. The orchestrator's
 * idle sweep can lag by up to a minute, so when `expires_at` is in the past
 * but the row still says `ready`/`running`, we trust the timestamp.
 */
export function getEffectiveStatus(instance: SandboxInstance): SandboxStatus {
  if (
    (instance.status === "ready" || instance.status === "running") &&
    instance.expires_at &&
    new Date(instance.expires_at).getTime() <= Date.now()
  ) {
    return "expired";
  }
  return instance.status;
}

export const STATUS_LABELS: Record<SandboxStatus, string> = {
  creating: "Creating",
  starting: "Starting",
  ready: "Ready",
  running: "Running",
  shutting_down: "Shutting Down",
  stopped: "Stopped",
  failed: "Failed",
  expired: "Expired",
};

export type SandboxStatusBadgeVariant =
  | "success"
  | "warning"
  | "destructive"
  | "secondary"
  | "info"
  | "default";

export const STATUS_BADGE_VARIANT: Record<
  SandboxStatus,
  SandboxStatusBadgeVariant
> = {
  creating: "info",
  starting: "info",
  ready: "success",
  running: "success",
  shutting_down: "warning",
  stopped: "secondary",
  failed: "destructive",
  expired: "secondary",
};

/** Statuses where we treat the sandbox as alive and interactable. */
export const ACTIVE_EFFECTIVE_STATUSES: SandboxStatus[] = ["ready", "running"];

/**
 * Statuses we keep in the active list on the `/sandbox` page (everything that
 * isn't yet a terminal end-state, including the transition states).
 */
export const LIST_ACTIVE_STATUSES: SandboxStatus[] = [
  "creating",
  "starting",
  "ready",
  "running",
  "shutting_down",
];

/**
 * Compact pill colors for the chip used inside `/code`'s narrow Sandboxes
 * panel. Matches the wider Badge variants by intent so the two surfaces
 * read the same status with the same color.
 */
export function statusPillClasses(status: SandboxStatus): string {
  switch (status) {
    case "ready":
    case "running":
      return "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300";
    case "starting":
    case "creating":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
    case "stopped":
    case "shutting_down":
      return "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
    case "expired":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
    case "failed":
      return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300";
    default:
      return "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
  }
}
