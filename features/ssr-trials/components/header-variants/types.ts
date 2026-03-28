// header-variants/types.ts
// Shared type definitions for all header variant components.

/** A single action item — rendered as a glass icon on desktop, sheet row on mobile. */
export interface HeaderAction {
  /** Lucide icon name, e.g. "Plus", "Filter", "Pencil" */
  icon: string;
  /** Human-readable label — visible in mobile sheet, used as aria-label on desktop */
  label: string;
  /** Tap/click handler */
  onPress: () => void;
  /** If true, renders with destructive (red) styling in the sheet */
  destructive?: boolean;
}

/** Option shape used by toggle, pills, and tabs variants. */
export interface HeaderOption<T extends string = string> {
  /** Lucide icon name (optional — toggle and pills support it, tabs don't) */
  icon?: string;
  /** Visible label text */
  label: string;
  /** Unique value identifier */
  value: T;
  /** Optional notification badge count */
  badge?: number;
}

/** Dropdown option for HeaderStructured's center dropdown. */
export interface HeaderDropdownOption<T extends string = string> {
  label: string;
  value: T;
  icon?: string;
}
