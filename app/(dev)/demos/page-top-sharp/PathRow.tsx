"use client";

// The page-top bake-off (ui-sharp): THE PATH ROW.
// Reference: Vercel's dashboard scope bar — "product / place / record ⌄" — slashes, one
// switcher on the record name, and nothing else competing in the row. Every level is a door
// (the frame's CrumbDoor: searchable, keyboard-first): the product mark lists every product,
// the place lists the product's places, the record name lists its siblings. Ancestor text stays
// a plain link (a door never replaces the way back). Star and "…" sit right after the title so
// the eye never travels to the far edge for the page's own verbs.
import type { ReactNode } from "react";
import { ArrowLeft, ChevronDown, ChevronsUpDown, MoreHorizontal, Star } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ai-matrx/design-system";
import { Button } from "@ai-matrx/design-system/controls";
import { cn } from "@ai-matrx/design-system/cn";
import { TapSurface } from "@ai-matrx/design-system/tap-target";
import { CrumbDoor } from "@/features/shell/frame/CrumbDoor";
import { ProductMark } from "@/features/shell/frame/ProductMark";
import type { FrameCrumbDoor, FrameProduct } from "@/features/shell/frame/types";
import type { LucideIcon } from "lucide-react";

export interface PathAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  /** The menu's group heading this action sits under. */
  group: string;
  disabled?: boolean;
}

export interface PathLevel {
  label: string;
  href: string;
  door: FrameCrumbDoor;
}

export interface PathRowProps {
  phone: boolean;
  product: FrameProduct;
  productDoor: FrameCrumbDoor;
  /** The levels between the product and the page (each a link plus its door). */
  levels: readonly PathLevel[];
  /** The page itself: its title, and the door listing its siblings. */
  title: string;
  titleDoor?: FrameCrumbDoor;
  favorite?: { starred: boolean; known: boolean; onToggle: () => void };
  actions: readonly PathAction[];
  onBack?: () => void;
  /** Shown at the row's right edge (page-level primary act on desktop). */
  end?: ReactNode;
}

const LEVEL_LINK =
  "type-body truncate rounded-md px-1.5 py-0.5 text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

function Slash() {
  return (
    <li aria-hidden className="type-body shrink-0 select-none px-0.5 text-muted-foreground">
      /
    </li>
  );
}

function TitleSwitcher({ title, door, phone }: { title: string; door?: FrameCrumbDoor; phone: boolean }) {
  return (
    <span className={cn("flex min-w-0 items-center", phone && "justify-center")}>
      <h1 aria-current="page" className="type-title truncate px-1.5">
        {title}
      </h1>
      {door ? (
        <CrumbDoor
          door={door}
          trigger={
            <Button
              variant="quiet"
              icon={<ChevronsUpDown />}
              data-crumb-door={door.kind}
              aria-label={`Switch to another in ${door.label}`}
            />
          }
        />
      ) : null}
    </span>
  );
}

function StarButton({ favorite }: { favorite: NonNullable<PathRowProps["favorite"]> }) {
  return (
    <Button
      variant="quiet"
      icon={<Star className={cn(favorite.starred && "fill-current text-warning")} />}
      aria-label={!favorite.known ? "Favorites loading" : favorite.starred ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={favorite.known ? favorite.starred : undefined}
      disabled={!favorite.known}
      onClick={favorite.onToggle}
    />
  );
}

function ActionsMenu({ actions }: { actions: readonly PathAction[] }) {
  const groups: string[] = [];
  for (const a of actions) if (!groups.includes(a.group)) groups.push(a.group);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="quiet" icon={<MoreHorizontal />} aria-label="All actions for this page" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" surface="solid">
        {groups.map((g, gi) => (
          <div key={g}>
            {gi > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel>{g}</DropdownMenuLabel>
            {actions
              .filter((a) => a.group === g)
              .map((a) => {
                const Icon = a.icon;
                return (
                  <DropdownMenuItem key={a.id} onSelect={a.onSelect} disabled={a.disabled} size="sm">
                    <Icon aria-hidden />
                    {a.label}
                  </DropdownMenuItem>
                );
              })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PathRow(props: PathRowProps) {
  return (
    <TapSurface surface="solid">
      <PathRowBody {...props} />
    </TapSurface>
  );
}

function PathRowBody({ phone, product, productDoor, levels, title, titleDoor, favorite, actions, onBack, end }: PathRowProps) {
  if (phone) {
    // Phone: back · the title (still a switcher) · star · "…". One row, 44px targets.
    return (
      <header className="matrx-touch-targets flex h-12 shrink-0 items-center gap-1 border-b border-border bg-card px-1">
        {onBack ? <Button variant="quiet" icon={<ArrowLeft />} aria-label="Back" onClick={onBack} /> : null}
        <div className="flex min-w-0 flex-1 justify-center">
          <TitleSwitcher title={title} door={titleDoor} phone />
        </div>
        {favorite ? <StarButton favorite={favorite} /> : null}
        <ActionsMenu actions={actions} />
      </header>
    );
  }

  return (
    <header className="flex h-11 shrink-0 items-center gap-1 border-b border-border bg-card px-3">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center">
        <ol className="flex min-w-0 items-center">
          <li className="flex shrink-0 items-center">
            <CrumbDoor
              door={productDoor}
              trigger={
                <Button
                  variant="quiet"
                  icon={<ProductMark product={product} size="inline" />}
                  data-crumb-door="products"
                  aria-label={`${product.name}: all products`}
                />
              }
            />
          </li>
          {levels.map((level) => (
            <LevelItem key={level.href} level={level} />
          ))}
          <Slash />
          <li className="flex min-w-0 items-center">
            <TitleSwitcher title={title} door={titleDoor} phone={false} />
          </li>
        </ol>
      </nav>
      <div className="flex shrink-0 items-center">
        {favorite ? <StarButton favorite={favorite} /> : null}
        <ActionsMenu actions={actions} />
      </div>
      <div className="min-w-2 flex-1" />
      {end ? <div className="flex shrink-0 items-center gap-1">{end}</div> : null}
    </header>
  );
}

function LevelItem({ level }: { level: PathLevel }) {
  return (
    <>
      <Slash />
      <li className="flex min-w-0 max-w-48 items-center">
        <a href={level.href} className={LEVEL_LINK}>
          {level.label}
        </a>
        <CrumbDoor
          door={level.door}
          trigger={
            <Button
              variant="quiet"
              icon={<ChevronDown />}
              data-crumb-door={level.door.kind}
              aria-label={`Go to another in ${level.door.label}`}
            />
          }
        />
      </li>
    </>
  );
}
