"use client";

/**
 * The Google Look's desktop list — Google Docs / Sheets' calm list, not a data table: the kind's
 * icon and the name, the owner ("me" or their name), the date the chosen sort speaks about, ⋮.
 * 52px rows on hairline dividers, grouped by time with the group's name as a plain heading inside
 * the list (the first group's name is the sticky header row's title, as on Google). Every per-file
 * action is the shared file menu, on ⋮ and on right-click. The column grid is shared with the
 * header row (`GOOGLE_LIST_COLUMNS`), so the "Owned by" and date headings sit over their columns.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { Star, Users } from "lucide-react";
import { Spinner } from "@/components/ui/loaders/Spinner";
import { cn } from "@/lib/utils";
import { FileCardContextArea } from "../FileCardContextArea";
import type { FileMenuControl } from "../FileCardContextArea";
import type { HomeKind } from "./home-kinds";
import { homeDateLabel, type HomeGroup } from "./recent";

/** Name · Owner · date · ⋮ — the list and its sticky header share it. */
export const GOOGLE_LIST_COLUMNS = "grid grid-cols-[minmax(0,1fr)_10rem_11rem_3rem] items-center gap-x-4";

export function GoogleFileList<Row>({
  kind,
  groups,
  now,
  starredIds,
  userId,
  ownerLabel,
  navigatingId,
  onOpen,
  menuFor,
  marksFor,
  groupRef,
}: {
  kind: HomeKind;
  groups: HomeGroup<Row>[];
  now: number;
  starredIds: ReadonlySet<string>;
  userId: string | null;
  ownerLabel: (ownerId: string) => string;
  navigatingId: string | null;
  onOpen: (id: string, e: React.MouseEvent) => void;
  menuFor: (row: Row, control: FileMenuControl) => ReactNode;
  marksFor?: (row: Row, where: "card" | "table") => ReactNode;
  /** Each group's start, so the sticky header can name the group under it. */
  groupRef: (key: string, el: HTMLElement | null) => void;
}) {
  return (
    <div className="flex flex-col pb-2">
      {groups.map((g, gi) => (
        <section key={g.key} ref={(el) => groupRef(g.key, el)} data-home-group={g.key} aria-label={g.label ?? undefined}>
          {/* The first group's name is the sticky row's title; later ones head their rows, like Google's. */}
          {g.label && gi > 0 ? <h3 className="px-4 pb-2 pt-6 text-sm font-medium text-foreground">{g.label}</h3> : null}
          <ul>
            {g.items.map((d, i) => (
              <li key={d.item.id}>
                <FileCardContextArea className="relative" menu={(control) => menuFor(d.item.row, control)}>
                  {(menu) => (
                    <div
                      className={cn(
                        GOOGLE_LIST_COLUMNS,
                        "group/row relative h-[3.25rem] rounded-none px-4 transition-colors hover:bg-muted/60",
                        i > 0 && "border-t border-border",
                      )}
                    >
                      <Link
                        href={kind.href(d.item.id)}
                        onClick={(e) => onOpen(d.item.id, e)}
                        className="flex min-w-0 items-center gap-4 after:absolute after:inset-0 after:content-['']"
                        title={d.item.description ? `${d.item.name} — ${d.item.description}` : d.item.name}
                      >
                        <kind.Icon className={cn("size-5 shrink-0", kind.iconTone)} aria-hidden />
                        <span className="truncate text-sm font-medium text-foreground">{d.item.name}</span>
                        {userId !== null && d.item.ownerId !== userId ? (
                          <Users className="size-4 shrink-0 text-muted-foreground" aria-label="Not owned by me" />
                        ) : null}
                        {starredIds.has(d.item.id) ? (
                          <Star className="size-4 shrink-0 fill-current text-warning" aria-label="Starred" />
                        ) : null}
                      </Link>
                      <span className="truncate text-sm text-muted-foreground">{ownerLabel(d.item.ownerId)}</span>
                      <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                        <span className="truncate">{d.at === null ? "—" : homeDateLabel(d.at, now)}</span>
                        {/* Marks are links of their own: above the row's whole-row link. */}
                        {marksFor ? <span className="relative z-[1] flex shrink-0 items-center gap-1">{marksFor(d.item.row, "table")}</span> : null}
                      </span>
                      <span className="matrx-touch-targets relative z-[1] flex justify-end">{menu}</span>
                      {navigatingId === d.item.id ? (
                        <span className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
                          <Spinner size="sm" label="Opening" />
                        </span>
                      ) : null}
                    </div>
                  )}
                </FileCardContextArea>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
