"use client";

// The sheet's header row: ONE fixed height on every page and every variant.
// Desktop: [sidebar + grid when the sidebar is hidden] breadcrumbs · star (only
// when the item can be favorited) · "…" (always) · right slot.
// Phone: back (or menu at a product's top level) · title · "…".
import { Fragment } from "react";
import { isPlainClick } from "./FrameSidebar";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Bell as BellIcon,
  ChevronDown,
  ChevronRight,
  CircleUserRound as AccountIcon,
  Copy,
  ExternalLink,
  Menu,
  MoreHorizontal,
  PanelLeftOpen,
  Search as SearchIcon,
  Shapes,
  Star,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ai-matrx/design-system";
import { Button } from "@ai-matrx/design-system/controls";
import { cn } from "@ai-matrx/design-system/cn";
import { TapSurface } from "@ai-matrx/design-system/tap-target";
import type { FrameAction, FrameCrumb, FrameForm, FrameHeaderTool } from "./types";
import { CHAT_PRODUCT_ICON } from "./products";
import { CrumbDoor, crumbDoorOf } from "./CrumbDoor";

export interface FrameFavorite {
  starred: boolean;
  /** False while the saved state is not here yet: the star shows neutral and a press does nothing. */
  known?: boolean;
  onToggle: () => void;
}

/** The default "…" items. A host passes its own handlers; the frame never copies or deletes by itself. */
export function defaultPageActions(handlers: {
  onCopyLink: () => void;
  onOpenInNewTab: () => void;
  onDelete: () => void;
}): FrameAction[] {
  return [
    { id: "copy-link", label: "Copy link", icon: Copy, onSelect: handlers.onCopyLink },
    { id: "open-new-tab", label: "Open in new tab", icon: ExternalLink, onSelect: handlers.onOpenInNewTab },
    { id: "delete", label: "Delete", icon: Trash2, onSelect: handlers.onDelete, destructive: true },
  ];
}

/** A panel toggle; `unavailable` disables it and says why in its tooltip (an honest stand-in). */
export interface PanelToggle {
  open: boolean;
  onToggle: () => void;
  unavailable?: string;
}

/** The ids of the frame's header slots (ServerRenderedHeaderSlot's HEADER_SLOT_TARGETS lists them first). */
export const FRAME_HEADER_CENTER_ID = "frame-header-center";
export const FRAME_HEADER_RIGHT_ID = "frame-header-right";

export interface SheetHeaderProps {
  form: FrameForm;
  crumbs: readonly FrameCrumb[];
  favorite?: FrameFavorite;
  actions: readonly FrameAction[];
  /** Extra "…" items only the phone form needs (open menu, agent). */
  phoneActions?: readonly FrameAction[];
  /** The right-side tools — the host's own components (desktop, wide, medium). */
  tools?: ReactNode;
  /** The same tools on a phone, as data: `phone: "show"` stay, the rest go into "…". */
  phoneTools?: readonly FrameHeaderTool[];
  /** The frame's own canvas toggle, last in the right tools group (on a phone it is a "…" item). */
  canvasToggle?: PanelToggle;
  /** The side chat's door, when SIDE_CHAT_DOOR is "header" (after the canvas toggle). */
  sideChatToggle?: PanelToggle;
  /**
   * The host's header slots (live (core) frame): the crumbs become the CENTER slot's fallback
   * (`#frame-header-center`, `data-page-header-portal="fallback"`) and an empty RIGHT slot
   * (`#frame-header-right`) sits before the tools, so a page's own header content
   * (PageHeaderPortal / PageHeaderRightPortal) lands in the frame and the crumbs yield to it.
   */
  hostSlots?: boolean;
  /** This header is the sheet's last top band (no tabs row): it carries the frame's top edge. */
  topEdge?: boolean;
  /** Desktop with the sidebar hidden: the controls that bring it (and the grid) back. */
  start?: ReactNode;
  onOpenDrawer: () => void;
  onBack?: () => void;
}

