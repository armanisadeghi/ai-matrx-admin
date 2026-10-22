"use client";

// THE NEW APP FRAME (owner model, 2026-10-17) — Google-Workspace-shaped: many
// products, each with its own sidebar, held together by the app grid, one
// header row, an optional tabs row and one footer. Visual reference: Linear.
//
//   [sidebar] [ SHEET: ( header / tabs / body + side chat / footer ) | canvas, full height ]
//
// The header, tabs row and footer are IDENTICAL in every variant; `variant`
// changes only the body. The frame OWNS every region's geometry and look, the
// side chat and the canvas (both load only when first engaged); a page hands it
// DATA only (FEATURE.md § Ours and the page's). Host-agnostic on purpose (props
// in; design-system, lucide and cn only) so the move into @ai-matrx/shell is a copy.
// frame.css is imported by each HOST's server file (FrameShell, the lab page): a client import here would
// load it late and flash the frame unstyled when its chunk arrives after the HTML.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Maximize2, Menu, Minimize2, Shapes } from "lucide-react";
import { PortalContainerProvider } from "@ai-matrx/design-system";
import { accentAttributes } from "@ai-matrx/design-system/accents";
import { Button, Tabs } from "@ai-matrx/design-system/controls";
import { cn } from "@ai-matrx/design-system/cn";
import { AppGrid } from "./AppGrid";
import type { AppGridProps } from "./AppGrid";
import { GoToSearch } from "./GoToSearch";
import type { GoToSearchProps } from "./GoToSearch";
import { FrameSidebar } from "./FrameSidebar";
import {
  AskBar,
  CanvasPlaceholder,
  CompanionPlaceholder,
  ModuleSlot,
  PanelResizeHandle,
  PanelTitle,
} from "./FrameModules";
import { SheetFooter } from "./SheetFooter";
import { SheetHeader, SidebarRestore } from "./SheetHeader";
import type { FrameFavorite } from "./SheetHeader";
import {
  FRAME_COMPANION_WIDTH_COOKIE,
  FRAME_SIDEBAR_WIDTH_COOKIE,
  parseFrameWidth,
  readFrameCookie,
  writeFrameCookie,
} from "./geometry";
import type { FrameInitialGeometry } from "./geometry";
import { useModalPanel } from "./useModalPanel";
import { CHAT_PRODUCT_ICON, withProductMarks } from "./products";
import { PinsEditor } from "./PinsEditor";
import type {
  CanvasProps,
  CompanionProps,
  CompanionSeed,
  FrameAction,
  FrameCrumb,
  FrameForm,
  FrameHeaderTool,
  FrameMenuItem,
  FrameModuleLoader,
  FramePin,
  FrameProduct,
  FrameTab,
  FrameVariant,
  ProductFamily,
} from "./types";

/** Below this frame width the frame takes its phone form. */
export const FRAME_PHONE_BELOW_PX = 640;
/**
 * Below this frame width the frame takes its medium form: the sidebar becomes a
 * drawer and properties, the side chat and the canvas take turns, so the body never drops under
 * `--matrx-frame-body-min-w`.
 */
export const FRAME_MEDIUM_BELOW_PX = 1280;
/** From this frame width the frame takes its wide form: the side chat and the canvas sit inline together. */
export const FRAME_WIDE_FROM_PX = 1600;

/**
 * THE WIDTH RULES (px; frame.css carries the two CSS twins). Every side panel is a number so
 * the frame can say exactly what fits: the record column never drops under BODY_MIN; when it
 * would, Properties yields first (the footer toggle brings it back).
 */
export const FRAME_BODY_MIN_PX = 360;
export const FRAME_PROPERTIES_PX = 288;
/** The side chat (owner, 2026-10-04 / 10-15): resizable 340–768, about 350 by default, remembered per device. */
export const FRAME_COMPANION_MIN_PX = 340;
export const FRAME_COMPANION_MAX_PX = 768;
export const FRAME_COMPANION_DEFAULT_PX = 350;
/** Dragging the side chat this far past its minimum snaps it shut (owner, 2026-09-27). */
export const FRAME_COMPANION_SNAP_PX = 80;
/** The inline canvas: 34% of the sheet, never under 440 or over 960; full screen takes the whole sheet. */
export const FRAME_CANVAS_SHARE = 0.34;
export const FRAME_CANVAS_MIN_PX = 440;
export const FRAME_CANVAS_MAX_PX = 960;

/**
 * WHERE THE SIDE CHAT'S DOOR SITS (owner, 2026-10-20: the header's right group, the canvas
 * toggle beside it). One line moves it; a left strip, if ruled, becomes a value here. On a
 * phone the door is always a "…" item.
 */
