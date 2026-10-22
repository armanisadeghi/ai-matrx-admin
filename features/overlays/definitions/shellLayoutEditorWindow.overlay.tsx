"use client";

/**
 * Opener for the `shellLayoutEditorWindow` overlay — "Edit sidebar…", "Customize header…", "Customize dock…"
 * (custom-experience). `useOpenShellLayoutEditor()({ region, target, organizationId })`.
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "shellLayoutEditorWindow" as const;

export interface OpenShellLayoutEditorOptions {
  region?: "sidebar" | "header" | "dock" | "look";
  /** `organization` edits the organization's layout (owner/admin); default the person's own. */
  target?: "person" | "organization";
  /** The organization whose layout is edited (target `organization`). */
  organizationId?: string | null;
}

/**
 * One window per layout being edited: the person's own (`person`) and each organization's
 * (`organization-<id>`). Until 2026-10-22 there was one window for all of them, so "Edit sidebar…" on an
 * organization's settings page could surface the person's open (or restored) editor, and its Save wrote
 * the person's layout (audit round 2 #3).
 */
export function shellLayoutEditorInstanceId(opts: OpenShellLayoutEditorOptions = {}): string {
  return opts.target === "organization" ? `organization-${opts.organizationId ?? "none"}` : "person";
}

const opener = appOpener<OpenShellLayoutEditorOptions>(OVERLAY_ID, {
  multi: true,
  instanceId: (opts: OpenShellLayoutEditorOptions = {}) => shellLayoutEditorInstanceId(opts),
  data: (opts: OpenShellLayoutEditorOptions = {}) => ({ region: opts.region ?? "sidebar", target: opts.target ?? "person", organizationId: opts.organizationId ?? null }),
});

export const useOpenShellLayoutEditor = opener.useOpen;

export type ShellLayoutEditorWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    shellLayoutEditorWindow: OverlayWire<ShellLayoutEditorWindowDefinitionData>;
  }
}
