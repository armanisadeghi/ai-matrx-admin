"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EMPTY_DRAFT,
  makeInjuryDraft,
  type ClaimDraft,
  type InjuryDraft,
  type RatingDraft,
} from "./types";

const STORAGE_KEY = "matrx:wc-pd-ratings:draft:v1";

function loadFromStorage(): RatingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RatingDraft;
    if (!parsed?.claim || !Array.isArray(parsed.injuries)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage(draft: RatingDraft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // localStorage full or disabled — silent
  }
}

function clearStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export interface UseRatingDraftOptions {
  initialDraft?: RatingDraft;
  persist?: boolean;
}

export function useRatingDraft(options: UseRatingDraftOptions = {}) {
  const { initialDraft, persist = true } = options;
  const [draft, setDraft] = useState<RatingDraft>(initialDraft ?? EMPTY_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const persistRef = useRef(persist);
  persistRef.current = persist;

  useEffect(() => {
    if (initialDraft) {
      setHydrated(true);
      return;
    }
    const stored = loadFromStorage();
    if (stored) setDraft(stored);
    setHydrated(true);
  }, [initialDraft]);

  useEffect(() => {
    if (!hydrated || !persistRef.current) return;
    saveToStorage(draft);
  }, [draft, hydrated]);

  const updateClaim = useCallback((patch: Partial<ClaimDraft>) => {
    setDraft((prev) => ({ ...prev, claim: { ...prev.claim, ...patch } }));
  }, []);

  const replaceInjuries = useCallback((injuries: InjuryDraft[]) => {
    setDraft((prev) => ({ ...prev, injuries }));
  }, []);

  const addInjury = useCallback((seed?: Partial<InjuryDraft>) => {
    const next = { ...makeInjuryDraft(), ...seed };
    setDraft((prev) => ({ ...prev, injuries: [...prev.injuries, next] }));
    return next.tmpId;
  }, []);

  const updateInjury = useCallback(
    (tmpId: string, patch: Partial<InjuryDraft>) => {
      setDraft((prev) => ({
        ...prev,
        injuries: prev.injuries.map((injury) =>
          injury.tmpId === tmpId ? { ...injury, ...patch } : injury,
        ),
      }));
    },
    [],
  );

  const removeInjury = useCallback((tmpId: string) => {
    setDraft((prev) => ({
      ...prev,
      injuries: prev.injuries.filter((injury) => injury.tmpId !== tmpId),
    }));
  }, []);

  const setPersistence = useCallback(
    (claimId: string, reportId: string, injuryIds: Record<string, string>) => {
      setDraft((prev) => ({
        ...prev,
        persistedClaimId: claimId,
        persistedReportId: reportId,
        injuries: prev.injuries.map((injury) => ({
          ...injury,
          persistedId: injuryIds[injury.tmpId] ?? injury.persistedId,
        })),
      }));
      if (persistRef.current) clearStorage();
    },
    [],
  );

  const resetDraft = useCallback(() => {
    setDraft(EMPTY_DRAFT);
    if (persistRef.current) clearStorage();
  }, []);

  return {
    draft,
    setDraft,
    hydrated,
    updateClaim,
    addInjury,
    updateInjury,
    removeInjury,
    replaceInjuries,
    setPersistence,
    resetDraft,
  };
}
