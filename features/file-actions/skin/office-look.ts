/**
 * The Office "look" — ONE per-person choice that skins the Workbooks, Documents and Presentations
 * homes and editors: Google (Sheets / Docs / Slides, the default) or Microsoft 365 (Excel / Word /
 * PowerPoint on the web). Stored in `userPreferences.display.officeLook` (server-synced); Settings →
 * Appearance and the switch on each home write the same value, so "the last one used" IS the
 * setting. Both looks expose identical capabilities (same command map, same file menu).
 */

export type OfficeLook = "google" | "microsoft";

export const OFFICE_LOOK_SETTING_PATH = "userPreferences.display.officeLook" as const;

export const DEFAULT_OFFICE_LOOK: OfficeLook = "google";

export const OFFICE_LOOK_OPTIONS: ReadonlyArray<{ value: OfficeLook; label: string }> = [
  { value: "google", label: "Google" },
  { value: "microsoft", label: "Microsoft 365" },
];

/** Any stored value → a look (absent, stale or foreign values read as the default). */
export function resolveOfficeLook(value: unknown): OfficeLook {
  return value === "microsoft" ? "microsoft" : DEFAULT_OFFICE_LOOK;
}

/**
 * Microsoft-like product accents (no logos — generic glyphs in these colours): Excel green,
 * Word blue, PowerPoint orange. Exposed as `--office-accent` on a skinned surface.
 */
export const OFFICE_ACCENT: Record<"workbook" | "document" | "presentation", { light: string; dark: string }> = {
  workbook: { light: "#107c41", dark: "#4cb782" },
  document: { light: "#185abd", dark: "#6aa2f0" },
  presentation: { light: "#c43e1c", dark: "#f0845f" },
};

/** The Microsoft app names a skinned surface uses in its own words (never a logo). */
export const OFFICE_APP_NAME: Record<"workbook" | "document" | "presentation", string> = {
  workbook: "Excel",
  document: "Word",
  presentation: "PowerPoint",
};
