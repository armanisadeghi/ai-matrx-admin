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
  ChevronRight,
  CircleUserRound as AccountIcon,
  Copy,
  ExternalLink,
  Menu,
  MoreHorizontal,
  PanelLeftOpen,
  Search as SearchIcon,
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
import type { FrameAction, FrameCrumb, FrameForm, FrameHeaderTool } from "./types";

export interface FrameFavorite {
  starred: boolean;
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

export interface SheetHeaderProps {
  form: FrameForm;
  crumbs: readonly FrameCrumb[];
  favorite?: FrameFavorite;
  actions: readonly FrameAction[];
  /** Extra "…" items only the phone form needs (open menu, agent). */
  phoneActions?: readonly FrameAction[];
  /** The right-side tools (search, notifications, account). */
  tools?: readonly FrameHeaderTool[];
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
            <DropdownMenuItem key={a.id} onSelect={a.onSelect} size="sm">
              {Icon ? <Icon aria-hidden /> : null}
              {a.label}
            </DropdownMenuItem>
          );
        })}
        {destructive.length > 0 && plain.length > 0 ? <DropdownMenuSeparator /> : null}
        {destructive.map((a) => {
          const Icon = a.icon;
          return (
            <DropdownMenuItem key={a.id} onSelect={a.onSelect} tone="danger" size="sm">
              {Icon ? <Icon aria-hidden /> : null}
              {a.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SheetHeader({
  form,
  crumbs,
  favorite,
  actions,
  phoneActions,
  tools = [],
  start,
  onOpenDrawer,
  onBack,
}: SheetHeaderProps) {
  const current = crumbs[crumbs.length - 1];

  const star = favorite ? (
    <Button
      variant="quiet"
      icon={<Star className={cn(favorite.starred && "fill-current")} />}
      aria-label={favorite.starred ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={favorite.starred}
      onClick={favorite.onToggle}
    />
  ) : null;

  const toolButton = (t: FrameHeaderTool) => {
    const Icon = t.icon;
    return <Button key={t.id} variant="quiet" icon={<Icon />} aria-label={t.label} onClick={t.onSelect} />;
  };

  if (form === "phone") {
    const canGoBack = crumbs.length > 1 && onBack;
    const shown = tools.filter((t) => t.phone === "show");
    // Tools that do not fit a phone header keep working from the "…" menu.
    const overflow: FrameAction[] = tools
      .filter((t) => t.phone !== "show")
      .map((t) => ({ id: `tool-${t.id}`, label: t.label, icon: t.icon, onSelect: t.onSelect ?? (() => {}) }));
    return (
      // matrx-touch-targets: the platform's 44px touch ring on every control here.
      <header className="mf-rule-b matrx-touch-targets flex h-[var(--matrx-frame-header-h)] shrink-0 items-center gap-1 px-2">
        {canGoBack ? (
          <Button variant="quiet" icon={<ArrowLeft />} aria-label="Back" onClick={onBack} />
        ) : (
          <Button variant="quiet" icon={<Menu />} aria-label="Open menu" onClick={onOpenDrawer} />
        )}
        <h1 className="type-title min-w-0 flex-1 truncate px-1">{current?.label}</h1>
        {star}
        {shown.map(toolButton)}
        <PageMenu actions={[...(phoneActions ?? []), ...overflow, ...actions]} />
      </header>
    );
  }

  return (
    <header className="mf-rule-b flex h-[var(--matrx-frame-header-h)] shrink-0 items-center gap-1 px-2">
      {start}
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center pl-1">
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
                <li className={cn("min-w-0", isLast ? "shrink" : "max-w-45 shrink-[2]")}>
                  {isLast ? (
                    <h1 aria-current="page" className="type-title truncate px-1">
                      {crumb.label}
                    </h1>
                  ) : (
                    <CrumbLink crumb={crumb} />
                  )}
                </li>
              </Fragment>
            );
          })}
        </ol>
      </nav>
      <div className="flex shrink-0 items-center gap-0.5 pl-1">
        {star}
        <PageMenu actions={actions} />
      </div>
      <div className="min-w-2 flex-1" />
      {tools.length > 0 ? (
        <div className="flex shrink-0 items-center gap-0.5">{tools.map(toolButton)}</div>
      ) : null}
    </header>
  );
}

const CRUMB_CLASS =
  "type-body block max-w-full truncate rounded-md px-1 text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

/** An ancestor crumb: a real link when it has an href (a plain click runs onSelect). */
function CrumbLink({ crumb }: { crumb: FrameCrumb }) {
  if (crumb.href) {
    return (
      <a
        href={crumb.href}
        className={CRUMB_CLASS}
        onClick={(e) => {
          if (!crumb.onSelect || !isPlainClick(e)) return;
          e.preventDefault();
          crumb.onSelect();
        }}
      >
        {crumb.label}
      </a>
    );
  }
  if (crumb.onSelect) {
    return (
      <button type="button" onClick={crumb.onSelect} className={CRUMB_CLASS}>
        {crumb.label}
      </button>
    );
  }
  return <span className="type-body block truncate px-1 text-muted-foreground">{crumb.label}</span>;
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
export function SidebarRestore({ onShow, grid }: { onShow: () => void; grid: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button variant="quiet" icon={<PanelLeftOpen />} aria-label="Show sidebar" onClick={onShow} />
      {grid}
    </div>
  );
}
