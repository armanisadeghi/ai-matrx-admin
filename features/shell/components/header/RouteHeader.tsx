// RouteHeader — the canonical three-part route header.
//
// Pass three nodes; it handles everything else:
//   - Injects into the shell header center slot via <PageHeader> (transparent,
//     no border/background — children bring their own glass).
//   - LEFT | CENTER | RIGHT are three IN-FLOW grid cells, so the center can
//     never paint over the title or the actions — not before the first
//     measurement, not in a hidden tab whose ResizeObservers are frozen.
//     (2026-09-27: the center used to be `absolute left-1/2`; a stale
//     measurement drew /applets/manage/<id>'s "Switch view" over "Fact Checker
//     Published" at 768px.) Inside its clipping cell the center is inset to the
//     symmetric slot (`total - 2 * max(left, right)`), so it still sits on the
//     header's true center and never shifts when left/right widths change.
//   - When not even the collapsed nav fits that symmetric slot, RouteModeNav
//     drops the inset (`data-route-nav-inflow`) and sits in the whole cell
//     beside the title, instead of vanishing. The title yields down to its
//     floor to make room for the nav's smallest trigger (`data-route-nav-min`).
//
//   <RouteHeader
//     left={<><BackButton /><span>{title}</span></>}
//     center={<ModeNav ... />}
//     right={<CopyButton ... />}
//   />
//
// Pairs with the `paddingTop: var(--shell-header-h)` content pattern on the
// page so the body flows seamlessly under the transparent header.
//
// Rules (enforced by convention — see the route-header skill):
//   - ONE canonical control per choice. Don't add a second control (e.g. a
//     dropdown in `left`) that duplicates a selection already owned by `center`.
//   - Header regions must NOT resize with their content. Use static labels or
//     fixed/min-w slots — never a content-sized control that shifts the layout.
//   - Tap buttons self-space (44pt touch target). Don't add gap/padding around
//     them inside a region; space only non-tap items with margins.
//
// Narrow widths (platform behavior, inherited by every consumer — 2026-09-25):
//   - RIGHT folds. Pass actions as siblings (fragments are fine); when they do not all
//     fit beside a title of TITLE_MIN_PX, the leftmost fold into ONE "…" overflow that
//     opens them as a glass strip. Order your actions lowest-priority first, primary
//     last. A single wrapper component is one action and cannot fold — pass siblings,
//     or give the component a `routeHeaderActions` static that returns them (HeaderActions
//     does): each is then its own action, named by the label it declares. A node that is
//     never drawn (a `hidden` file input) stays mounted but is never an action.
//   - The PRIMARY (last) action stays visible — on a phone too: below 768px the other
//     actions move into the shell's ⋮ sheet, the primary stays in the row (icon-only
//     when it is a labeled tap button). On a phone a MENU is never the primary (it
//     would be a second overflow beside the ⋮): it goes to the sheet, and the primary
//     is the last non-menu action; one marked `data-route-header-secondary` goes to the sheet too. Menus are known by identity (`isMenuAction`); a
//     page's own menu component declares `routeHeaderMenu = true`. Secondary actions fold first; then a
//     labeled tap button (`label` + `icon`) goes icon-only — caption kept as its
//     accessible name and tooltip — instead of folding into "…".
//   - LEFT always ellipsizes. Loose text inside a flex/grid host element is wrapped in a
//     truncating span (see route-header-layout.tsx), so a clipped title ends in "…".

"use client";

import { useYieldedFallback } from "./useYieldedFallback";
import {
  Fragment,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal, flushSync } from "react-dom";
import { usePathname } from "next/navigation";
import { defineClientKeyFamily } from "@/lib/sync/client-storage";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import {
  setPhonePageActionCount,
  usePhonePageActions,
} from "./phone-page-actions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  TapDefaultVariant,
} from "@ai-matrx/design-system";
import { MoreHorizontalTapButton } from "@ai-matrx/design-system/tap-target/buttons";
import PageHeader from "./PageHeader";
import {
  COMPACT_ACTION_PX,
  DEFAULT_ACTION_PX,
  TITLE_FLOOR_PX,
  TITLE_MIN_PX,
  ellipsizeLooseText,
  emptyActionKeys,
  fitActions,
  foldableActions,
  flattenActions,
  forwardRowTap,
  iconOnlyLabel,
  isDestructiveAction,
  isMenuAction,
  isSecondaryAction,
  OverflowMenuItem,
  overflowItemLabel,
  RESPONSIVE_DISPLAY,
  splitFolded,
  toIconOnly,
} from "./route-header-layout";

