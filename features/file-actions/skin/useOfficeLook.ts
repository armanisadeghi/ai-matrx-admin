"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { setPreference } from "@/lib/redux/preferences/userPreferencesSlice";
import type { RootState } from "@/lib/redux/store";
import { resolveOfficeLook, type OfficeLook } from "./office-look";

/** The person's Office look and its setter (the setting itself — synced to their account). */
export function useOfficeLook(): [OfficeLook, (next: OfficeLook) => void] {
  const dispatch = useAppDispatch();
  const stored = useAppSelector((s: RootState) => s.userPreferences.display.officeLook);
  const look = resolveOfficeLook(stored);
  const setLook = useCallback(
    (next: OfficeLook) => dispatch(setPreference({ module: "display", preference: "officeLook", value: next })),
    [dispatch],
  );
  return [look, setLook];
}
