// Types for the new app frame. Host-agnostic: no Redux, no app imports.
import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { ChipHue } from "@ai-matrx/design-system/controls";

export type ProductFamily = "yours" | "memory" | "build" | "productivity" | "business" | "solutions" | "more";

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
  /** Hover text for the row (e.g. the real route behind it). */
  hint?: string;
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
  /** A shorter label where space is tight (a Pinned tile, ~9 characters); default `name`. */
  shortName?: string;
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

/** One sibling a switchable crumb offers (the org/scopes breadcrumb's `ScopeCrumbOption` shape). */
export interface FrameCrumbOption {
  label: string;
  href: string;
  /** The level the person is on now: checked in the list. */
  active?: boolean;
  /** A plain click runs this instead of following `href` (a modified click keeps the link). */
  onSelect?: () => void;
}

/**
 * One breadcrumb level — DATA; the frame renders it. The rules (FEATURE.md § Breadcrumbs):
 * every level is included by default; a product may omit its top level when its sidebar already
 * covers it (Chat); the top level may show as its icon alone (`iconOnly`); a level with
 * `options` is switchable — a down chevron beside it lists its siblings, exactly as the
 * org/scopes breadcrumb does (`orgs > some-org ▾ > some-scope ▾`).
 */
export interface FrameCrumb {
  id: string;
  label: string;
  /** A real link; a plain click calls `onSelect` instead when both are given. */
  href?: string;
  onSelect?: () => void;
  /** The level's icon; required for `iconOnly`. */
  icon?: LucideIcon;
  /** Show only the icon (the label stays the accessible name and the tooltip). */
  iconOnly?: boolean;
  /** Siblings to switch to: the crumb gets a down chevron that lists them. */
  options?: readonly FrameCrumbOption[];
  /** Siblings fetched when the door first opens (a record's list, the route tree). */
  loadOptions?: () => Promise<readonly FrameCrumbOption[]>;
  /**
   * EVERY CRUMB IS A DOOR (Arman, 2026-10-22): what this level's dropdown offers — every other
   * product (the product icon), the product's first-tier places (the first level) or the sibling
   * records (a record). Always searchable. Without it a crumb with `options` is a sibling door.
   */
  door?: FrameCrumbDoor;
  /** The heading over the sibling list ("People"). */
  optionsLabel?: string;
  /** A "see all" row under the list. */
  optionsAllHref?: string;
  optionsAllLabel?: string;
}

/** The kinds of crumb door (FEATURE.md § Every crumb is a door). */
export type FrameCrumbDoorKind = "products" | "places" | "siblings";

/** A crumb's dropdown: a searchable list of everything at its level. */
export interface FrameCrumbDoor {
  kind: FrameCrumbDoorKind;
  /** The list's heading ("Products", "Marketing", "Brands"). */
  label: string;
  /** Rows (the current one `active`). A row's `icon` stands where the check mark would (product marks). */
  options?: readonly (FrameCrumbOption & { icon?: LucideIcon })[];
  /** Rows fetched on first open (a record's siblings). */
  loadOptions?: () => Promise<readonly FrameCrumbOption[]>;
  /** The search also ranks every page the app has (the Go-to index), loaded on the first keystroke. */
  loadSearchIndex?: () => Promise<readonly FrameDoorSearchEntry[]>;
  /** Rows open in a new tab (the products door: the app grid's rule). */
  newTab?: boolean;
  allHref?: string;
  allLabel?: string;
}

/** One page the door's search can reach (a Go-to index entry, kept structural so the frame stays light). */
export interface FrameDoorSearchEntry {
  id: string;
  label: string;
  trail: string[];
  href: string;
  keywords?: readonly string[];
  description?: string;
}

export interface FrameAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  /** Rendered after a separator, in the destructive ink. */
  destructive?: boolean;
  /** Shown but not pressable (a page verb that cannot run now). */
  disabled?: boolean;
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
  /** Default `"menu"`: on a phone the tool is an item in the "…" menu. */
  phone?: "show" | "menu";
}

/**
 * One of the person's own pinned pages or records, shown in the sidebar's Pinned section. The
 * host maps its favourites to this; the frame never stores pins itself.
 */
export interface FramePin {
  id: string;
  label: string;
  /** A real link; a Pinned tile opens it in a new tab. */
  href: string;
  icon?: LucideIcon;
  /** The pin IS a product (its home): the tile shows the product's mark and short name. */
  productId?: string;
}