interface RouteHeaderProps {
  /** Back affordance + title/identity. Kept layout-stable (no content-sized controls). */
  left?: React.ReactNode;
  /** The canonical navigation/selection for this route's sub-views. Stays centered. */
  center?: React.ReactNode;
  /** Contextual actions, lowest priority first. Pass siblings — they fold into "…" when the row is narrow. */
  right?: React.ReactNode;
  /** Yield to any page-specific header mounted deeper in the route tree. */
  fallback?: boolean;
  /**
   * Keep the center in the row on a phone instead of moving it into the ⋮
   * sheet. For a route whose center IS its primary control and collapses
   * itself to one compact trigger (the chat's Chat · Work · Advanced switch —
   * "a genuinely great concept" keeps its richer phone header). Default: sheet.
   */
  centerOnPhone?: "sheet" | "row";
}

const noopSubscribe = () => () => {};

// THE ACTION CLUSTER KEEPS ITS WIDTH FROM THE FIRST PAINT. The page's actions arrive after hydration (a table's
// views, share, add), and the right-aligned cluster grew leftwards from 451px to 603px, nudging the row (CLS 0.012-0.028
// on /data/<table>). The cluster remembers the width it last settled at, per screen shape, and reserves it on the next
// visit; a screen never seen reserves the measured first-visit width below (the same idea as useReservedSlot).
const clusterWidths = defineClientKeyFamily({
  id: "route-header.cluster-width",
  area: "local",
  kind: "ui-layout",
  reason: "Settled width of a route header's action cluster on this screen, reserved before its actions mount.",
  legacyKey: (suffix) => `matrx:route-header-cluster:${suffix}`,
});
// …AND SO DOES EACH ACTION. The primary grew 80 → 204 px when its label landed, pushing every neighbour
// (CLS 0.0008 at 1440). Each action remembers the width it settled at, per screen shape and action key, and
// is drawn at that width from its first frame; the cluster is anchored to the RIGHT edge so an action that
// arrives later fills the reserved room to its left instead of nudging the ones already on screen.
const actionWidths = defineClientKeyFamily({
  id: "route-header.action-width",
  area: "local",
  kind: "ui-layout",
  reason: "Settled width of one route-header action on this screen, reserved before its label lands.",
  legacyKey: (suffix) => `matrx:route-header-action:${suffix}`,
});
/** Measured on a cold browser 2026-10-16, desktop width, per screen shape then action key. */
const FIRST_VISIT_ACTION_PX: Record<string, Record<string, number>> = {
  "data-table:wide": {
    ".0/.$live-column": 134,
    ".0/.$sync-into": 34,
    ".0/.$access": 204,
    ".0/.$workbook-link": 34,
    ".0/.8/.$ask": 46,
    ".0/.8/.$share": 58,
    ".0/.8/.$menu": 39,
  },
};
/**
 * THE REMEMBERED WIDTHS BELONG TO THE ACTION SET, NOT JUST THE SCREEN SHAPE (lane ZERO-4). A member's
 * /data/<table> header draws a different set of actions than an admin's, so one record per screen
 * shape made each role reserve the other's widths. The record is keyed by screen shape plus a hash of
 * the action keys, so every role keeps its own.
 */
export const actionSetId = (surface: string, actionKeys: readonly string[]): string => {
  let h = 5381;
  for (const ch of [...actionKeys].sort().join("|")) h = ((h << 5) + h + ch.charCodeAt(0)) | 0;
  return `${surface}#${(h >>> 0).toString(36)}`;
};
export const reservedActionWidth = (
  stored: Record<string, number> | null,
  surface: string,
  key: string,
): number | undefined => {
  const w = stored?.[key] ?? FIRST_VISIT_ACTION_PX[surface]?.[key];
  return w && w > 0 ? w : undefined;
};
/** A reserved action is right-anchored inside its room, so a sibling button that lands later (Find duplicates beside Activity) fills the room to its left. */
export const reservedActionStyle = (w: number | undefined) => (w ? { minWidth: w, justifyContent: "flex-end" as const } : undefined);
/** Measured on a cold browser 2026-10-16, desktop width. A phone's cluster is the primary action alone. */
const FIRST_VISIT_CLUSTER_PX: Record<string, number> = { "data-table:wide": 610 };
const clusterSurface = (pathname: string | null, wide: boolean): string => {
  const shape = (pathname ?? "")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "_")
    .replace(/^\/data\/_$/, "data-table");
  return `${shape}:${wide ? "wide" : "narrow"}`;
};

/** Breathing room an in-flow center keeps from the title and the actions. */
export const CENTER_INFLOW_GUTTER = 16;

/** The breathing room from the flanks a centered control keeps (useCenterControlFit's). */
const CENTER_FLANK_GUTTER_PX = 32;

