// features/shell/shell-layout/contract.ts — THE FROZEN CONTRACT for custom layouts (project
// custom-experience, common-docs/projects/custom-experience/CONTRACT.md). Every lane builds against
// these shapes; a change after the freeze is an amendment (CONTRACT.md + REGISTER.md), never a
// silent edit. Pure types and constants only — no React, no IO.
//
// A Layout is what a person (or their organization) chose for the app's chrome: the Sidebar tree,
// the Header buttons, the Dock and which Launchpad they land on. It is stored EXPLICITLY (what you
// see is what is stored), versioned by the record store, and resolved person → organization →
// the built-in default on the server so the first frame is already theirs.

import type { ShellIconName } from "@/features/shell/shellIconMap";

/** Bumped only by a migrator that rewrites stored bodies (go-live makes this a customer contract). */
export const SHELL_LAYOUT_SCHEMA_VERSION = 1 as const;

/** The deepest a Sidebar tree may go — the same ceiling the default nav keeps (nav-no-loss). */
export const SHELL_LAYOUT_MAX_DEPTH = 3 as const;

/** Header buttons the shell owns (the five header controls, owner 2026-09-19). */
export type HeaderControlId = "search" | "intelligence" | "messages" | "notifications" | "canvas";

/** Reserved places: never removable from any layout (plan §5.5). */
export const RESERVED_HEADER_CONTROLS: readonly HeaderControlId[] = ["search", "notifications"];

/**
 * One row of a custom Sidebar or Dock.
 * - `nav`: a catalog destination by its permanent id (`ShellCatalogEntry.id`). `label`/`icon`
 *   override the catalog's; `children` (when present) is the explicit list under it — when absent
 *   the row has no submenu even if the catalog node has children.
 * - `link`: any URL (in-app path or absolute).
 * - `record`: one platform record (`token` = entity type token, `recordId`), opened at `href`.
 * - `launchpad`: one of the person's or organization's Launchpads by key.
 * - `group`: a person-made heading holding other rows.
 */
export type ShellNode =
  | { kind: "nav"; id: string; ref: string; label?: string; icon?: ShellIconName; children?: ShellNode[] }
  | { kind: "link"; id: string; label: string; icon: ShellIconName; href: string; newTab?: boolean }
  | { kind: "record"; id: string; label: string; icon?: ShellIconName; token: string; recordId: string; href: string }
  | { kind: "launchpad"; id: string; key: string; label: string; icon?: ShellIconName }
  | { kind: "group"; id: string; label: string; icon: ShellIconName; children: ShellNode[] };

/** One header button. `control` = a built-in header control; the rest are a person's own. */
export type HeaderButton =
  | { kind: "control"; id: string; control: HeaderControlId }
  | { kind: "nav"; id: string; ref: string; label?: string; icon?: ShellIconName }
  | { kind: "link"; id: string; label: string; icon: ShellIconName; href: string; newTab?: boolean }
  | { kind: "launchpad"; id: string; key: string; label: string; icon?: ShellIconName }
  /** Runs a fixed AI job (a declared mandate key) in place — never a raw agent id. */
  | { kind: "mandate"; id: string; label: string; icon: ShellIconName; mandateKey: string };

/** Where sign-in lands. Absent = the platform default destination. */
export type ShellLanding = { kind: "launchpad"; key: string } | { kind: "href"; href: string };

/**
 * The visual half of a Layout: which Look the shell wears (amendment 2026-10-20, REGISTER.md). A Look is
 * design tokens + data attributes over the same components (never a forked component): `standard` = today,
 * `meet-matrx` = the Meet Matrx welcome's gradient tiles, glows and airy cards. Ids are in `./looks.ts`.
 */
export interface ShellLookRef {
  id: string;
}

/**
 * The accent color (amendment 2026-10-20, lane Q, REGISTER.md): a curated id from the design system's
 * set (`@ai-matrx/design-system/accents` `ACCENTS`) or a custom `#rrggbb`. It re-points the brand role
 * tokens (`--primary` and its foreground and ink, light and dark) and nothing else. On the organization's
 * layout it is the organization's brand color. Resolution is per field, not whole-body: the person's
 * accent, else the organization's, else none (Standard view and guests: none). A bad value is dropped
 * with a problem; a low-contrast custom color is warned about in the editor, never refused.
 */
export type ShellAccentRef = { id: string } | { hex: string };

