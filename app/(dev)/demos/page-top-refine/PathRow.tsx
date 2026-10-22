"use client";

// THE PATH ROW, refined. Same 44px row, same data (FrameCrumb[], FrameAction[], FrameFavorite) as the
// frame's SheetHeader — what changed:
//   1. Every level is ONE split control: its name (a link) and its door chevron share one hover
//      surface, so the door is found by the same hand that reaches for the name (Vercel's
//      team/project switchers). The separator is a quiet slash, so the only chevrons in the row
//      are doors — no more "›" beside "▾".
//   2. A long trail folds its middle levels into one "…" level instead of squeezing every name
//      to an ellipsis (Primer's Breadcrumbs overflow); the product, its first level and the page
//      always stay.
//   3. Phone: the title IS the door to its level (switch to a sibling without leaving), and the
//      "…" menu starts with "Up to <parent>" for every level the phone row hides.
//   4. "…" holds every action in named groups: the page's own, then the page's link, then the
//      destructive ones after a rule.
//   5. When an intro band carries the page's heading, the row's last level is plain text: one
//      title authority per page.
import { Fragment } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowUpLeft, ChevronDown, Ellipsis, MoreHorizontal, Star } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ai-matrx/design-system";
import { Button } from "@ai-matrx/design-system/controls";
import { cn } from "@ai-matrx/design-system/cn";
import { CrumbDoor, crumbDoorOf } from "@/features/shell/frame/CrumbDoor";
import { isPlainClick } from "@/features/shell/frame/plainClick";
import type { FrameFavorite } from "@/features/shell/frame/SheetHeader";
import type { FrameAction, FrameCrumb } from "@/features/shell/frame/types";

export interface ActionGroup {
  id: string;
  /** Group heading in the "…" menu; omit for the first group. */
  label?: string;
  actions: readonly FrameAction[];
}

export interface PathRowProps {
  crumbs: readonly FrameCrumb[];
  favorite?: FrameFavorite;
  groups: readonly ActionGroup[];
  phone: boolean;
  /** The row's width: below this many px a trail of 5+ levels folds its middle. */
  width: number;
  /** An intro band below carries the page's h1; the row's last level is then plain text. */
  headingBelow?: boolean;
  onBack?: () => void;
}

/** Levels the row shows before folding the middle: product, first level, …, parent, page. */
const FOLD_FROM = 5;
const FOLD_BELOW_PX = 900;

export function PathRow({ crumbs, favorite, groups, phone, width, headingBelow, onBack }: PathRowProps) {
  const star = favorite ? <StarButton favorite={favorite} /> : null;
  const current = crumbs[crumbs.length - 1];

  if (phone) {
    const ancestors = crumbs.slice(1, -1).reverse();
    const upGroup: ActionGroup | null =
      ancestors.length > 0
        ? {
            id: "up",
            label: "Go up",
            actions: ancestors.map((c) => ({
              id: `up-${c.id}`,
              label: c.label,
              icon: ArrowUpLeft,
              onSelect: () => (c.onSelect ? c.onSelect() : c.href ? window.location.assign(c.href) : undefined),
            })),
          }
        : null;
    return (
      <header
        data-page-top="path"
        className="matrx-touch-targets flex h-11 shrink-0 items-center gap-1 border-b border-border px-2"
      >
        {onBack ? <Button variant="quiet" icon={<ArrowLeft />} aria-label="Back" onClick={onBack} /> : null}
        <PhoneTitle crumb={current} headingBelow={headingBelow} />
        {star}
        <ActionsMenu groups={upGroup ? [...groups, upGroup] : groups} />
      </header>
    );
  }

  const folded = crumbs.length >= FOLD_FROM && width < FOLD_BELOW_PX;
  // product · first level · [fold] · parent · page
  const shown: (FrameCrumb | { fold: readonly FrameCrumb[] })[] = folded
    ? [crumbs[0], crumbs[1], { fold: crumbs.slice(2, -2) }, ...crumbs.slice(-2)]
    : [...crumbs];

  return (
    <header data-page-top="path" className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-2">
      <nav aria-label="Breadcrumb" className="flex min-w-0 shrink items-center">
        <ol className="flex min-w-0 items-center">
          {shown.map((level, i) => {
            const isLast = i === shown.length - 1;
            const key = "fold" in level ? "fold" : level.id;
            return (
              <Fragment key={key}>
                {i > 0 ? <Slash /> : null}
                <li className={cn("flex min-w-0 items-center", isLast ? "shrink" : "max-w-48 shrink-[2]")}>
                  {"fold" in level ? (
                    <FoldedLevels crumbs={level.fold} />
                  ) : (
                    <Level crumb={level} isLast={isLast} headingBelow={headingBelow} />
                  )}
                </li>
              </Fragment>
            );
          })}
        </ol>
      </nav>
      <div className="flex shrink-0 items-center">
        {star}
        <ActionsMenu groups={groups} />
      </div>
      <div className="min-w-2 flex-1" />
    </header>
  );
}

function Slash() {
  return (
    <li aria-hidden className="flex shrink-0 select-none items-center px-0.5 type-body text-disabled-foreground">
      /
    </li>
  );
}