function PageMenu({ actions }: { actions: readonly FrameAction[] }) {
  const plain = actions.filter((a) => !a.destructive);
  const destructive = actions.filter((a) => a.destructive);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="quiet" icon={<MoreHorizontal />} aria-label="More actions" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" surface="solid">
        {plain.map((a) => {
          const Icon = a.icon;
          return (
            <DropdownMenuItem key={a.id} onSelect={a.onSelect} disabled={a.disabled} size="sm">
              {Icon ? <Icon aria-hidden /> : null}
              {a.label}
            </DropdownMenuItem>
          );
        })}
        {destructive.length > 0 && plain.length > 0 ? <DropdownMenuSeparator /> : null}
        {destructive.map((a) => {
          const Icon = a.icon;
          return (
            <DropdownMenuItem key={a.id} onSelect={a.onSelect} disabled={a.disabled} tone="danger" size="sm">
              {Icon ? <Icon aria-hidden /> : null}
              {a.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The frame's header is a solid row: every tap group inside declares solid once, here. */
export function SheetHeader(props: SheetHeaderProps) {
  return (
    <TapSurface surface="solid">
      <SheetHeaderBody {...props} />
    </TapSurface>
  );
}

function SheetHeaderBody({
  form,
  crumbs,
  favorite,
  actions,
  phoneActions,
  tools,
  phoneTools = [],
  canvasToggle,
  sideChatToggle,
  topEdge,
  start,
  onOpenDrawer,
  onBack,
  hostSlots,
}: SheetHeaderProps) {
  const current = crumbs[crumbs.length - 1];

  const starUnknown = favorite?.known === false;
  const star = favorite ? (
    <Button
      variant="quiet"
      icon={<Star className={cn(favorite.starred && "fill-current")} />}
      aria-label={starUnknown ? "Favorites loading" : favorite.starred ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={starUnknown ? undefined : favorite.starred}
      aria-busy={starUnknown || undefined}
      disabled={starUnknown}
      onClick={favorite.onToggle}
    />
  ) : null;

  if (form === "phone") {
    const canGoBack = crumbs.length > 1 && onBack;
    const shown = phoneTools.filter((t) => t.phone === "show");
    // Tools that do not fit a phone header keep working from the "…" menu.
    const overflow: FrameAction[] = phoneTools
      .filter((t) => t.phone !== "show")
      .map((t) => ({ id: `tool-${t.id}`, label: t.label, icon: t.icon, onSelect: t.onSelect ?? (() => {}) }));
    return (
      // matrx-touch-targets: the platform's 44px touch ring on every control here.
      <header
        data-mf-owner="frame"
        data-mf-region="header"
        className={cn(topEdge && "mf-top-edge", "matrx-touch-targets flex h-[var(--matrx-frame-header-h)] shrink-0 items-center gap-1 px-2")}
      >
        {canGoBack ? (
          <Button variant="quiet" icon={<ArrowLeft />} aria-label="Back" onClick={onBack} />
        ) : (
          <Button variant="quiet" icon={<Menu />} aria-label="Open menu" onClick={onOpenDrawer} />
        )}
        {hostSlots ? (
          <div id={FRAME_HEADER_CENTER_ID} className="flex min-w-0 flex-1 items-center">
            <h1 data-page-header-portal="fallback" data-frame-derived="" className="type-title min-w-0 flex-1 truncate px-1">
              {current?.label}
            </h1>
          </div>
        ) : (
          <h1 className="type-title min-w-0 flex-1 truncate px-1">{current?.label}</h1>
        )}
        {star}
        {hostSlots ? <div id={FRAME_HEADER_RIGHT_ID} className="flex shrink-0 items-center" /> : null}
        <HeaderToolButtons tools={shown} />
        <PageMenu actions={[...(phoneActions ?? []), ...overflow, ...actions]} />
      </header>
    );
  }

  // The crumb trail, the star and "…" are ALWAYS in the row (frame mode: a page's own header
  // content lands in the center slot BESIDE them and never replaces them).
  const crumbTrail = (
    <>
      <nav aria-label="Breadcrumb" data-frame-crumbs="" className="flex min-w-0 shrink items-center pl-1">
        <ol className="flex min-w-0 items-center gap-0.5">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <Fragment key={crumb.id}>
                {i > 0 ? (
                  <li aria-hidden className="flex shrink-0 items-center text-muted-foreground">
                    <ChevronRight className="size-3.5" />
                  </li>
                ) : null}
                <li className={cn("flex min-w-0 items-center", isLast ? "shrink" : "max-w-45 shrink-[2]")}>
                  <CrumbLevel crumb={crumb} isLast={isLast} />
                </li>
              </Fragment>
            );
          })}
        </ol>
      </nav>
    </>
  );
  const starAndMenu = (
    <div className="flex shrink-0 items-center pl-1">
      {star}
      <PageMenu actions={actions} />
    </div>
  );

  return (
    <header
      data-mf-owner="frame"
      data-mf-region="header"
      className={cn(topEdge && "mf-top-edge", "flex h-[var(--matrx-frame-header-h)] shrink-0 items-center gap-1 px-2")}
    >
      {start}
      {crumbTrail}
      {starAndMenu}
      {hostSlots ? (
        <div id={FRAME_HEADER_CENTER_ID} className="flex h-full min-w-0 flex-1 items-center pl-2" />
      ) : null}
      {hostSlots ? <div id={FRAME_HEADER_RIGHT_ID} className="flex shrink-0 items-center" /> : <div className="min-w-2 flex-1" />}
      {tools || canvasToggle || sideChatToggle ? (
        <div data-mf-region="header-tools" data-matrx-controls="" className="flex shrink-0 items-center">
          {tools}
          {sideChatToggle ? (
            <Button
              variant={sideChatToggle.open ? "outline" : "quiet"}
              icon={<CHAT_PRODUCT_ICON />}
              aria-label="Side chat"
              aria-pressed={sideChatToggle.open}
              disabled={Boolean(sideChatToggle.unavailable)}
              title={sideChatToggle.unavailable}
              onClick={sideChatToggle.onToggle}
            />
          ) : null}
          {canvasToggle ? (
            <Button
              variant={canvasToggle.open ? "outline" : "quiet"}
              icon={<Shapes />}
              aria-label="Canvas"
              aria-pressed={canvasToggle.open}
              disabled={Boolean(canvasToggle.unavailable)}
              title={canvasToggle.unavailable}
              onClick={canvasToggle.onToggle}
            />
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

const CRUMB_CLASS =
  "type-body block max-w-full truncate rounded-md px-1 text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

/** What a crumb shows: its label, or its icon alone (the label stays its name and tooltip). */
function CrumbFace({ crumb }: { crumb: FrameCrumb }) {
  const Icon = crumb.icon;
  if (crumb.iconOnly && Icon) {
    return (
      <span className="flex size-5 items-center justify-center" title={crumb.label}>
        <Icon className="size-4" aria-hidden />
        <span className="sr-only">{crumb.label}</span>
      </span>
    );
  }
  return <>{crumb.label}</>;
}

/** An ancestor crumb (or an icon-only current one): a real link when it has an href (a plain click runs onSelect). */
function CrumbLink({ crumb, current }: { crumb: FrameCrumb; current?: boolean }) {
  const aria = current ? ({ "aria-current": "page" } as const) : {};
  if (crumb.href) {
    return (
      <a
        href={crumb.href}
        className={CRUMB_CLASS}
        {...aria}
        onClick={(e) => {
          if (!crumb.onSelect || !isPlainClick(e)) return;
          e.preventDefault();
          crumb.onSelect();
        }}
      >
        <CrumbFace crumb={crumb} />
      </a>
    );
  }
  if (crumb.onSelect) {
    return (
      <button type="button" onClick={crumb.onSelect} className={CRUMB_CLASS} {...aria}>
        <CrumbFace crumb={crumb} />
      </button>
    );
  }
  return (
    <span className="type-body block truncate px-1 text-muted-foreground" {...aria}>
      <CrumbFace crumb={crumb} />
    </span>
  );
}

/**
 * One level of the trail. EVERY CRUMB IS A DOOR (Arman, 2026-10-22): the text is a link to the level
 * (the current page is the title), and the level's door (CrumbDoor) lists everything else at that
 * level, searchable. The product icon has no text, so the icon itself opens the products door.
 */
function CrumbLevel({ crumb, isLast }: { crumb: FrameCrumb; isLast: boolean }) {
  const door = crumbDoorOf(crumb);
  if (door && crumb.iconOnly && door.kind === "products") {
    return (
      <CrumbDoor
        door={door}
        trigger={
          <button type="button" data-crumb-door={door.kind} aria-label={`${crumb.label}: all products`} className={cn(CRUMB_CLASS, "flex items-center gap-0.5")}>
            <CrumbFace crumb={crumb} />
            <ChevronDown className="size-3 text-muted-foreground" aria-hidden />
          </button>
        }
      />
    );
  }
  return (
    <>
      {isLast && !crumb.iconOnly ? (
        <h1 aria-current="page" className="type-title truncate px-1">
          {crumb.label}
        </h1>
      ) : (
        <CrumbLink crumb={crumb} current={isLast} />
      )}
      {door ? <CrumbDoor door={door} /> : null}
    </>
  );
}

/** Header tools given as data, drawn as the frame's quiet icon buttons (the phone header, the lab's stand-ins). */
export function HeaderToolButtons({ tools }: { tools: readonly FrameHeaderTool[] }) {
  return (
    <>
      {tools.map((t) => {
        const Icon = t.icon;
        return <Button key={t.id} variant="quiet" icon={<Icon />} aria-label={t.label} onClick={t.onSelect} />;
      })}
    </>
  );
}

/** Stand-ins for the existing right-side header icons; search stays visible on a phone. */
export function placeholderHeaderTools(onSelect?: (id: string) => void): FrameHeaderTool[] {
  return [
    { id: "search", label: "Search", icon: SearchIcon, phone: "show", onSelect: () => onSelect?.("search") },
    { id: "notifications", label: "Notifications", icon: BellIcon, onSelect: () => onSelect?.("notifications") },
    { id: "account", label: "Account", icon: AccountIcon, onSelect: () => onSelect?.("account") },
  ];
}

/** The controls that bring a hidden sidebar back, shown at the header's start. */
export function SidebarRestore({ onShow, grid, goTo }: { onShow: () => void; grid: ReactNode; goTo: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center">
      <Button variant="quiet" icon={<PanelLeftOpen />} aria-label="Show sidebar" onClick={onShow} />
      {grid}
      {goTo}
    </div>
  );
}
