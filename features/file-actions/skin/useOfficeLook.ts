"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { setPreference } from "@/lib/redux/preferences/userPreferencesSlice";
import type { RootState } from "@/lib/redux/store";
import { selectPreferencesLoadStatus } from "@/lib/redux/preferences/userPreferenceSelectors";
import { useOfficeLookSeed } from "./office-look-seed";
import { resolveOfficeLook, type OfficeLook } from "./office-look";

/**
 * The person's Office look, its setter (the setting itself — synced to their account), and whether
 * the look is known (saved preferences read, or the server's cookie seed) — false: it would be the default, not theirs.
 */
export function useOfficeLook(): [OfficeLook, (next: OfficeLook) => void, boolean] {
  const dispatch = useAppDispatch();
  const stored = useAppSelector((s: RootState) => s.userPreferences.display.officeLook);
  const seed = useOfficeLookSeed();
  const prefsRead = useAppSelector(selectPreferencesLoadStatus) !== "loading";
  // Saved preferences win once read; until then the server-read cookie (the same value, last time)
  // keeps the first frame in the person's look. No cookie yet (a first visit on this browser): unsettled.
  const look = prefsRead ? resolveOfficeLook(stored) : (seed ?? resolveOfficeLook(stored));
  const settled = prefsRead || seed !== null;
  const setLook = useCallback(
    (next: OfficeLook) => dispatch(setPreference({ module: "display", preference: "officeLook", value: next })),
    [dispatch],
  );
  return [look, setLook, settled];
}