export function centerSlotWidth(
  total: number,
  leftWidth: number,
  rightWidth: number,
): number {
  if (total <= 0) return 0;
  // Center is pinned at 50%; the nav may extend equally left/right from there.
  return Math.max(0, total - 2 * Math.max(leftWidth, rightWidth));
}

/**
 * The cap on the title that leaves the center nav its smallest trigger, or
 * null (no cap) when there is no nav, or when even a title at its floor leaves
 * too little for that trigger — the nav cannot draw, so the title keeps the room.
 */
export function titleMaxWidth(
  total: number,
  rightWidth: number,
  navMin: number,
  floor: number,
): number | null {
  if (navMin <= 0) return null;
  const cap = total - rightWidth - navMin - CENTER_INFLOW_GUTTER;
  return cap >= floor ? cap : null;
}

/**
 * The title's grid track once measured. When the center control's widest face fits at the true
 * center, the title's track is FIXED at the room left of it (`fixed`): the title draws left-aligned
 * inside it and ellipsizes there, so a title of any length leaves the center cell, the centering
 * inset and the control exactly where they were (2026-10-22, chat-switch-stability: a
 * `fit-content` track moved the center cell 52px on every chat switch between a short and a long
 * title, and the control with it for one frame). Otherwise the old rule: the title takes its
 * natural width up to the cap that keeps the smallest trigger on screen.
 */
export function titleTrack(
  total: number,
  rightWidth: number,
  navFull: number,
  navMin: number,
  floor: number,
): { max: number | null; fixed: boolean } {
  const centeredCap =
    navFull > 0 ? Math.floor((total - navFull) / 2 - CENTER_FLANK_GUTTER_PX / 2) : null;
  const inflowCap = titleMaxWidth(total, rightWidth, navMin, floor);
  if (centeredCap != null && centeredCap >= floor && rightWidth <= centeredCap) {
    return { max: Math.min(centeredCap, inflowCap ?? centeredCap), fixed: true };
  }
  return { max: inflowCap, fixed: false };
}

/** The measured header's grid columns (null pad = not measured yet: CSS-only centering). */
export function routeHeaderColumns(
  centerPad: { left: number; right: number } | null,
  track: { max: number | null; fixed: boolean },
): string {
  if (centerPad == null) return "minmax(max-content, 1fr) auto minmax(max-content, 1fr)";
  const left =
    track.max == null ? "auto" : track.fixed ? `${track.max}px` : `fit-content(${track.max}px)`;
  return `${left} minmax(0, 1fr) auto`;
}

/** The left region's natural (unclipped) width, read without a paint. */
function naturalWidth(el: HTMLElement): number {
  // `maxWidth` too: the global `* { max-width: 100% }` would cap the probe at
  // the (grid-track) box it is trying to see past.
  const { width, flexShrink, maxWidth } = el.style;
  el.style.width = "max-content";
  el.style.flexShrink = "0";
  el.style.maxWidth = "none";
  const w = el.offsetWidth;
  el.style.width = width;
  el.style.flexShrink = flexShrink;
  el.style.maxWidth = maxWidth;
  return w;
}

/** Width of the left region's icon-only controls (back chevron etc.) — not title. */
function iconControlsWidth(el: HTMLElement): number {
  let total = 0;
  el.querySelectorAll<HTMLElement>("button, a, [role='button']").forEach((c) => {
    if (c.parentElement?.closest("button, a, [role='button']")) return;
    if (!c.textContent?.trim()) total += c.offsetWidth;
  });
  return total;
}

/**
 * Whether `el` (or an ancestor, up to `boundary` inclusive) is hidden at the
 * narrow width the phone sheet renders at: Tailwind's `hidden <bp>:<display>`
 * pair (e.g. `hidden sm:inline`) draws only at `<bp>` and wider — invisible on
 * every phone width — while its text still sits in `textContent` regardless
 * (2026-09-27 follow-up: ConversationRecordsChip's "Records" caption).
 */
function isHiddenAtPhoneWidth(el: HTMLElement | null, boundary: HTMLElement): boolean {
  let node = el;
  while (node) {
    const classes = typeof node.className === "string" ? node.className.split(/\s+/).filter(Boolean) : [];
    if (classes.includes("hidden") && classes.some((c) => RESPONSIVE_DISPLAY.test(c))) return true;
    if (node === boundary) break;
    node = node.parentElement;
  }
  return false;
}

/** Whether `root` renders any real word text a phone actually draws. */
function hasVisibleWords(root: HTMLElement | null): boolean {
  if (!root) return false;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.textContent ?? "";
    if (!/[\p{L}\p{N}]{2,}/u.test(text)) continue;
    if (!isHiddenAtPhoneWidth(n.parentElement, root)) return true;
  }
  return false;
}