export const SIDE_CHAT_DOOR: "header" = "header";

/**
 * The header's lower edge — an A/B the owner is comparing (2026-10-20): `hairline` = a 1px rule
 * under the top band; `fade` = no rule, a fade band the content scrolls under (the first line
 * sits below it at rest). One value survives; the prop goes when he picks.
 */
export type FrameHeaderEdge = "hairline" | "fade";


/** The product sidebar (owner, 2026-10-21): resizable 200–400, 244 by default; 80px past the minimum snaps it shut. */
export const FRAME_SIDEBAR_MIN_PX = 200;
export const FRAME_SIDEBAR_MAX_PX = 400;
export const FRAME_SIDEBAR_DEFAULT_PX = 244;
export const FRAME_SIDEBAR_SNAP_PX = 80;

/**
 * The owner's two layout comparisons (2026-10-21), PLAYGROUND A/B ONLY until he picks:
 * `inset` = the gap around the sheet (Linear); `flush` = no outer gap, square outer edges.
 * `contrast` = the sidebar on a darker app background; `same` = sidebar and page the same
 * color, split by one hairline.
 */
export type FrameSpace = "inset" | "flush";
export type FrameSidebarColor = "contrast" | "same";

/**
 * The host's look and accent, stamped on the frame root exactly as AppShell stamps `.shell-root`:
 * `data-shell-look` (absent for the standard look) and the design system's `data-matrx-accent`
 * + its light/dark tokens. `accent` is a curated accent id or a `#rrggbb` color.
 */
export interface FrameAppearance {
  look?: string | null;
  accent?: string | null;
}

/** The root's attributes and style for an appearance (exported for the parity test). */
export function frameAppearanceAttributes(appearance: FrameAppearance | undefined): {
  attrs: Record<string, string>;
  style: Record<string, string> | undefined;
} {
  const accent = appearance?.accent;
  const { style, ...accentAttrs } = accentAttributes(
    accent ? (accent.startsWith("#") ? { hex: accent } : { id: accent }) : null,
  );
  const attrs: Record<string, string> = {};
  for (const [name, value] of Object.entries(accentAttrs)) if (typeof value === "string") attrs[name] = value;
  if (appearance?.look) attrs["data-shell-look"] = appearance.look;
  return { attrs, style: style as Record<string, string> | undefined };
}

/**
 * Everything a page may hand the frame — DATA only. The frame owns every region's geometry
 * and look (sidebar, header, tabs row, footer, side chat, canvas, ask bar, widths), so there
 * is no `className` or `style` here, by contract (a test fails if one is added).
 */