function StarButton({ favorite }: { favorite: FrameFavorite }) {
  const unknown = favorite.known === false;
  return (
    <Button
      variant="quiet"
      icon={<Star className={cn(favorite.starred && "fill-current text-warning")} />}
      aria-label={unknown ? "Favorites loading" : favorite.starred ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={unknown ? undefined : favorite.starred}
      aria-busy={unknown || undefined}
      disabled={unknown}
      onClick={favorite.onToggle}
    />
  );
}

/** The split control's two halves share one rounded hover surface (the group). */
const HALF =
  "flex h-7 items-center outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring";

function Level({ crumb, isLast, headingBelow }: { crumb: FrameCrumb; isLast: boolean; headingBelow?: boolean }) {
  const door = crumbDoorOf(crumb);
  const Icon = crumb.icon;

  // The product: its mark alone is the door to every product.
  if (crumb.iconOnly && Icon) {
    const face = (
      <span className={cn(HALF, "gap-0.5 rounded-md px-1.5 text-muted-foreground hover:text-foreground")}>
        <Icon className="size-4" aria-hidden />
        {door ? <ChevronDown className="size-3" aria-hidden /> : null}
      </span>
    );
    return door ? (
      <CrumbDoor
        door={door}
        trigger={
          <button type="button" aria-label={`${crumb.label}: all products`} title={crumb.label} className="rounded-md outline-none">
            {face}
          </button>
        }
      />
    ) : (
      <a href={crumb.href} title={crumb.label} aria-label={crumb.label} onClick={(e) => plainSelect(e, crumb)}>
        {face}
      </a>
    );
  }

  const name: ReactNode =
    isLast && !headingBelow ? (
      <h1 aria-current="page" className="type-title truncate">
        {crumb.label}
      </h1>
    ) : (
      <span className={cn("type-body truncate", isLast ? "text-foreground" : "text-muted-foreground group-hover/level:text-foreground")}>
        {crumb.label}
      </span>
    );

  const nameHalf =
    !isLast && crumb.href ? (
      <a
        href={crumb.href}
        onClick={(e) => plainSelect(e, crumb)}
        className={cn(HALF, "min-w-0 px-1.5", door ? "rounded-l-md" : "rounded-md")}
      >
        {name}
      </a>
    ) : (
      <span aria-current={isLast ? "page" : undefined} className={cn("flex h-7 min-w-0 items-center px-1.5")}>
        {name}
      </span>
    );

  return (
    <span className="group/level flex min-w-0 items-center rounded-md">
      {nameHalf}
      {door ? (
        <CrumbDoor
          door={door}
          trigger={
            <button
              type="button"
              data-crumb-door={door.kind}
              aria-label={`Go to another in ${door.label}`}
              className={cn(HALF, "w-5 shrink-0 justify-center rounded-r-md text-muted-foreground hover:text-foreground", (isLast || !crumb.href) && "rounded-md")}
            >
              <ChevronDown className="size-3.5" aria-hidden />
            </button>
          }
        />
      ) : null}
    </span>
  );
}

function FoldedLevels({ crumbs }: { crumbs: readonly FrameCrumb[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={`${crumbs.length} more levels`} className={cn(HALF, "rounded-md px-1.5 text-muted-foreground hover:text-foreground")}>
          <Ellipsis className="size-4" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" surface="solid">
        {crumbs.map((c) => (
          <DropdownMenuItem key={c.id} size="sm" onSelect={() => goTo(c)}>
            {c.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PhoneTitle({ crumb, headingBelow }: { crumb: FrameCrumb | undefined; headingBelow?: boolean }) {
  if (!crumb) return <span className="min-w-0 flex-1" />;
  const door = crumbDoorOf(crumb);
  const Heading = headingBelow ? "span" : "h1";
  const text = <Heading className="type-title truncate">{crumb.label}</Heading>;
  if (!door) return <div className="flex min-w-0 flex-1 items-center px-1">{text}</div>;
  return (
    <div className="flex min-w-0 flex-1 items-center">
      <CrumbDoor
        door={door}
        trigger={
          <button
            type="button"
            data-crumb-door={door.kind}
            aria-label={`${crumb.label}: go to another in ${door.label}`}
            className="flex h-9 min-w-0 max-w-full items-center gap-1 rounded-md px-1 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            {text}
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        }
      />
    </div>
  );
}

function ActionsMenu({ groups }: { groups: readonly ActionGroup[] }) {
  const live = groups.filter((g) => g.actions.length > 0);
  const plain = live.map((g) => ({ ...g, actions: g.actions.filter((a) => !a.destructive) })).filter((g) => g.actions.length > 0);
  const destructive = live.flatMap((g) => g.actions.filter((a) => a.destructive));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="quiet" icon={<MoreHorizontal />} aria-label="More actions" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" surface="solid" className="min-w-52">
        {plain.map((g, gi) => (
          <DropdownMenuGroup key={g.id}>
            {gi > 0 ? <DropdownMenuSeparator /> : null}
            {g.label ? <DropdownMenuLabel>{g.label}</DropdownMenuLabel> : null}
            {g.actions.map((a) => (
              <ActionItem key={a.id} action={a} />
            ))}
          </DropdownMenuGroup>
        ))}
        {destructive.length > 0 ? (
          <>
            {plain.length > 0 ? <DropdownMenuSeparator /> : null}
            {destructive.map((a) => (
              <ActionItem key={a.id} action={a} />
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ActionItem({ action }: { action: FrameAction }) {
  const Icon = action.icon;
  return (
    <DropdownMenuItem onSelect={action.onSelect} disabled={action.disabled} tone={action.destructive ? "danger" : undefined} size="sm">
      {Icon ? <Icon aria-hidden className="size-4" /> : null}
      {action.label}
    </DropdownMenuItem>
  );
}

function goTo(crumb: FrameCrumb) {
  if (crumb.onSelect) crumb.onSelect();
  else if (crumb.href) window.location.assign(crumb.href);
}

function plainSelect(e: React.MouseEvent<HTMLAnchorElement>, crumb: FrameCrumb) {
  if (!crumb.onSelect || !isPlainClick(e)) return;
  e.preventDefault();
  crumb.onSelect();
}