/**
 * A fetched table's source bar (Refresh · quote, Get more · quote, View changes) is one row in the
 * page header. In any menu (the "…" popover, the phone sheet) it reads as a vertical list, one action
 * per row, as wide as the menu and never wider (it once drew 1004 px wide and ran under the sidebar).
 */
const FETCHED_BAR_AS_MENU =
  "[&_[data-fetched-source-bar]]:w-full [&_[data-fetched-source-bar]]:min-w-0 [&_[data-fetched-source-bar]>div:first-child]:flex-col [&_[data-fetched-source-bar]>div:first-child]:items-stretch [&_[data-fetched-source-bar]>div:first-child]:gap-0.5 [&_[data-fetched-source-bar]>div:first-child>span:empty]:hidden [&_[data-fetched-source-bar]>div:first-child>:first-child]:self-start [&_[data-fetched-source-bar]>div:first-child>button]:justify-start [&_[data-fetched-source-bar]>div:first-child>.truncate]:whitespace-normal [&_[data-fetched-source-bar]>div:first-child>.truncate]:break-words";

/**
 * One action in the phone sheet's "This page" section: the control plus its
 * name. The declared name first (`overflowItemLabel`); a control that declares
 * none (a record's own "…" menu) is named by the accessible name it renders —
 * in a list a bare icon is neither absent nor honest.
 */
export function PhoneSheetAction({ action }: { action: ReturnType<typeof flattenActions>[number] }) {
  const declared = overflowItemLabel(action.node);
  const ref = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (declared) return;
    const control = ref.current?.querySelector<HTMLElement>("[aria-label], [title]");
    const name = control?.getAttribute("aria-label") ?? control?.getAttribute("title") ?? null;
    // Visible words already name it; a glyph ("…", "+") does not — but a
    // caption `hidden` at this width (a desktop-only `sm:inline` label) is
    // neither: it never draws here, so it never already named the row.
    const words = hasVisibleWords(ref.current);
    setRendered(words ? null : name);
  }, [declared]);
  const label = declared ?? rendered;
  return (
    <div ref={ref} data-route-header-overflow-item className={`flex min-w-0 max-w-full shrink-0 items-center gap-1.5 px-1 [&:has([data-fetched-source-bar])]:w-full ${FETCHED_BAR_AS_MENU}`} onClick={forwardRowTap}>
      {action.node}
      {label ? <span data-phone-sheet-label className="whitespace-nowrap type-secondary text-muted-foreground">{label}</span> : null}
    </div>
  );
}

