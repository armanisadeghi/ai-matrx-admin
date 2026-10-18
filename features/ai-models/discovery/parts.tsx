"use client";

// Small presentational parts of the discovery panel, split out so they render (and are tested) without the page's state.

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@ai-matrx/design-system/controls";
import { cn } from "@/lib/utils";
import type { Placement, SuggestedMedia } from "./api";
import { pageChoices, placementForPage, shelvesOnPage } from "./placement";

export function TagsField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <>
      <span className="text-muted-foreground">Tags</span>
      <Input
        aria-label="Tags"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={value.trim() ? undefined : "None on the card; type some, separated by commas"}
      />
    </>
  );
}

/** Only images that were really copied (file and address) can be picked; with none, one plain line and no controls. */
export function ImagePicker({
  candidateId,
  media,
  hero,
  gallery,
  onHero,
  onGallery,
}: {
  candidateId: string;
  media: readonly SuggestedMedia[];
  hero: string | null;
  gallery: ReadonlySet<string>;
  onHero: (id: string) => void;
  onGallery: (id: string, on: boolean) => void;
}) {
  const images = media.filter((m) => m.kind === "image" && m.file_id && m.cdn_url);
  if (images.length === 0)
    return <p className="text-sm text-muted-foreground">No images on the model card; the maker logo shows instead</p>;
  return (
    <>
      <p className="mb-2 text-xs text-muted-foreground">
        Images are copied into our file storage. Pick the main image and which others to keep.
      </p>
      <div className="flex flex-wrap gap-3">
        {images.map((m) => {
          const id = m.file_id as string;
          return (
            <figure key={id} className="w-36 space-y-1">
              <img
                src={m.cdn_url ?? ""}
                alt={m.alt}
                className={cn("h-24 w-36 rounded-md border object-cover", hero === id ? "border-primary" : "border-border")}
              />
              <label className="flex items-center gap-1 text-xs">
                <input type="radio" name={`hero-${candidateId}`} checked={hero === id} onChange={() => onHero(id)} />
                Main image
              </label>
              <label className="flex items-center gap-1 text-xs">
                <Checkbox
                  checked={gallery.has(id) || hero === id}
                  disabled={hero === id}
                  onCheckedChange={(on) => onGallery(id, Boolean(on))}
                />
                Keep
              </label>
            </figure>
          );
        })}
      </div>
    </>
  );
}

/**
 * Page, shelf and shelf title: page and shelf are picked from what exists (plus "a new shelf"),
 * the title is text. `automatic` is the placement promote would choose by itself; it is labeled.
 */
export function PlacementFields({
  value,
  automatic,
  inUse,
  specPages,
  onChange,
  onUseAutomatic,
  saveLabel,
  onSave,
  saving,
}: {
  value: Placement;
  automatic: Placement | null;
  inUse: readonly Placement[];
  specPages: readonly string[];
  onChange: (next: Placement) => void;
  onUseAutomatic?: () => void;
  saveLabel?: string;
  onSave?: () => void;
  saving?: boolean;
}) {
  const pages = pageChoices(inUse, [...specPages, value.page]);
  const shelves = shelvesOnPage(inUse, value.page);
  const isAuto = automatic && automatic.page === value.page && automatic.shelf === value.shelf && automatic.shelf_title === value.shelf_title;
  return (
    <div className="grid grid-cols-[8rem_1fr] items-center gap-2 text-sm" aria-label="Where it shows on the Models page">
      <span className="text-muted-foreground">Models page</span>
      <Select value={value.page} onValueChange={(page) => onChange(placementForPage(inUse, automatic, page))}>
        <SelectTrigger className="max-w-xs" aria-label="Models page"><SelectValue /></SelectTrigger>
        <SelectContent>
          {pages.map((p) => (
            <SelectItem key={p} value={p}>{p}{automatic?.page === p ? " (automatic)" : ""}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">Shelf</span>
      <Select
        value={shelves.some((s) => s.shelf === value.shelf) ? value.shelf : "__new__"}
        onValueChange={(shelf) => {
          const known = shelves.find((s) => s.shelf === shelf);
          onChange(known ? { ...value, shelf, shelf_title: known.shelf_title } : { ...value, shelf: "" });
        }}
      >
        <SelectTrigger className="max-w-xs" aria-label="Shelf"><SelectValue /></SelectTrigger>
        <SelectContent>
          {shelves.map((s) => (
            <SelectItem key={s.shelf} value={s.shelf}>{s.shelf_title}</SelectItem>
          ))}
          <SelectItem value="__new__">A new shelf</SelectItem>
        </SelectContent>
      </Select>
      {!shelves.some((s) => s.shelf === value.shelf) ? (
        <>
          <span className="text-muted-foreground">Shelf name</span>
          <Input aria-label="Shelf name" value={value.shelf} placeholder="short id, e.g. voices" onChange={(e) => onChange({ ...value, shelf: e.target.value })} />
        </>
      ) : null}
      <span className="text-muted-foreground">Shelf title</span>
      <Input aria-label="Shelf title" value={value.shelf_title} onChange={(e) => onChange({ ...value, shelf_title: e.target.value })} />
      <span />
      <p className="text-xs text-muted-foreground">
        {automatic
          ? isAuto
            ? "This is the automatic choice, from what the model takes in and makes."
            : `Automatic choice would be: ${automatic.page} page, shelf “${automatic.shelf_title}”.`
          : ""}
        {onUseAutomatic && automatic && !isAuto ? (
          <Button variant="quiet" onClick={onUseAutomatic}>Use the automatic choice</Button>
        ) : null}
      </p>
      {onSave ? (
        <>
          <span />
          <div>
            <Button onClick={onSave} disabled={saving || !value.page || !value.shelf || !value.shelf_title.trim()}>
              {saveLabel ?? "Save"}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
