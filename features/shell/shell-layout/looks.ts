// features/shell/shell-layout/looks.ts — THE LOOK REGISTRY (custom-experience, amendment 2026-10-20).
//
// A Look is the visual half of a Layout: design tokens + data attributes over the same shell components,
// never a forked component. The CSS of each look lives in the shared UI system
// (`@ai-matrx/design-system` `look-<id>.css`, imported by its styles.css and inert without the
// attribute), so a look costs nothing for anyone who did not choose it: the server stamps
// `data-shell-look="<id>"` on `.shell-root` only when a non-standard look is chosen.
//
// Pure: no React, no IO.

/** Every look a layout may name. `standard` is today's shell and is never stamped. */
export const SHELL_LOOK_IDS = ["standard", "meet-matrx"] as const;
export type ShellLookId = (typeof SHELL_LOOK_IDS)[number];

export const STANDARD_SHELL_LOOK: ShellLookId = "standard";

export interface ShellLookDef {
  id: ShellLookId;
  label: string;
  /** One line for the picker (≤60 characters). */
  hint: string;
  /** Tile colors the picker's preview draws (hex), in sidebar order. */
  preview: readonly string[];
}

export const SHELL_LOOKS: readonly ShellLookDef[] = [
  { id: "standard", label: "Standard", hint: "Quiet icons on a plain canvas", preview: [] },
  {
    id: "meet-matrx",
    label: "Meet Matrx",
    hint: "Color tiles, soft glows and airy cards",
    preview: ["#047857", "#1E40AF", "#4D7C0F", "#0284C7", "#155E75", "#DC2626", "#DB2777"],
  },
];

export function isShellLookId(value: unknown): value is ShellLookId {
  return typeof value === "string" && (SHELL_LOOK_IDS as readonly string[]).includes(value);
}

export function shellLookDef(id: ShellLookId): ShellLookDef {
  return SHELL_LOOKS.find((l) => l.id === id) ?? SHELL_LOOKS[0]!;
}

/**
 * The `data-shell-look` attribute for a look: none for `standard` (or no look), so an uncustomized
 * render carries no attribute at all.
 */
export function shellLookAttributes(look: ShellLookId | null): { "data-shell-look"?: string } {
  return look && look !== STANDARD_SHELL_LOOK ? { "data-shell-look": look } : {};
}

// ── tile hues (the Meet Matrx look draws every top-level row as a gradient tile in its domain's color) ──

/**
 * A top-level nav domain's tile color: its official identity (`@ai-matrx/icons/domain`
 * PLATFORM_IDENTITIES / PRIMITIVE_IDENTITIES — the same hex the welcome screen's tile wears) where the
 * domain IS that piece; every other domain gets the 600 shade of the Tailwind hue it already carries
 * (`ShellNavItem.color`). Keyed by nav id (custom-experience nav ids are permanent).
 */
export const SHELL_LOOK_DOMAIN_HUES: Readonly<Record<string, string>> = {
  workspace: "#047857", // boards
  agents: "#1E40AF", // agent_studio
  applets: "#4D7C0F", // applets
  chat: "#0284C7", // chats
  workflows: "#155E75", // workflow_studio
  intelligence: "#DC2626", // mandates
  knowledge: "#DB2777", // knowledge
  content: "#4F46E5", // docs
  data: "#7C3AED", // data
  files: "#3B82F6", // files
  audio: "#9333EA", // transcripts
  integrations: "#475569", // tools
  account: "#78716C", // organization
  masterwork: "#7C3AED",
  media: "#DB2777",
  code: "#4F46E5",
  publish: "#7C3AED",
  communications: "#C026D3",
  crm: "#0D9488",
  marketing: "#16A34A",
  "human-resources": "#4F46E5",
  web: "#EA580C",
  utilities: "#EA580C",
  computer: "#475569",
  industries: "#059669",
  other: "#DB2777",
  settings: "#475569",
};

/** Tailwind's 600 shade for the hue names nav rows carry. */
const TAILWIND_600: Readonly<Record<string, string>> = {
  slate: "#475569", gray: "#4B5563", zinc: "#52525B", stone: "#57534E", red: "#DC2626", orange: "#EA580C",
  amber: "#D97706", yellow: "#CA8A04", lime: "#65A30D", green: "#16A34A", emerald: "#059669", teal: "#0D9488",
  cyan: "#0891B2", sky: "#0284C7", blue: "#2563EB", indigo: "#4F46E5", violet: "#7C3AED", purple: "#9333EA",
  fuchsia: "#C026D3", pink: "#DB2777", rose: "#E11D48",
};

/** A person's own rows (links, groups, records) cycle through these, picked by id so a row keeps its color. */
const OWN_ROW_HUES = ["#1E40AF", "#C026D3", "#155E75", "#DB2777", "#DC2626", "#4D7C0F", "#047857", "#7C3AED"] as const;

/** The tile color of one row: its domain's, else its own Tailwind hue's, else a stable pick by id. */
export function shellLookHue(row: { id: string; color?: string | undefined }): string {
  const domain = SHELL_LOOK_DOMAIN_HUES[row.id];
  if (domain) return domain;
  const named = row.color ? TAILWIND_600[row.color] : undefined;
  if (named) return named;
  let h = 0;
  for (let i = 0; i < row.id.length; i++) h = (h * 31 + row.id.charCodeAt(i)) >>> 0;
  return OWN_ROW_HUES[h % OWN_ROW_HUES.length]!;
}

/**
 * The attributes a row and its icon carry under a look: none without one (the uncustomized HTML is
 * unchanged). `row` goes on the link (the active row tints in its hue), `tile` on the icon box.
 */
export function shellLookRowProps(
  look: ShellLookId | null,
  row: { id: string; color?: string | undefined },
): { row: Record<string, unknown>; tile: Record<string, unknown> } {
  if (!look || look === STANDARD_SHELL_LOOK) return { row: {}, tile: {} };
  return {
    row: { "data-look-row": look, style: { "--look-hue": shellLookHue(row) } as Record<string, string> },
    tile: { "data-look-tile": look },
  };
}
