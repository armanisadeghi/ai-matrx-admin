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
import { selectPreferencesLoadStatus } from "@/lib/redux/preferences/userPreferenceSelectors";
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

export function useFramePins(pathname: string, pageLabel: string) {
  const { favorites, isPinned, toggle } = usePinned();
  const record = useCurrentRecord();
  // Until the saved preferences land, "not pinned" is the built-in default, not the person's answer.
  const known = useAppSelector(selectPreferencesLoadStatus) === "loaded";
  const pins = favorites.map(pinFromFavorite);
  if (isUnsavedPath(pathname)) return { pins, favorite: undefined };
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
  return { pins, favorite };
}
