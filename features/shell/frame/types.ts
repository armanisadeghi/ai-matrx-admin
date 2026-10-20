// Types for the new app frame. Host-agnostic: no Redux, no app imports.
import type { ComponentType } from "react";
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
 * wide    = (1600px and wider) every side panel inline: properties, the side chat and the canvas.
 * desktop = sidebar + sheet + footer; properties and the side chat inline, the canvas takes turns with the side chat.
 * medium  = the sidebar is a drawer; properties, the side chat and the canvas take turns (the body keeps a min width).
 * phone   = drawer + compressed header, no footer; the side chat and the canvas cover the body.
 */
export type FrameForm = "wide" | "desktop" | "medium" | "phone";

/**
 * A heavy module the frame owns (the side chat, the canvas). The frame calls the loader only
 * when the person first engages the module, never on render. Pass a STABLE function
 * (module scope): the frame caches the lazy component per loader.
 */
export type FrameModuleLoader<P> = () => Promise<{ default: ComponentType<P> }>;

/** Text the person typed in the page's ask bar, handed to the side chat once it loads. */
export interface CompanionSeed {
  /** Changes on every send, so the same text sent twice is two messages. */
  id: number;
  text: string;
  /** The person pressed the ask bar's mic: the side chat starts dictation. */
  dictate?: boolean;
}

/** What the frame gives the loaded side chat. */
export interface CompanionProps {
  onClose: () => void;
  companionSeed?: CompanionSeed;
}

/** What the frame gives the loaded canvas. */
export interface CanvasProps {
  onClose: () => void;
}

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

/**
 * One right-side header tool (search, notifications, account …). The header is the same in
 * every form: on a phone, `phone: "show"` tools stay in the header and the rest move into "…".
 */
export interface FrameHeaderTool {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect?: () => void;
  /** The tool opens a menu or popover: it carries the right chevron (owner, 2026-10-14). */
  opensMenu?: boolean;
  /** Default `"menu"`: on a phone the tool is an item in the "…" menu. */
  phone?: "show" | "menu";
}