export default function RouteHeader({
  left,
  center,
  right,
  fallback = false,
  centerOnPhone = "sheet",
}: RouteHeaderProps) {
  // State, not a ref: the row mounts through a portal whose target is found in an
  // effect, so on RouteHeader's own first layout pass there is no row yet. A ref
  // left the measuring effect bailed out forever on pages whose actions never
  // change (nothing folded, the center never bounded).
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const overflowRef = useRef<HTMLSpanElement>(null);
  const widthsRef = useRef(new Map<string, number>());
  // The center cell's inset that puts its content box on the header's true
  // center, and the cap on the title that keeps room for the nav's smallest
  // trigger. Unmeasured (null) is safe: the cells are in flow, so a stale or
  // missing measurement can only leave the nav off-center, never on top.
  const [centerPad, setCenterPad] = useState<{ left: number; right: number } | null>(null);
  const [leftTrack, setLeftTrack] = useState<{ max: number | null; fixed: boolean }>({ max: null, fixed: false });
  const [folded, setFolded] = useState(0);
  const [emptyKeys, setEmptyKeys] = useState<string>("");
  const [compactPrimary, setCompactPrimary] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);

  const flat = flattenActions(right);
  // A never-drawn node (a hidden file input a button opens) stays mounted but is not an action.
  const actions = flat.filter((a) => !a.inert);
  const inert = flat.filter((a) => a.inert);
  // An action that draws nothing right now (a bar that renders null) stays mounted in the row but is not a fold position.
  const foldable = foldableActions(actions, emptyKeys);
  const leftNode = ellipsizeLooseText(left);
  const actionKeys = actions.map((a) => a.key).join("|");
  const fold = Math.min(folded, foldable.length);
  const primary = foldable.length > 0 ? foldable[foldable.length - 1] : null;
  const primaryCanCompact = primary != null && iconOnlyLabel(primary.node) != null;
  const compact = compactPrimary && primaryCanCompact;
  const isPhone = useIsMobile();
  const pathname = usePathname();
  const surface = clusterSurface(pathname, !isPhone);
  // The first-visit width is reserved from the SERVER's HTML on (CLOSE-PERF, CD-PERF-01): the shell decides
  // whether to fold its own controls before the first paint, from the route header the server drew.
  const [reservedCluster, setReservedCluster] = useState<number | null>(() => FIRST_VISIT_CLUSTER_PX[surface] ?? null);
  useLayoutEffect(() => {
    const stored = Number(clusterWidths.getJSON<number>(surface));
    setReservedCluster(stored > 0 ? stored : (FIRST_VISIT_CLUSTER_PX[surface] ?? null));
  }, [surface]);
  const [reservedActions, setReservedActions] = useState<Record<string, number> | null>(null);
  const setId = actionSetId(surface, actions.map((a) => a.key));
  useLayoutEffect(() => {
    setReservedActions(actionWidths.getJSON<Record<string, number>>(setId) ?? null);
  }, [setId]);
  const { host: phoneHost } = usePhonePageActions();
  const yielded = useYieldedFallback(fallback);
  // The section nav folds too (page-pass shared defects, 2026-09-27): on a
  // phone the title gets the row and the nav is the first thing in the ⋮ sheet.
  const centerToSheet =
    centerOnPhone === "sheet" && isPhone && !yielded && phoneHost != null && center != null;
  const hasCenter = Boolean(center) && !centerToSheet;

  // Latest render's inputs for the (stable) observer callback.
  const liveRef = useRef({ actions: foldable, fold, compact });
  useLayoutEffect(() => {
    liveRef.current = { actions: foldable, fold, compact };
  });

  useLayoutEffect(() => {
    if (!root) return;

    const measure = () => {
      const leftEl = leftRef.current;
      const rightEl = rightRef.current;
      const {
        actions: current,
        fold: currentFold,
        compact: currentCompact,
      } = liveRef.current;

      // Record every action currently in the row; folded ones keep their last width.
      // An icon-only primary records under its own key so its labeled width survives.
      rightEl
        ?.querySelectorAll<HTMLElement>("[data-route-header-action]")
        .forEach((el) => {
          const key = el.dataset.routeHeaderAction;
          if (!key) return;
          const slot =
            el.dataset.routeHeaderCompact != null ? `${key}#icon-only` : key;
          // A breakpoint twin (server HTML only) is not the row's real action.
          if (el.dataset.routeHeaderTwin != null) return;
          widthsRef.current.set(slot, el.offsetWidth);
        });
      // Which of the drawn actions draw nothing (width 0): they never take a fold position.
      const empties = emptyActionKeys(
        Array.from(rightEl?.querySelectorAll<HTMLElement>("[data-route-header-action]") ?? [])
          .filter((el) => el.dataset.routeHeaderTwin == null && el.dataset.routeHeaderCompact == null)
          .map((el) => ({ key: el.dataset.routeHeaderAction ?? "", width: el.offsetWidth })),
      );
      setEmptyKeys((prev) => (prev === empties ? prev : empties));

      // The title keeps TITLE_MIN_PX of TEXT beside any back chevron, or its
      // whole natural width when that is smaller.
      const natural = leftEl ? naturalWidth(leftEl) : 0;
      const chrome = leftEl ? iconControlsWidth(leftEl) : 0;
      const reserve = Math.min(natural, chrome + TITLE_MIN_PX);
      const floor = Math.min(natural, chrome + TITLE_FLOOR_PX);
      const overflowWidth = overflowRef.current?.offsetWidth || DEFAULT_ACTION_PX;
      const widths = current.map(
        (a) => widthsRef.current.get(a.key) ?? DEFAULT_ACTION_PX,
      );
      const last = current[current.length - 1];
      const compactWidth =
        last && iconOnlyLabel(last.node) != null
          ? (widthsRef.current.get(`${last.key}#icon-only`) ?? COMPACT_ACTION_PX)
          : undefined;
      const next = fitActions(
        widths,
        root.clientWidth - reserve,
        overflowWidth,
        root.clientWidth - floor,
        compactWidth,
      );
      if (next.fold !== currentFold) setFolded(next.fold);
      if (next.compactPrimary !== currentCompact)
        setCompactPrimary(next.compactPrimary);

      if (!hasCenter || root.clientWidth <= 0) return;
      const leftWidth = leftEl?.offsetWidth ?? 0;
      const rightWidth = rightEl?.offsetWidth ?? 0;
      const pad = { left: Math.max(0, rightWidth - leftWidth), right: Math.max(0, leftWidth - rightWidth) };
      setCenterPad((prev) => (prev?.left === pad.left && prev.right === pad.right ? prev : pad));
      // Room for the nav's smallest trigger comes out of the title, down to its
      // floor. When even the floor leaves too little for that trigger, the nav
      // cannot draw at all — so the title keeps its room instead of yielding it
      // to an empty center (2026-10-03: /war-room/<id> beside the canvas drew
      // "Acme…" at 42px beside a blank 56px gap).
      const navMin = root.querySelector<HTMLElement>("[data-route-nav-min]")?.scrollWidth ?? 0;
      // 🚨 THE CENTER CONTROL NEVER MOVES WITH THE TITLE (2026-10-21, chat-switch-stability).
      // A long title used to push the center switch out of the true center (in flow, or
      // its compact face), so every chat switch between a short and a long title moved
      // the switch sideways. The title now yields first: it stops where the control's
      // widest face, at the true center, begins — down to its floor; below that the
      // old rule (smallest trigger) applies.
      const navFull = Math.max(
        0,
        ...Array.from(
          root.querySelectorAll<HTMLElement>("[data-route-header-center] [inert] > *"),
        ).map((el) => el.scrollWidth),
      );
      const track = titleTrack(root.clientWidth, rightWidth, navFull, navMin, floor);
      setLeftTrack((prev) => (prev.max === track.max && prev.fixed === track.fixed ? prev : track));
    };

    measure();
    // 🚨 A REMEASURE COMMITS BEFORE THE FRAME PAINTS (2026-10-21, chat-switch-stability).
    // Observer and frame callbacks run between layout and paint, but a plain setState
    // there renders in a later task — so a new title painted one frame with the OLD
    // centering pad and the center switch jumped sideways on every chat switch.
    // `flushSync` lands the new geometry in the same frame as the content.
    const measureNow = () => flushSync(measure);
    // PageHeader mounts through a portal. Its first layout pass can happen
    // before the injection slot has its final width, so measure once more on
    // the next frame instead of leaving the center unmeasured.
    const frame = requestAnimationFrame(measureNow);
    const ro = new ResizeObserver(measureNow);
    ro.observe(root);
    if (root.parentElement) ro.observe(root.parentElement);
    if (leftRef.current) ro.observe(leftRef.current);
    if (rightRef.current) ro.observe(rightRef.current);
    // The cluster's settled width is what the next visit reserves.
    const remember = window.setTimeout(() => {
      const w = Math.round(rightRef.current?.getBoundingClientRect().width ?? 0);
      if (w > 0) clusterWidths.setJSON(surface, w);
      const settled: Record<string, number> = {};
      rightRef.current?.querySelectorAll<HTMLElement>("[data-route-header-action]").forEach((el) => {
        const key = el.dataset.routeHeaderAction;
        if (!key || el.dataset.routeHeaderTwin != null || el.dataset.routeHeaderCompact != null) return;
        if (el.offsetWidth > 0) settled[key] = Math.round(el.offsetWidth);
      });
      if (Object.keys(settled).length > 0) actionWidths.setJSON(setId, settled);
    }, 4000);
    // A nav can mount after this effect (a center that waits for data): watch
    // the center's content so its smallest trigger still gets its room.
    let navMinEl: HTMLElement | null = null;
    const watchNav = () => {
      const next = root.querySelector<HTMLElement>("[data-route-nav-min]");
      if (next === navMinEl) return;
      if (navMinEl) ro.unobserve(navMinEl);
      navMinEl = next;
      if (navMinEl) {
        ro.observe(navMinEl);
        if (watching) measureNow();
        else measure();
      }
    };
    let watching = false;
    watchNav();
    watching = true;
    const centerEl = root.querySelector<HTMLElement>("[data-route-header-center]");
    const mo = new MutationObserver(watchNav);
    if (centerEl) mo.observe(centerEl, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(remember);
      ro.disconnect();
      mo.disconnect();
    };
    // Re-measure when the row mounts and whenever the set of actions, the
    // fold point, or the presence of a center changes.
  }, [root, actionKeys, fold, compact, hasCenter, surface, setId]);

  // 🚨 ON A PHONE THE SECONDARY ACTIONS LIVE IN THE SHELL'S ⋮ (page-pass
  // shared defects, 2026-09-27): one overflow button per phone header, and the
  // title gets most of the row. They are PORTALED into the ⋮ sheet's host node,
  // so each stays mounted in this page's tree. See `phone-page-actions.ts`.
  // 🚨 THE PRIMARY (last) ACTION NEVER LEAVES THE ROW (2026-09-27): a page's
  // main action is never reachable only through a menu — "Submit all" on
  // /agents/battle, "New meeting" on /meetings. It stays, icon-only when it is
  // a labeled tap button (caption kept as its accessible name + tooltip).
  // 🚨 A MENU IS NEVER THE PRIMARY (2026-09-27): a page's own "…" / record
  // menu kept in the row sat beside the shell's ⋮ — two overflow buttons. It
  // goes to the sheet; the primary is the last action that is NOT a menu.
  const toSheet = isPhone && !yielded && phoneHost != null && actions.length > 0;
  // The action a phone keeps in the row — known without knowing it IS a
  // phone, so the server HTML can mark it (`data-route-header-phone-primary`)
  // and the pre-hydration header draws the phone row exactly.
  const phonePrimaryCandidate =
    [...actions]
      .reverse()
      .filter((a) => !isSecondaryAction(a.node))
      .find((a) => !isMenuAction(a.node) && !isDestructiveAction(a.node)) ?? null;
  const phonePrimary = toSheet
    ? phonePrimaryCandidate
    : null;
  // A destructive action goes LAST in the sheet, after a divider.
  const sheetActions = toSheet
    ? [
        ...actions.filter((a) => a !== phonePrimary && !isDestructiveAction(a.node)),
        ...actions.filter((a) => a !== phonePrimary && isDestructiveAction(a.node)),
      ]
    : [];
  const owner = useId();
  useEffect(() => {
    setPhonePageActionCount(owner, sheetActions.length + (centerToSheet ? 1 : 0));
    return () => setPhonePageActionCount(owner, 0);
  }, [owner, sheetActions.length, centerToSheet]);

  const folding = splitFolded(actions, foldable, fold);
  const overflowActions = toSheet ? [] : folding.overflow;
  const rowActions = toSheet ? (phonePrimary ? [phonePrimary] : []) : folding.row;
  const rowPrimary = toSheet ? phonePrimary : primary;
  const serverOrHydrating = useSyncExternalStore(
    noopSubscribe,
    () => false,
    () => true,
  );
  // On a phone the kept primary is compact up front — the title keeps the row.
  const compactRow = toSheet
    ? phonePrimary != null && iconOnlyLabel(phonePrimary.node) != null
    : compact;

  return (
    <PageHeader fallback={fallback}>
      <div
        ref={setRoot}
        data-route-header-root
        className={
          hasCenter
            ? "relative grid w-full min-w-0 items-center"
            : "relative flex w-full min-w-0 items-center justify-between"
        }
        style={
          hasCenter
            ? {
                // Before the first measurement (the server HTML, and the
                // pre-hydration ghost) the center is centered by CSS alone:
                // equal side tracks that never drop below their content, so
                // the nav sits on the header's true center exactly where the
                // measured inset puts it — nothing jumps when the client takes
                // over (2026-09-27, /education/flashcards moved 270px).
                // After it: the title takes its natural width up to the cap
                // that keeps the nav's smallest trigger on screen; the center
                // takes the rest.
                gridTemplateColumns: routeHeaderColumns(centerPad, leftTrack),
              }
            : undefined
        }
      >
        <div
          ref={leftRef}
          data-route-header-left
          // The title yields on ONE line: clipped and ellipsised, never wrapped
          // a letter per line under the actions (375px sample, 2026-09-25).
          // Anything directly after a tap button (a title, a pill, a field)
          // adds its own 3px — the box only carries 3px (THE 3px HALF-GAP);
          // the trail templates carry theirs on the <nav> (`ps-[3px]`), so
          // `nav` is excluded to keep it one 6px gap.
          className="relative z-10 flex min-w-0 items-center overflow-hidden whitespace-nowrap [&_h1]:truncate [&_h2]:truncate [&_svg]:shrink-0 [&>span]:min-w-0 [&>span]:truncate [&_.matrx-tap-target+*:not(.matrx-tap-target,.matrx-tap-group,nav)]:ms-[3px]"
        >
          {/* The left cell is a back button BESIDE a title: tap buttons here that
              name no variant are non-glass (rule 2, all glass or none). An
              explicit variant still wins. */}
          <TapDefaultVariant value="transparent">{leftNode}</TapDefaultVariant>
        </div>
        {hasCenter ? (
          <div
            data-route-header-center
            // In flow and clipping, so it can never overdraw the flanks: its
            // width is its grid track, whatever its content asks for.
            className="flex min-w-0 items-center"
            // Zero-height and clipped only sideways: a 44px phone trigger
            // overhangs vertically instead of growing the row (the admin
            // header is 40px), while the flanks stay out of reach.
            style={{ height: 0, overflowX: "clip", overflowY: "visible" }}
          >
            <div
              // The margins narrow this box to the symmetric slot around the
              // header's true center. Margins, not padding: padding cannot
              // shrink, and a stale measurement pushed the whole cell over
              // the actions (768px, 2026-09-27). A too-wide margin is clipped.
              // An in-flow nav drops them (styles/shell.css).
              data-route-header-inset
              className="min-w-0 flex-1"
              style={{
                marginLeft: centerPad?.left ?? 0,
                marginRight: centerPad?.right ?? 0,
              }}
            >
              {center}
            </div>
          </div>
        ) : null}
        <div
          ref={rightRef}
          data-route-header-right
          // Actions never squeeze: they FOLD into "…" (see foldCount) so the
          // title keeps TITLE_MIN_PX. With `min-w-0` here a long title once
          // crushed a phone's header door to an 8px sliver (2026-09-25).
          className="relative z-10 flex shrink-0 items-center justify-end"
          style={reservedCluster ? { minWidth: reservedCluster } : undefined}
        >
          {inert.map((a) => a.node)}
          {centerToSheet && phoneHost
            ? createPortal(
                <div
                  data-route-header-overflow-item
                  data-route-header-phone-nav
                  className="w-full min-w-0 px-1 pb-1"
                >
                  {center}
                </div>,
                phoneHost,
              )
            : null}
          {sheetActions.length > 0 && phoneHost
            ? createPortal(
                <div data-route-header-phone-actions className="flex flex-col gap-0.5">
                  {sheetActions.map((a, i) => (
                    <Fragment key={a.key}>
                      {isDestructiveAction(a.node) && (i === 0 || !isDestructiveAction(sheetActions[i - 1]!.node)) && i > 0 ? (
                        <div role="separator" data-phone-sheet-divider className="my-1 h-px bg-border" />
                      ) : null}
                      <PhoneSheetAction action={a} />
                    </Fragment>
                  ))}
                </div>,
                phoneHost,
              )
            : null}
          {overflowActions.length > 0 ? (
            <Popover open={overflowOpen} onOpenChange={setOverflowOpen}>
              <PopoverTrigger asChild>
                <span
                  ref={overflowRef}
                  data-route-header-overflow
                  className="inline-flex shrink-0"
                >
                  <MoreHorizontalTapButton
                    variant="transparent"
                    ariaLabel={`${overflowActions.length} more action${overflowActions.length === 1 ? "" : "s"}`}
                  />
                </span>
              </PopoverTrigger>
              <PopoverContent
                sizing="content"
                align="end"
                sideOffset={6}
                collisionPadding={8}
                className="max-w-[calc(100vw-1rem)] p-1"
              >
                {/* A fetched table's source bar (Refresh · quote, Get more · quote, View changes) is a
                    row in the header; inside this menu it is a vertical list, one action per row,
                    bounded by the viewport (it once drew 1004 px wide and ran under the sidebar). */}
                <div
                  data-route-header-overflow-strip
                  className={`flex max-w-full flex-wrap items-center justify-end [&>*:has([data-fetched-source-bar])]:min-w-0 [&>*:has([data-fetched-source-bar])]:basis-full ${FETCHED_BAR_AS_MENU}`}
                >
                  {overflowActions.map((a) => (
                    <OverflowMenuItem key={a.key} action={a} />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ) : null}
          {rowActions.map((a) => {
            const iconOnly = compactRow && a === rowPrimary;
            // SERVER HTML: whether this is a phone is unknown, and on a phone a
            // labeled primary is icon-only. Draw both, chosen by the phone
            // breakpoint in CSS, so the first paint already matches the
            // hydrated row at every width (no JS measurement, no re-truncation).
            if (
              serverOrHydrating &&
              a === phonePrimaryCandidate &&
              !iconOnly &&
              iconOnlyLabel(a.node) != null
            ) {
              return (
                <Fragment key={a.key}>
                  <div
                    data-route-header-action={a.key}
                    data-route-header-twin=""
                    className="flex shrink-0 items-center max-md:hidden"
                  >
                    {a.node}
                  </div>
                  <div
                    data-route-header-action={a.key}
                    data-route-header-phone-primary=""
                    data-route-header-compact=""
                    data-route-header-twin=""
                    className="flex shrink-0 items-center md:hidden"
                  >
                    {toIconOnly(a.node)}
                  </div>
                </Fragment>
              );
            }
            return (
              <div
                key={a.key}
                data-route-header-action={a.key}
                data-route-header-phone-primary={a === phonePrimaryCandidate ? "" : undefined}
                data-route-header-compact={iconOnly ? "" : undefined}
                className="flex shrink-0 items-center"
                style={iconOnly ? undefined : reservedActionStyle(reservedActionWidth(reservedActions, surface, a.key))}
              >
                {iconOnly ? toIconOnly(a.node) : a.node}
              </div>
            );
          })}
        </div>
      </div>
    </PageHeader>
  );
}
