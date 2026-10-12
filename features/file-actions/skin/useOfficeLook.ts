"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { setPreference } from "@/lib/redux/preferences/userPreferencesSlice";
import type { RootState } from "@/lib/redux/store";
import { selectPreferencesLoadStatus } from "@/lib/redux/preferences/userPreferenceSelectors";
import { resolveOfficeLook, type OfficeLook } from "./office-look";

/**
 * The person's Office look, its setter (the setting itself — synced to their account), and whether
 * their saved preferences have been read yet (false: the look shown would be the default, not theirs).
 */
export function useOfficeLook(): [OfficeLook, (next: OfficeLook) => void, boolean] {
  const dispatch = useAppDispatch();
  const stored = useAppSelector((s: RootState) => s.userPreferences.display.officeLook);
  const look = resolveOfficeLook(stored);
  const settled = useAppSelector(selectPreferencesLoadStatus) !== "loading";
  const setLook = useCallback(
    (next: OfficeLook) => dispatch(setPreference({ module: "display", preference: "officeLook", value: next })),
    [dispatch],
  );
  return [look, setLook, settled];
}
