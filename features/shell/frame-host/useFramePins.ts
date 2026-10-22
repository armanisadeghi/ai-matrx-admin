"use client";

// The frame's Pinned section and its star, on the platform's ONE favourites system
// (`usePinned`: userPreferences.favorites + the canonical user_entity_state flag, saved to the
// person's account). The header's star IS the pin: starring a page pins it, and it shows in
// the sidebar's Pinned section here and in the classic Favorites menu. No second store.
//
// WHAT THE STAR FAVORITES (adversarial review, 2026-10-22): on a record page — one that declared
// its record through the current-record primitive (EntityModeHeader / RecordPageHeader /
// <DeclareCurrentRecord>) — the RECORD itself (`${kind}:${id}`, the same favorite PinButton
// writes); elsewhere the page. An unsaved page (a `/new` address) has no star at all.
import type { LucideIcon } from "lucide-react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectFavoritesChosen, selectPreferencesLoadStatus } from "@/lib/redux/preferences/userPreferenceSelectors";
import { favoriteId, isFavoritableRecordKind, usePinned } from "@/components/favorites/usePinned";
import { useCurrentRecord } from "@/features/shell/current-record/currentRecord";
import { isUuidShape } from "@ai-matrx/kit/uuid";
import type { FavoriteItem } from "@/lib/redux/preferences/userPreferencesSlice";
import { resolveShellIconName, shellIconComponents } from "@/features/shell/shellIconMap";
import type { FramePin } from "@/features/shell/frame/types";
import type { FrameFavorite } from "@/features/shell/frame/SheetHeader";

export function pinFromFavorite(f: FavoriteItem): FramePin {
  return {
    id: f.id,
    label: f.label,
    href: f.href,
    icon: shellIconComponents[resolveShellIconName(f.iconName ?? "Star")] as LucideIcon,
  };
}

/** The page the person is on, as a favourite: nav kind, keyed by its path. */
export function pageFavorite(pathname: string, label: string) {
  return { id: pathname, kind: "nav" as const, label, href: pathname };
}

/** An address of a thing not saved yet (`/chat/new`, `/notes/new`): nothing there to favorite. */
export function isUnsavedPath(pathname: string): boolean {
  return pathname.split("/").includes("new");
}

/**
 * THE PINNED EDITOR'S SAVE, on the one favourites store: removed pins are unpinned, new ones pinned
 * (a product or page pin is a `nav` favourite keyed by its address), then the order is saved.
 */
export function savePinsTo(
  store: Pick<ReturnType<typeof usePinned>, "favorites" | "pin" | "unpin" | "reorder">,
  next: readonly FramePin[],
): void {
  const keep = new Set(next.map((p) => p.id));
  for (const f of store.favorites) if (!keep.has(f.id)) store.unpin(f.id);
  const have = new Set(store.favorites.map((f) => f.id));
  for (const p of next) if (!have.has(p.id)) store.pin({ id: p.id, kind: "nav", label: p.label, href: p.href });
  store.reorder(next.map((p) => p.id));
}

export function useFramePins(pathname: string, pageLabel: string, startingPins: readonly FramePin[] = []) {
  const store = usePinned();
  const { favorites, isPinned, toggle } = store;
  const record = useCurrentRecord();
  // Until the saved preferences land, "not pinned" is the built-in default, not the person's answer.
  const known = useAppSelector(selectPreferencesLoadStatus) === "loaded";
  // A person with no pins yet starts with the starting set (owner, 2026-10-22); saving any edit
  // writes their own. Until the saved preferences land, the starting set is not shown as theirs.
  // A person who removed every pin chose none: that stays empty (only the add slot shows).
  const chosen = useAppSelector(selectFavoritesChosen);
  const pins = favorites.length > 0 || chosen ? favorites.map(pinFromFavorite) : known ? [...startingPins] : [];
  const savePins = (next: FramePin[]) => savePinsTo(store, next);
  if (isUnsavedPath(pathname)) return { pins, favorite: undefined, savePins };
  const target =
    record && isFavoritableRecordKind(record.token) && record.id && isUuidShape(record.id)
      ? {
          id: favoriteId(record.token, record.id),
          kind: record.token,
          label: record.label ?? pageLabel,
          href: pathname,
        }
      : pageFavorite(pathname, pageLabel);
  const favorite: FrameFavorite = {
    starred: known && isPinned(target.id),
    known,
    onToggle: () => {
      if (known) toggle(target);
    },
  };
  return { pins, favorite, savePins };
}
