"use client";

/**
 * Backs every `<FirstUseHint>` (@ai-matrx/design-system) with the person's server-synced
 * preferences: learned ids live in `userPreferences.system.learnedHints`, and no hint shows
 * until the saved record has loaded (so nobody who learned one sees it flash).
 */

import type { ReactNode } from "react";
import { FirstUseHintProvider, type FirstUseHintStore } from "@ai-matrx/design-system";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { setModulePreferences } from "@/lib/redux/preferences/userPreferencesSlice";

const NONE: string[] = [];

export function FirstUseHintHost({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const learned = useAppSelector((s) => s.userPreferences.system?.learnedHints ?? NONE);
  const ready = useAppSelector((s) => s.userPreferences._meta.loadStatus === "loaded");
  const store: FirstUseHintStore = {
    ready,
    learned,
    learn: (id) => {
      if (learned.includes(id)) return;
      dispatch(setModulePreferences({ module: "system", preferences: { learnedHints: [...learned, id] } }));
    },
  };
  return <FirstUseHintProvider store={store}>{children}</FirstUseHintProvider>;
}