export interface AppFrameProps {
  // ── the product ──
  products: readonly FrameProduct[];
  families: readonly { id: ProductFamily; label: string }[];
  product: FrameProduct;
  favorites: readonly string[];
  onFavoritesChange: (ids: string[]) => void;
  activeMenuItemId?: string;
  onSelectMenuItem?: (item: FrameMenuItem) => void;
  /**
   * PINNED (owner, 2026-10-22): the person's pins (the host passes its starting set while they have
   * none), a 3-per-row tile grid always visible at the sidebar's foot; tiles open a new tab. Omit
   * to hide the section.
   */
  pins?: readonly FramePin[];
  /** Save edited pins (the pencil and the dashed slot open the editor). Omit = not editable. */
  onPinsChange?: (next: FramePin[]) => void;
  /**
   * THE PRODUCT'S OWN NAVIGATION, given by the host (a module's menu, or the page's sidebar
   * through the host's slot). Rendered in the sidebar body in place of the menu rows; the top
   * row, Pinned, the big items and the footer stay. The frame's width governs it.
   */
  sidebarContent?: ReactNode;
  /**
   * THE TOP OF THE PRODUCT'S SIDEBAR (owner, 2026-10-22): Search, a few chosen related places, More
   * (the host's `ProductSidebarTop`), under the top row and above the body. Absent when the body
   * carries its own top (the conversation sidebar).
   */
  sidebarTop?: ReactNode;
  // ── the header ──
  crumbs: readonly FrameCrumb[];
  /** Only when the item can be favorited. */
  favorite?: FrameFavorite;
  /** The "…" items — always shown. See `defaultPageActions`. */
  actions: readonly FrameAction[];
  /**
   * The header's right group (search, intelligence, messages, notifications …) — the HOST's own
   * components, rendered as given before the frame's side chat and canvas toggles. Desktop,
   * wide and medium forms.
   */
  headerTools?: ReactNode;
  /**
   * The same tools on a phone, as data: `phone: "show"` stay in the header, the rest become
   * items in the "…" menu (see `placeholderHeaderTools`).
   */
  phoneTools?: readonly FrameHeaderTool[];
  /** Phone: where back goes. Without it, a nested page shows the menu button. */
  onBack?: () => void;
  /**
   * The bottom of the product sidebar (and of the phone drawer): the host's settings,
   * organization and person controls — always visible, never scrolled away.
   */
  sidebarFooter?: ReactNode;
  /** The person's look and accent (see FrameAppearance). */
  appearance?: FrameAppearance;
  // ── the tabs row (only when given) ──
  tabs?: {
    items: readonly FrameTab[];
    value: string;
    onValueChange: (value: string) => void;
    label: string;
  };
  // ── the body ──
  variant: FrameVariant;
  /** `record` only: the right properties panel. */
  properties?: ReactNode;
  children: ReactNode;
  /** The faint "Ask about this page" input under the body. Off by default; a plain input until sent. */
  askBar?: boolean;
  // ── the footer ──
  status?: ReactNode;
  onHistory?: () => void;
  onHelp?: () => void;
  // ── the frame's heavy modules (each loads on first engagement only) ──
  /** The side chat. Without it the frame shows a labelled stand-in. */
  loadCompanion?: FrameModuleLoader<CompanionProps>;
  /**
   * Whether the side chat is open. Controlled by a host that owns the rule (the live host: the
   * Side Chat's one open / closed rule and cookie, `@ai-matrx/chat/canvas/workspace/side-chat-state`);
   * uncontrolled, the frame keeps it in local state, closed to start.
   */
  companionOpen?: boolean;
  onCompanionOpenChange?: (open: boolean) => void;
  /** The canvas. Without it the frame shows a labelled stand-in. */
  loadCanvas?: FrameModuleLoader<CanvasProps>;
  /**
   * Whether the canvas is open. Controlled by a host whose canvas store decides (the live host:
   * `openCanvasItem(...)` from any page opens it); uncontrolled, local state, closed to start.
   */
  canvasOpen?: boolean;
  onCanvasOpenChange?: (open: boolean) => void;
  /**
   * The canvas in full screen. Controlled by a host whose canvas store decides (the live host: the
   * store's fullscreen, so the pane's own expand control and the shortcut drive the frame too).
   */
  canvasFull?: boolean;
  onCanvasFullChange?: (full: boolean) => void;
  /**
   * The host cannot offer the side chat / canvas yet: its toggle is disabled with this sentence as
   * its tooltip (and leaves the phone "…" menu) — an honest stand-in, never a dead button.
   */
  companionUnavailable?: string;
  canvasUnavailable?: string;
  /** The live (core) host: the header carries the page-header slots (SheetHeader `hostSlots`). */
  hostHeaderSlots?: boolean;
  // ── layout ──
  /** Force a form; by default the frame measures its own width. */
  form?: FrameForm;
  sidebarOpen?: boolean;
  onSidebarOpenChange?: (open: boolean) => void;
  /**
   * The remembered widths, read by the host's server from the
   * frame's cookies (`geometry.ts`), so the first paint is already right. Without it the frame
   * reads the cookies after mount.
   */
  initialGeometry?: FrameInitialGeometry;
  /** PLAYGROUND A/B ONLY (see FrameHeaderEdge); default `fade`. */
  headerEdge?: FrameHeaderEdge;
  /** "Go to" search: same-tab navigation (the host's router); default assigns the location. */
  onGoTo?: (href: string) => void;
  /** "Go to" search: more places the host knows, merged into the index. */
  goToEntries?: GoToSearchProps["extraEntries"];
  /** PLAYGROUND A/B ONLY (see FrameSpace); default `flush` (owner, 2026-10-21). */
  space?: FrameSpace;
  /** PLAYGROUND A/B ONLY (see FrameSidebarColor); default `same` (owner, 2026-10-21). */
  sidebarColor?: FrameSidebarColor;
}

export function formFor(width: number): FrameForm {
  if (width < FRAME_PHONE_BELOW_PX) return "phone";
  if (width < FRAME_MEDIUM_BELOW_PX) return "medium";
  if (width < FRAME_WIDE_FROM_PX) return "desktop";
  return "wide";
}

/** The inline canvas width for a sheet of `sheetWidth` px. */
export function canvasWidthFor(sheetWidth: number): number {
  return Math.round(Math.min(FRAME_CANVAS_MAX_PX, Math.max(FRAME_CANVAS_MIN_PX, sheetWidth * FRAME_CANVAS_SHARE)));
}

function useMeasuredForm(forced: FrameForm | undefined) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [measured, setMeasured] = useState<FrameForm>("desktop");
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || forced) return;
    const read = () => setMeasured(formFor(el.getBoundingClientRect().width));
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [forced]);
  return { ref, form: forced ?? measured };
}

