"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  parseSettingsPath,
  getSliceBinding,
} from "../slice-bindings";
import type { SettingsPath, SettingsPersistence } from "../types";

/**
 * Read + write any setting by a single dotted path.
 *
 * Reading:
 *   const [mode] = useSetting<"light" | "dark">("theme.mode");
 *
 * Writing:
 *   const [, setMode] = useSetting<"light" | "dark">("theme.mode");
 *   setMode("dark");
 *
 * The generic `T` is the value type. It is the caller's responsibility to
 * match the path — if the hook ever needs stronger static guarantees, a
 * typed overload map can be layered on top later without breaking callers.
 */
export function useSetting<T>(
  path: SettingsPath,
): [T, (value: T) => void] {
  const dispatch = useAppDispatch();
  const value = useAppSelector((state) => {
    const { slice, key } = parseSettingsPath(path);
    return getSliceBinding(slice).read(state, key) as T;
  });

  const setValue = useCallback(
    (next: T) => {
      const { slice, key } = parseSettingsPath(path);
      dispatch(getSliceBinding(slice).write(key, next));
    },
    [dispatch, path],
  );

  return [value, setValue];
}

/**
 * Returns persistence metadata for a path — useful for surfacing badges
 * like "Local only" or "Saved to your account".
 */
export function useSettingPersistence(
  path: SettingsPath,
): SettingsPersistence {
  const { slice } = parseSettingsPath(path);
  return getSliceBinding(slice).persistence;
}
