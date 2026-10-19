"use client";

// Add to my menu (custom-experience PLAN §1.2, §5.4): from any page — the Intelligence dropdown (the
// `AddToMyMenu` chat host slot) and beside every PinButton — put this page, or the record it shows, into
// your Sidebar (top level or a group), your Dock or your Header. Saves your layout at once (one version);
// the shell redraws live. A page our menus already know is added as that menu row (with its defaults).
import { useState } from "react";
import { ListPlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { Button, RegionSkeleton, Select, Tile } from "@ai-matrx/design-system/controls";
import { toast } from "@/lib/toast";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdmin } from "@/lib/redux/selectors/userSelectors";
import { useCurrentRecord } from "@/features/shell/current-record/currentRecord";
import { parseShellLayoutBody } from "../validate";
import { useShellLayoutStore } from "../useShellLayoutStore";
import { rowLabel } from "./rowDisplay";
import { addPageToBody, sidebarGroups, sidebarOf, startingBody, type AddPlace, type MenuPageItem } from "./regions";
import { ShellLayoutMount } from "./ShellLayoutMount";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The page's own title without the site suffix ("Acme agent | AI Matrx" → "Acme agent"). */
function documentTitle(): string {
  if (typeof document === "undefined") return "";
  return document.title.split(/\s+[|·–-]\s+/)[0]?.trim() ?? "";
}

/** The page the person is on, as an item (the record it shows when the page declared one). */
export function useThisPageItem(fallbackLabel: string): () => MenuPageItem {
  const record = useCurrentRecord();
  return () => {
    const href = `${window.location.pathname}${window.location.search}`;
    const label = record?.label || (fallbackLabel && fallbackLabel !== "This page" ? fallbackLabel : "") || documentTitle() || window.location.pathname;
    return { href, label, record: record?.token && record.id ? { token: record.token, id: record.id } : null };
  };
}

/** A favorite (PinButton's item) as a menu item: a record when its address names one. */
export function itemFromFavorite(fav: { kind: string; label: string; href: string }): MenuPageItem {
  const last = fav.href.split("?")[0]?.split("/").filter(Boolean).find((seg) => UUID.test(seg));
  return { href: fav.href, label: fav.label, record: fav.kind !== "nav" && last ? { token: fav.kind, id: last } : null };
}

/** The place choices; saves the person's layout. Must sit under ShellLayoutMount. */
function AddChoices({ item, onDone }: { item: MenuPageItem; onDone: () => void }) {
  const store = useShellLayoutStore();
  const isAdmin = useAppSelector(selectIsAdmin);
  const [into, setInto] = useState("top");
  if (store.loading) return <RegionSkeleton />;
  const own = store.person ? parseShellLayoutBody(store.person.body).body : null;
  const org = store.organization ? parseShellLayoutBody(store.organization.body).body : null;
  const base = startingBody(own, org, "person");
  const groups = sidebarGroups(sidebarOf(base), rowLabel);

  const add = async (place: AddPlace) => {
    const result = addPageToBody(base, item, place, { isAdmin });
    if (!result.added) {
      toast.info(result.reason === "dock-full" ? "Your dock is full. Remove one first." : `${item.label} is already there`);
      return;
    }
    const where = place.region === "header" ? "header" : place.region === "dock" ? "dock" : "sidebar";
    const answer = await store.save("person", result.body, `${result.moved ? "Moved" : "Added"} ${item.label} in the ${where}`);
    if (answer.ok) {
      toast.success(result.moved ? `Moved in your ${where}` : `Added to your ${where}`);
      onDone();
    } else toast.error(answer.error);
  };

  return (
    <div className="space-y-2">
      <p className="truncate type-title" title={item.href}>
        {item.label}
      </p>
      <div className="flex items-center gap-1.5">
        <Select
          aria-label="Where in the sidebar"
          value={into}
          onValueChange={setInto}
          options={[{ value: "top", label: "Sidebar, top level" }, ...groups.map((g) => ({ value: g.id, label: `${g.depth > 1 ? "· " : ""}Into ${g.label}` }))]}
        />
        <Button variant="primary" disabled={store.saving} onClick={() => void add({ region: "sidebar", intoId: into === "top" ? null : into })}>
          Add
        </Button>
      </div>
      <div className="flex gap-1.5">
        <Button variant="outline" disabled={store.saving} onClick={() => void add({ region: "dock" })}>
          Add to dock
        </Button>
        <Button variant="outline" disabled={store.saving} onClick={() => void add({ region: "header" })}>
          Add to header
        </Button>
      </div>
    </div>
  );
}

/** The Intelligence dropdown's tile (registered as the chat host slot `AddToMyMenu`). */
export function AddToMyMenuTile({ surfaceLabel, onDone }: { surfaceName: string | null; surfaceLabel: string; onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState<MenuPageItem | null>(null);
  const read = useThisPageItem(surfaceLabel);
  return (
    <>
      <Tile
        variant="outline"
        icon={<ListPlus />}
        title="Add to my menu"
        line="Sidebar, dock or header"
        selected={open}
        onClick={() => {
          setItem(read());
          setOpen(!open);
        }}
        className="min-w-0"
      />
      {open && item ? (
        <div className="col-span-full rounded-md border border-border p-2">
          <ShellLayoutMount>
            <AddChoices item={item} onDone={() => onDone?.()} />
          </ShellLayoutMount>
        </div>
      ) : null}
    </>
  );
}

/** Beside a PinButton: the same choices in a popover. */
export function AddToMyMenuButton({ item, className }: { item: MenuPageItem; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Add ${item.label} to my menu`}
          title="Add to my menu"
          className={["matrx-tap-target rounded-full text-muted-foreground hover:text-foreground", className].filter(Boolean).join(" ")}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="matrx-tap-pill matrx-tap-pill-sm hover:bg-accent">
            <ListPlus size={14} strokeWidth={2} />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3" onClick={(e) => e.stopPropagation()}>
        {open ? (
          <ShellLayoutMount>
            <AddChoices item={item} onDone={() => setOpen(false)} />
          </ShellLayoutMount>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