/** The width of an element, kept current (0 until measured, and in a test DOM). */
function useMeasuredWidth() {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!el) return;
    const read = () => setWidth(Math.round(el.getBoundingClientRect().width));
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return [width, setEl] as const;
}

function useControllable(value: boolean | undefined, onChange: ((v: boolean) => void) | undefined, initial: boolean) {
  const [inner, setInner] = useState(initial);
  const current = value ?? inner;
  const set = (next: boolean) => {
    if (value === undefined) setInner(next);
    onChange?.(next);
  };
  return [current, set] as const;
}

/**
 * A remembered width (cookie, this browser). The host's server read (`initial`) paints it in the
 * first frame; without one it is read after mount, so SSR and the first paint still agree.
 */
function useRememberedWidth(cookie: string, initial: number | null | undefined) {
  const [stored, setStored] = useState<number | null>(initial ?? null);
  const serverRead = initial !== undefined;
  useEffect(() => {
    if (serverRead) return;
    const frame = window.requestAnimationFrame(() => {
      const n = parseFrameWidth(readFrameCookie(cookie));
      if (n !== null) setStored(n);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [cookie, serverRead]);
  function remember(width: number) {
    setStored(width);
    writeFrameCookie(cookie, String(Math.round(width)));
  }
  return { stored, setStored, remember };
}

/** True from the first time `on` is true: a module stays mounted (and inert) once engaged. */
function useLatched(on: boolean) {
  const [latched, setLatched] = useState(on);
  if (on && !latched) setLatched(true);
  return latched;
}

export function AppFrame(props: AppFrameProps) {
  const {
    products,
    families,
    product,
    favorites,
    onFavoritesChange,
    activeMenuItemId,
    onSelectMenuItem,
    crumbs,
    favorite,
    actions,
    headerTools,
    phoneTools,
    sidebarFooter,
    onBack,
    tabs,
    variant,
    properties,
    children,
    askBar,
    status,
    loadCompanion,
    loadCanvas,
    onHistory,
    onHelp,
  } = props;
  const { ref, form } = useMeasuredForm(props.form);
  const [sheetWidth, setSheetElement] = useMeasuredWidth();
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useControllable(props.sidebarOpen, props.onSidebarOpenChange, true);
  const geometry = props.initialGeometry;
  const [companionOpen, setCompanionOpen] = useControllable(props.companionOpen, props.onCompanionOpenChange, false);
  const headerEdge = props.headerEdge ?? "fade";
  const [canvasOpen, setCanvasOpen] = useControllable(props.canvasOpen, props.onCanvasOpenChange, false);
  const [canvasFull, setCanvasFull] = useControllable(props.canvasFull, props.onCanvasFullChange, false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [seed, setSeed] = useState<CompanionSeed | undefined>(undefined);
  const [dragging, setDragging] = useState(false);
  const width = useRememberedWidth(FRAME_COMPANION_WIDTH_COOKIE, geometry?.companionWidth);
  const sidebarWidth = useRememberedWidth(FRAME_SIDEBAR_WIDTH_COOKIE, geometry?.sidebarWidth);
  const appearance = frameAppearanceAttributes(props.appearance);
  const sidebarW = Math.min(
    FRAME_SIDEBAR_MAX_PX,
    Math.max(FRAME_SIDEBAR_MIN_PX, sidebarWidth.stored ?? FRAME_SIDEBAR_DEFAULT_PX),
  );
  const drawerRef = useRef<HTMLDivElement>(null);
  const companionOverlayRef = useRef<HTMLDivElement>(null);
  const canvasOverlayRef = useRef<HTMLDivElement>(null);

  const phone = form === "phone";
  const medium = form === "medium";
  const wide = form === "wide";
  // Desktop and wide keep the sidebar inline; medium and phone show it as a drawer.
  const inlineSidebar = form === "desktop" || wide;
  const showSidebar = inlineSidebar && sidebarOpen;
  const drawerShown = !inlineSidebar && drawerOpen;

  // ── the side panels: who is shown, and how wide (THE WIDTH RULES above) ──
  // Below the wide form the side chat and the canvas take turns: the one opened last wins.
  const companionShown = companionOpen && (wide || !canvasOpen);
  // From the desktop form the canvas is a full-height column beside the sheet's content (it takes
  // the header band too, so it never fights for space); on medium and phone it covers the sheet.
  const canvasInline = inlineSidebar;
  const canvasW = canvasWidthFor(sheetWidth);
  const canvasFullShown = canvasOpen && canvasInline && canvasFull;
  // The body row's width: the sheet less the inline canvas (0 until measured).
  const rowWidth = sheetWidth > 0 ? Math.max(0, sheetWidth - (canvasOpen && canvasInline ? canvasW : 0)) : 0;
  const companionMax =
    rowWidth > 0
      ? Math.max(FRAME_COMPANION_MIN_PX, Math.min(FRAME_COMPANION_MAX_PX, rowWidth - FRAME_BODY_MIN_PX))
      : FRAME_COMPANION_MAX_PX;
  const companionW = Math.min(companionMax, Math.max(FRAME_COMPANION_MIN_PX, width.stored ?? FRAME_COMPANION_DEFAULT_PX));
  // Properties fits when the record column keeps BODY_MIN beside it (unmeasured: it yields to an open canvas).
  const propertiesFit = (withCompanion: boolean, withCanvas: boolean) => {
    if (sheetWidth <= 0) return !withCanvas;
    const row = sheetWidth - (withCanvas && canvasInline ? canvasW : 0);
    return row - (withCompanion ? companionW : 0) - FRAME_PROPERTIES_PX >= FRAME_BODY_MIN_PX;
  };
  const hasProperties = Boolean(properties);
  const propertiesShown =
    hasProperties &&
    propertiesOpen &&
    (phone || (medium ? !companionShown && !canvasOpen : propertiesFit(companionShown, canvasOpen)));

  // Covering panels: the phone side chat covers the body; the medium / phone canvas covers the sheet.
  const companionCovers = phone && companionShown;
  const canvasCovers = !canvasInline && canvasOpen;

  const companionMounted = useLatched(companionShown);
  const canvasMounted = useLatched(canvasOpen);

  const [pinsEditor, setPinsEditor] = useState<"edit" | "add" | null>(null);
  const grid: AppGridProps = { products, families, favorites, onFavoritesChange, goToEntries: props.goToEntries, onGo: props.onGoTo };
  const sidebarExtras = {
    pins: props.pins ? withProductMarks(props.pins, products) : undefined,
    pinProducts: products,
    onEditPins: props.onPinsChange ? (mode: "edit" | "add") => setPinsEditor(mode) : undefined,
    content: props.sidebarContent,
    top: props.sidebarTop,
  };
  const goTo: GoToSearchProps = { products, families, onGo: props.onGoTo, extraEntries: props.goToEntries };

  const drawer = useModalPanel({
    open: drawerShown,
    panelRef: drawerRef,
    onClose: () => setDrawerOpen(false),
    root,
  });
  const companionOverlay = useModalPanel({
    open: companionCovers,
    panelRef: companionOverlayRef,
    onClose: () => setCompanionOpen(false),
    root,
  });
  const canvasOverlay = useModalPanel({
    open: canvasCovers,
    panelRef: canvasOverlayRef,
    onClose: () => setCanvasOpen(false),
    root,
  });

  function openDrawer() {
    drawer.rememberOpener();
    setDrawerOpen(true);
  }
  function closeDrawer() {
    setDrawerOpen(false);
  }
  function openCompanion(opener?: HTMLElement | null) {
    if (phone) companionOverlay.rememberOpener(opener);
    if (!wide && canvasOpen) setCanvasOpen(false);
    setCompanionOpen(true);
  }
  function toggleCompanion(opener?: HTMLElement | null) {
    if (companionShown) setCompanionOpen(false);
    else openCompanion(opener);
  }
  function toggleCanvas(opener?: HTMLElement | null) {
    if (canvasOpen) {
      setCanvasOpen(false);
      return;
    }
    if (!canvasInline) canvasOverlay.rememberOpener(opener);
    if (!wide && companionOpen) setCompanionOpen(false);
    setCanvasOpen(true);
  }
  function toggleProperties() {
    if (propertiesShown) {
      setPropertiesOpen(false);
      return;
    }
    setPropertiesOpen(true);
    if (medium) {
      if (companionOpen) setCompanionOpen(false);
      setCanvasOpen(false);
      return;
    }
    // Make room: the canvas goes first, then the side chat if it is still too wide.
    if (!propertiesFit(companionShown, canvasOpen)) {
      setCanvasOpen(false);
      if (!propertiesFit(companionShown, false) && companionOpen) setCompanionOpen(false);
    }
  }
  function sendAsk(text: string, dictate: boolean) {
    setSeed((prev) => ({ id: (prev?.id ?? 0) + 1, text, dictate: dictate || undefined }));
    if (!companionShown) openCompanion();
  }

  // Chosen from the "…" menu, whose item is gone once it closes: focus returns to the menu's trigger.
  const menuTrigger = () => root?.querySelector<HTMLElement>('header [aria-haspopup="menu"]') ?? null;
  const phoneActions: FrameAction[] = [
    {
      id: "open-menu",
      label: `${product.name} menu`,
      icon: Menu,
      onSelect: () => {
        drawer.rememberOpener(menuTrigger());
        setDrawerOpen(true);
      },
    },
    {
      id: "side-chat",
      label: companionShown ? "Close side chat" : "Side chat",
      icon: CHAT_PRODUCT_ICON,
      onSelect: () => toggleCompanion(menuTrigger()),
    },
    {
      id: "canvas",
      label: canvasOpen ? "Close canvas" : "Canvas",
      icon: Shapes,
      onSelect: () => toggleCanvas(menuTrigger()),
    },
  ].filter(
    (a) => !(a.id === "side-chat" && props.companionUnavailable) && !(a.id === "canvas" && props.canvasUnavailable),
  );

  const closeCompanion = () => setCompanionOpen(false);
  const closeCanvas = () => setCanvasOpen(false);
  const companionBody = loadCompanion ? (
    <ModuleSlot
      loader={loadCompanion}
      props={{ onClose: closeCompanion, companionSeed: seed }}
      title="Side chat"
      icon={<CHAT_PRODUCT_ICON />}
      onClose={closeCompanion}
    />
  ) : (
    <CompanionPlaceholder onClose={closeCompanion} />
  );
  // ONE title row (adversarial review, 2026-10-22): a loaded canvas module brings its own pane
  // header (tabs, Expand, Close — the canvas package's, driving the same store the frame reads), so
  // the frame draws its title row only around the stand-in it owns (the lab's placeholder).
  const canvasBody = (
    <div className="flex h-full min-h-0 flex-col">
      {loadCanvas ? null : (
      <PanelTitle
        icon={<Shapes />}
        title="Canvas"
        onClose={closeCanvas}
        closeLabel="Close canvas"
        height="header"
        tools={
          canvasInline ? (
            <Button
              variant="quiet"
              icon={canvasFull ? <Minimize2 /> : <Maximize2 />}
              aria-label={canvasFull ? "Exit full screen" : "Full screen"}
              aria-pressed={canvasFull}
              onClick={() => setCanvasFull(!canvasFull)}
            />
          ) : null
        }
      />
      )}
      <div className="min-h-0 flex-1">
        {loadCanvas ? (
          <ModuleSlot loader={loadCanvas} props={{ onClose: closeCanvas }} title="Canvas" icon={<Shapes />} bare />
        ) : (
          <CanvasPlaceholder />
        )}
      </div>
    </div>
  );

  const sideChatToggle = { open: companionShown, onToggle: () => toggleCompanion(), unavailable: props.companionUnavailable };

  return (
    <div
      ref={(el) => {
        ref.current = el;
        setRoot(el);
      }}
      data-matrx-frame=""
      data-form={form}
      data-variant={variant}
      data-dragging={dragging ? "" : undefined}
      data-header-edge={headerEdge}
      data-space={props.space ?? "flush"}
      data-sidebar-color={props.sidebarColor ?? "same"}
      data-sidebar-shown={showSidebar ? "" : undefined}
      {...appearance.attrs}
      style={appearance.style}
      className="relative flex h-full w-full min-w-0 overflow-hidden"
    >
      <PortalContainerProvider container={root}>
        {/* Desktop sidebar: the outer box slides its width; the content keeps its width. */}
        {inlineSidebar ? (
          <div
            data-mf-owner="frame"
            data-mf-region="sidebar"
            className="mf-slide relative h-full shrink-0"
            style={{ width: showSidebar ? sidebarW : 0 }}
            inert={!showSidebar}
          >
            <div className="h-full overflow-hidden">
              <div className="h-full" style={{ width: sidebarW }}>
                <FrameSidebar
                  product={product}
                  grid={grid}
                  goTo={goTo}
                  activeItemId={activeMenuItemId}
                  onSelectItem={onSelectMenuItem}
                  onHide={() => setSidebarOpen(false)}
                  hideLabel="Hide sidebar"
                  footer={sidebarFooter}
                  {...sidebarExtras}
                />
              </div>
            </div>
            {showSidebar ? (
              <PanelResizeHandle
                label="Resize sidebar"
                edge="right"
                width={sidebarW}
                min={FRAME_SIDEBAR_MIN_PX}
                max={FRAME_SIDEBAR_MAX_PX}
                snapBelow={FRAME_SIDEBAR_MIN_PX - FRAME_SIDEBAR_SNAP_PX}
                onResize={sidebarWidth.setStored}
                onDragChange={setDragging}
                onCommit={sidebarWidth.remember}
                onSnapClose={() => setSidebarOpen(false)}
              />
            ) : null}
          </div>
        ) : null}

        {/* The sheet — inert while the drawer is open. */}
        <div
          className={cn(
            "mf-slide flex h-full min-w-0 flex-1 flex-col p-[var(--matrx-frame-inset)]",
            showSidebar && "pl-0",
          )}
          inert={drawerShown}
        >
          <section ref={setSheetElement} className="mf-sheet relative flex h-full min-h-0 overflow-hidden">
            {/* The sheet's content column — inert while the canvas covers it or is full screen. */}
            <div
              className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
              inert={canvasCovers || canvasFullShown}
            >
              <SheetHeader
                form={form}
                crumbs={crumbs}
                favorite={favorite}
                actions={actions}
                phoneActions={phoneActions}
                tools={headerTools}
                phoneTools={phoneTools}
                canvasToggle={{ open: canvasOpen, onToggle: () => toggleCanvas(), unavailable: props.canvasUnavailable }}
                sideChatToggle={SIDE_CHAT_DOOR === "header" ? sideChatToggle : undefined}
                topEdge={!tabs}
                start={
                  !phone && !showSidebar ? (
                    <SidebarRestore
                      onShow={() => (inlineSidebar ? setSidebarOpen(true) : openDrawer())}
                      grid={<AppGrid {...grid} currentProductId={product.id} />}
                      goTo={<GoToSearch {...goTo} />}
                    />
                  ) : undefined
                }
                onOpenDrawer={openDrawer}
                onBack={onBack}
                hostSlots={props.hostHeaderSlots}
              />
              {tabs ? (
                <div
                  data-mf-owner="frame"
                  data-mf-region="tabs"
                  className="mf-top-edge mf-noscrollbar mf-tabs-row flex h-[var(--matrx-frame-tabs-h)] shrink-0 items-center overflow-x-auto"
                >
                  <Tabs
                    variant="capsule"
                    aria-label={tabs.label}
                    value={tabs.value}
                    onValueChange={tabs.onValueChange}
                    data={tabs.items.map((t) => ({ value: t.value, label: t.label, count: t.count }))}
                  />
                </div>
              ) : null}

              <div className="relative flex min-h-0 flex-1 overflow-hidden">
                {/* The body (and the ask bar, in flow below it so it never covers the page's last line). */}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col" inert={companionCovers}>
                  <div data-mf-owner="page" data-mf-region="body" className="flex min-h-0 min-w-0 flex-1">
                    <FrameBody variant={variant} phone={phone} properties={propertiesShown ? properties : undefined}>
                      {children}
                    </FrameBody>
                  </div>
                  {askBar ? <AskBar onSend={sendAsk} /> : null}
                </div>

                {!phone ? (
                  <div
                    data-mf-owner="frame"
                    data-mf-region="side-chat"
                    className="mf-slide mf-rule-l relative h-full shrink-0"
                    style={{ width: companionShown ? companionW : 0, borderLeftWidth: companionShown ? 1 : 0 }}
                    inert={!companionShown}
                    role="complementary"
                    aria-label="Side chat"
                  >
                    {companionShown ? (
                      <PanelResizeHandle
                        label="Resize side chat"
                        width={companionW}
                        min={FRAME_COMPANION_MIN_PX}
                        max={companionMax}
                        snapBelow={FRAME_COMPANION_MIN_PX - FRAME_COMPANION_SNAP_PX}
                        onResize={width.setStored}
                        onDragChange={setDragging}
                        onCommit={width.remember}
                        onSnapClose={closeCompanion}
                      />
                    ) : null}
                    <div className="h-full overflow-hidden">
                      <div className="h-full" style={{ width: companionW }}>
                        {companionMounted ? companionBody : null}
                      </div>
                    </div>
                  </div>
                ) : companionMounted ? (
                  // Phone: the side chat covers the body; once loaded it stays mounted, hidden and inert while closed.
                  <div
                    ref={companionOverlayRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Side chat"
                    data-mf-owner="frame"
                    data-mf-region="side-chat"
                    onKeyDown={companionOverlay.onKeyDown}
                    inert={!companionCovers}
                    className={cn(
                      "mf-surface-sheet matrx-touch-targets absolute inset-0 z-10",
                      !companionCovers && "invisible",
                    )}
                  >
                    {companionBody}
                  </div>
                ) : null}
              </div>

              {!phone ? (
                <SheetFooter
                  status={status}
                  propertiesToggle={hasProperties ? { shown: propertiesShown, onToggle: toggleProperties } : undefined}
                  onHistory={onHistory}
                  onHelp={onHelp}
                />
              ) : null}
            </div>

            {canvasInline ? (
              // The canvas column: full sheet height; full screen takes the whole sheet (the sidebar stays).
              <div
                data-mf-owner="frame"
                data-mf-region="canvas"
                className="mf-slide mf-rule-l h-full shrink-0 overflow-hidden"
                style={{
                  width: canvasOpen ? (canvasFull ? "100%" : canvasW) : 0,
                  borderLeftWidth: canvasOpen && !canvasFull ? 1 : 0,
                }}
                inert={!canvasOpen}
                role="complementary"
                aria-label="Canvas"
              >
                <div className="h-full" style={{ width: canvasFull ? "100%" : canvasW }}>
                  {canvasMounted ? canvasBody : null}
                </div>
              </div>
            ) : canvasMounted ? (
              // Medium and phone: the canvas covers the sheet, header band included; it stays mounted once loaded.
              <div
                ref={canvasOverlayRef}
                role="dialog"
                aria-modal="true"
                aria-label="Canvas"
                data-mf-owner="frame"
                data-mf-region="canvas"
                onKeyDown={canvasOverlay.onKeyDown}
                inert={!canvasCovers}
                className={cn(
                  "mf-surface-sheet matrx-touch-targets absolute inset-0 z-10",
                  !canvasCovers && "invisible",
                )}
              >
                {canvasBody}
              </div>
            ) : null}
          </section>
        </div>

        {/* The drawer (medium + phone): inside the frame, not the window, so it follows the frame's box. */}
        {!inlineSidebar ? (
          <div
            // matrx-touch-targets: drawer rows and buttons get the platform's 44px touch floor.
            data-mf-owner="frame"
            data-mf-region="drawer"
            className={cn("mf-drawer-layer matrx-touch-targets absolute inset-0 z-20", !drawerShown && "invisible")}
            data-open={drawerShown ? "" : undefined}
            inert={!drawerShown}
          >
            <button
              type="button"
              aria-label="Close menu"
              tabIndex={-1}
              className={cn("mf-slide mf-scrim absolute inset-0", drawerShown ? "opacity-100" : "opacity-0")}
              onClick={closeDrawer}
            />
            <div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label={`${product.name} menu`}
              onKeyDown={drawer.onKeyDown}
              className={cn(
                "mf-slide mf-surface-canvas mf-drawer-w absolute inset-y-0 left-0",
                drawerShown ? "translate-x-0" : "-translate-x-full",
              )}
            >
              <FrameSidebar
                product={product}
                grid={grid}
                goTo={goTo}
                activeItemId={activeMenuItemId}
                onSelectItem={(item) => {
                  onSelectMenuItem?.(item);
                  closeDrawer();
                }}
                onHide={closeDrawer}
                hideLabel="Close menu"
                footer={sidebarFooter}
                {...sidebarExtras}
              />
            </div>
          </div>
        ) : null}
        {props.onPinsChange && props.pins ? (
          <PinsEditor
            open={pinsEditor !== null}
            onOpenChange={(open) => !open && setPinsEditor(null)}
            mode={pinsEditor ?? "edit"}
            pins={withProductMarks(props.pins, products)}
            products={products}
            onSave={props.onPinsChange}
          />
        ) : null}
      </PortalContainerProvider>
    </div>
  );
}

function FrameBody({
  variant,
  phone,
  properties,
  children,
}: {
  variant: FrameVariant;
  phone: boolean;
  properties?: ReactNode;
  children: ReactNode;
}) {
  if (variant === "workspace") {
    return <div className="mf-scroll-top relative min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>;
  }
  if (variant === "list") {
    return <div className="mf-scroll-top min-h-0 min-w-0 flex-1 overflow-auto">{children}</div>;
  }
  if (variant === "light") {
    return (
      <div className="mf-scroll-top min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-[var(--matrx-frame-gutter)] py-6">{children}</div>
      </div>
    );
  }
  // record: a centered content column (never under the body min width) + optional properties panel.
  return (
    <>
      <div
        className={cn(
          "mf-scroll-top min-h-0 flex-1 overflow-y-auto",
          phone ? "min-w-0" : "min-w-[var(--matrx-frame-body-min-w)]",
        )}
      >
        <div className="mx-auto w-full max-w-3xl px-[var(--matrx-frame-gutter)] py-8">
          {children}
          {phone && properties ? <div className="mf-rule-t mt-8 pt-4">{properties}</div> : null}
        </div>
      </div>
      {!phone && properties ? (
        <aside
          aria-label="Properties"
          data-mf-owner="page"
          data-mf-region="properties"
          className="mf-scroll-top mf-rule-l w-[var(--matrx-frame-properties-w)] shrink-0 overflow-y-auto px-4 py-4"
        >
          {properties}
        </aside>
      ) : null}
    </>
  );
}
