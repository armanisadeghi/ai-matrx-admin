"use client";

/**
 * "Start a new spreadsheet / document" — Google Sheets / Docs' template band: a Blank tile, the
 * template tiles, "Template gallery" opening the full gallery in place, and ⋮ → Hide templates
 * (remembered per person, synced: `userPreferences.lists.fileHomeTemplatesHidden`). Our own doors
 * (a table, an upload) sit in the same row as tiles of the same shape, after the templates.
 * On a phone the row scrolls sideways, like Google's.
 *
 * In the Microsoft 365 look (read from the home, `useHomeLook`) the same band is Office's "Create"
 * row: "Blank workbook / document / presentation" first, "More templates" for the gallery.
 */

import type { ReactNode } from "react";
import { ChevronsUpDown, MoreVertical, Plus } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { Spinner } from "@/components/ui/loaders/Spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { setPreference } from "@/lib/redux/preferences/userPreferencesSlice";
import type { RootState } from "@/lib/redux/store";
import { cn } from "@/lib/utils";
import type { HomeKind } from "./home-kinds";
import { useHomeLook } from "./home-look";

export function useTemplatesHidden(kind: HomeKind["kind"]): [boolean, (next: boolean) => void] {
  const dispatch = useAppDispatch();
  const all = useAppSelector((s: RootState) => s.userPreferences.lists.fileHomeTemplatesHidden);
  const hidden = all?.[kind] === true;
  return [
    hidden,
    (next) =>
      dispatch(
        setPreference({ module: "lists", preference: "fileHomeTemplatesHidden", value: { ...(all ?? {}), [kind]: next } }),
      ),
  ];
}

/**
 * One tile of the band: a paper-shaped face and a one-line name under it — the same tile shape as
 * the template tiles (`TemplateThumb`). The face is paper (white in both themes, like Google's).
 */
export function StartTile({
  label,
  face,
  onClick,
  busy = false,
  disabled = false,
  title,
  shape = "page",
}: {
  label: string;
  face: ReactNode;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  title?: string;
  /** "page" (Docs/Sheets, portrait) or "slide" (Slides, 16:9). */
  shape?: "page" | "slide";
}) {
  return (
    <div className={cn("flex shrink-0 flex-col gap-1.5", shape === "slide" ? "w-40 sm:w-48" : "w-28 sm:w-36")}>
      <button
        type="button"
        data-clickable
        disabled={disabled || busy}
        aria-label={label}
        title={title ?? label}
        onClick={onClick}
        className={cn(
          "relative flex w-full items-center justify-center overflow-hidden rounded-md border border-border bg-white transition-colors hover:border-primary focus-visible:border-primary focus-visible:outline-none disabled:opacity-60",
          shape === "slide" ? "aspect-video" : "aspect-[320/414]",
        )}
      >
        {busy ? <Spinner size="sm" label="Creating" /> : face}
      </button>
      <span className="truncate px-0.5 text-xs font-medium text-foreground">{label}</span>
    </div>
  );
}

export function BlankTile({
  onCreate,
  creating,
  shape = "page",
}: {
  onCreate: () => void;
  creating: boolean;
  shape?: "page" | "slide";
}) {
  const { look, kind } = useHomeLook();
  const office = look === "microsoft";
  return (
    <StartTile
      shape={shape}
      label={office && kind ? `Blank ${kind.startNoun}` : "Blank"}
      busy={creating}
      onClick={onCreate}
      face={
        <Plus
          className={cn("size-12 stroke-[1.25]", office ? "text-[var(--office-accent)]" : "text-primary")}
          aria-hidden
        />
      }
    />
  );
}

export function StartBand({
  kind,
  blank,
  templates,
  galleryOpen,
  onGalleryOpenChange,
  gallery,
  extraTiles,
}: {
  kind: HomeKind;
  blank: ReactNode;
  /** The template tiles (null while the template store is not wired — no stand-ins). */
  templates: ReactNode | null;
  galleryOpen: boolean;
  onGalleryOpenChange: (open: boolean) => void;
  /** The full gallery, rendered in place under the row when open. */
  gallery: ReactNode | null;
  /** Our own doors, shaped as tiles (From a table, Upload). */
  extraTiles?: ReactNode;
}) {
  const [hidden, setHidden] = useTemplatesHidden(kind.kind);
  const office = useHomeLook().look === "microsoft";
  const title = office ? "Create" : `Start a new ${kind.startNoun}`;

  return (
    <section
      id={`file-home-create-${kind.kind}`}
      aria-label={title}
      className={cn("scroll-mt-[var(--shell-header-h)] border-b border-border", office ? "bg-card" : "bg-muted/50")}
    >
      <div className="mx-auto w-full max-w-[72rem] px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex h-9 items-center gap-1">
          <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{title}</h2>
          {!hidden && gallery ? (
            <Button
              variant="quiet"
              aria-expanded={galleryOpen}
              icon={<ChevronsUpDown aria-hidden />}
              onClick={() => onGalleryOpenChange(!galleryOpen)}
            >
              {office ? "More templates" : "Template gallery"}
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="quiet" aria-label="Template options" icon={<MoreVertical aria-hidden />} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setHidden(!hidden)}>
                {hidden ? "Show templates" : "Hide templates"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div
          className={cn(
            "-mx-3 flex gap-3 overflow-x-auto px-3 pb-1 pt-2 scrollbar-none sm:mx-0 sm:gap-4 sm:px-0",
            "snap-x scroll-px-3 sm:scroll-px-0 [&>*]:snap-start",
          )}
        >
          {blank}
          {hidden ? null : templates}
          {extraTiles}
        </div>

        {!hidden && galleryOpen && gallery ? <div className="pt-4">{gallery}</div> : null}
      </div>
    </section>
  );
}
