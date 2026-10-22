"use client";

// The app grid's favorites for the live frame: one preference (userPreferences.appGrid.favorites),
// saved to the person's account through the settings system. `null` = never edited, so the
// frame's default nine shows. The frame itself stays host-agnostic (favorites + onFavoritesChange).
import { useSetting } from "@/features/settings/hooks/useSetting";
import { DEFAULT_GRID_FAVORITES } from "@/features/shell/frame/products";

export function useGridFavorites(): [readonly string[], (ids: string[]) => void] {
  const [saved, save] = useSetting<string[] | null>("userPreferences.appGrid.favorites");
  return [saved ?? DEFAULT_GRID_FAVORITES, save];
}