/** The stored body (schemaVersion 1). Each region is optional: absent = that region stays default. */
export interface ShellLayoutBody {
  schemaVersion: typeof SHELL_LAYOUT_SCHEMA_VERSION;
  /** The catalog version this body was last reviewed against; newer catalog nodes surface in What's new. */
  basedOnCatalogVersion: number;
  sidebar?: ShellNode[];
  header?: HeaderButton[];
  dock?: ShellNode[];
  landing?: ShellLanding;
  /** The Look; absent = `standard`. An unknown id is dropped with a problem. */
  look?: ShellLookRef;
  /** The accent color; absent = the built-in primary. Validated by the design system's set. */
  accent?: ShellAccentRef;
  /** Catalog ids the person dismissed from What's new (never offered again). */
  dismissedNew?: string[];
}

/** Which stored layout won, or none (the built-in default). */
export type ShellLayoutSource = "person" | "organization" | "default" | "standard-view";

/** One stored layout as the boot seed and the client store carry it. */
export interface StoredShellLayout {
  /** `custom.record` id of the row (its versions are the history). */
  recordId: string;
  organizationId: string;
  /** Store version — the compare-and-swap token and the revalidation hash. */
  version: number;
  updatedAt: string;
  /** Raw JSON text as stored; parsed by `parseShellLayoutBody` (a bad body falls back loudly). */
  body: string;
}

/**
 * The `shell` key of `iam.core_boot_seed()`: `null` when neither the person nor any organization
 * on the seeded page has a layout — the zero-cost path for everyone who never customized.
 */
export interface ShellBootSeed {
  person: StoredShellLayout | null;
  /** Keyed by organization id; only organizations that have a layout appear. */
  organizations: Record<string, StoredShellLayout>;
}

// ── storage (typed tables; definitions in ./tables.ts) ───────────────────────

/** `kept_for` of both typed tables. */
export const SHELL_LAYOUT_KEPT_FOR = "custom_experience" as const;
/** Slug of the layout typed table. One row per slot. */
export const SHELL_LAYOUT_TABLE_SLUG = "shell_layout" as const;
/** Slug of the launchpad typed table. */
export const LAUNCHPAD_TABLE_SLUG = "launchpad" as const;

/** The unique `slot` of a layout row: the organization's own, or one person's. */
export type ShellLayoutSlot = "org" | `person:${string}`;
export const orgLayoutSlot = (): ShellLayoutSlot => "org";
export const personLayoutSlot = (userId: string): ShellLayoutSlot => `person:${userId}`;

// ── cookies (read on the server; written by the client) ──────────────────────

/** `1` while this browser holds a non-default layout — lets SSR reserve the nav column on a seed miss. */
export const SHELL_CUSTOM_COOKIE = "matrx_shell" as const;
/** `standard` = the Standard view switch is on: render the built-in default regardless of layouts. */
export const SHELL_VIEW_COOKIE = "matrx_shell_view" as const;

// ── launchpads ───────────────────────────────────────────────────────────────

export const LAUNCHPAD_DOC_SCHEMA_VERSION = 1 as const;

/** A widget's place on one breakpoint grid (12 columns on desktop, 4 on a phone). */
export interface GridPlacement {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LaunchpadWidget {
  id: string;
  /** A registered widget type (the one widget registry). */
  type: string;
  config: Record<string, unknown>;
  layout: { lg: GridPlacement; sm?: GridPlacement };
}

/** One end of a page-bus connection: a widget on this launchpad and one of its declared value keys. */
export interface LaunchpadBindingEnd {
  widgetId: string;
  key: string;
}

/**
 * THE PAGE BUS (amendment 2026-10-20, lane L): `from` is a value a widget publishes (its type's
 * `publishes`), `to` an input another widget accepts (`accepts`). Values live for the browser
 * session only; only the connection is saved. One input takes at most one connection.
 */
export interface LaunchpadBinding {
  from: LaunchpadBindingEnd;
  to: LaunchpadBindingEnd;
}

export interface LaunchpadDoc {
  schemaVersion: typeof LAUNCHPAD_DOC_SCHEMA_VERSION;
  widgets: LaunchpadWidget[];
  /** Page-bus connections (amendment 2026-10-20). Absent = none; schema stays v1. */
  bindings?: LaunchpadBinding[];
}

/**
 * `slot` of a launchpad row: unique per organization copy of the table. `org:<key>` = the organization's launchpad
 * (every member sees it); `person:<uuid>:<key>` = one person's. A launchpad saved as a template is a copy in the
 * same table under `template:org:<key>` (the organization's templates) or `template:person:<uuid>:<key>` (one
 * person's) — never listed as a launchpad (amendment 2026-10-22, lane T).
 */
export type LaunchpadSlot =
  | `org:${string}`
  | `person:${string}:${string}`
  | `template:org:${string}`
  | `template:person:${string}:${string}`;
