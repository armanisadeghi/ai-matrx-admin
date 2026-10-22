"use client";

// The frame's Pinned section and its star, on the platform's ONE favourites system
// (`usePinned`: userPreferences.favorites + the canonical user_entity_state flag, saved to the
// person's account). The header's star IS the pin: starring a page pins it, and it shows in
// the sidebar's Pinned section here and in the classic Favorites menu. No second store.
import type { LucideIcon } from "lucide-react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectPreferencesLoadStatus } from "@/lib/redux/preferences/userPreferenceSelectors";
import { usePinned } from "@/components/favorites/usePinned";
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

export function useFramePins(pathname: string, pageLabel: string) {
  const { favorites, isPinned, toggle } = usePinned();
  // Until the saved preferences land, "not pinned" is the built-in default, not the person's answer.
  const known = useAppSelector(selectPreferencesLoadStatus) === "loaded";
  const page = pageFavorite(pathname, pageLabel);
  const favorite: FrameFavorite = {
    starred: known && isPinned(page.id),
    known,
    onToggle: () => {
      if (known) toggle(page);
    },
  };
  return { pins: favorites.map(pinFromFavorite), favorite };
}
