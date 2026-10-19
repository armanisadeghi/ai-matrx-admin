// Types for the new app frame. Host-agnostic: no Redux, no app imports.
import type { LucideIcon } from "lucide-react";
import type { ChipHue } from "@ai-matrx/design-system/controls";

export type ProductFamily = "build" | "know-make" | "business" | "yours" | "solutions";

export interface FrameMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Where the row goes — a real link (middle-click, copy link). Default: `<homeHref>/<id>`. */
  href?: string;
  /** A count shown at the row's end (meta). */
  count?: number;
  /** Opens in a new tab (a studio that runs outside the product). */
  external?: boolean;
}

export interface FrameMenuSection {
  id: string;
  /** Group heading; the first section usually has none. */
  label?: string;
  items: readonly FrameMenuItem[];
}

export interface FrameProduct {
  id: string;
  name: string;
  family: ProductFamily;
  icon: LucideIcon;
  /** The tile hue — one of the design-system chip hues, never a class. */
  color: ChipHue;
  homeHref: string;
  /** The product's OWN sidebar menu — nothing from other products. */
  menu: readonly FrameMenuSection[];
}

/** body layouts; the header, tabs row and footer never change between them. */
export type FrameVariant = "record" | "list" | "workspace" | "light";

/**
 * desktop = sidebar + sheet + footer, side panels inline.
 * medium  = the sidebar is a drawer; the companion and the properties panel take turns (the body keeps a min width).
 * phone   = drawer + compressed header, no footer.
 */
export type FrameForm = "desktop" | "medium" | "phone";

export interface FrameCrumb {
  id: string;
  label: string;
  /** A real link; a plain click calls `onSelect` instead when both are given. */
  href?: string;
  onSelect?: () => void;
}

export interface FrameAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  /** Rendered after a separator, in the destructive ink. */
  destructive?: boolean;
}

export interface FrameTab {
  value: string;
  label: string;
  count?: number;
}
