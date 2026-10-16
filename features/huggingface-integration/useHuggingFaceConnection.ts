"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { selectIsAuthenticated } from "@/lib/redux/selectors/userSelectors";
import {
  disconnectHuggingFace,
  loadHuggingFaceConnection,
  saveHuggingFaceToken,
  startHuggingFaceSignIn,
  type HuggingFaceConnection,
} from "./service";

export function useHuggingFaceConnection() {
  const organizationId = useAppSelector(selectOrganizationId);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [connection, setConnection] = useState<HuggingFaceConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setConnection(await loadHuggingFaceConnection());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load Hugging Face.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    void loadHuggingFaceConnection()
      .then((loaded) => {
        if (!active) return;
        setConnection(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load Hugging Face.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  /** Resolves true when the work finished, false when it failed (the reason is in `error`). */
  const run = async (work: () => Promise<void>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await work();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Hugging Face request failed.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  return {
    connection,
    loading,
    busy,
    error,
    organizationId,
    reload,
    pasteToken: (token: string) =>
      run(async () => {
        setConnection(await saveHuggingFaceToken(token));
      }),
    disconnect: () =>
      run(async () => {
        setConnection(await disconnectHuggingFace());
      }),
    signIn: (returnUrl: string) =>
      run(async () => {
        if (!organizationId) throw new Error("Choose an organization before connecting Hugging Face.");
        const result = await startHuggingFaceSignIn(returnUrl, organizationId);
        if (!result.ok) {
          if (!result.cancelled) throw new Error(result.error);
          return;
        }
        await reload();
      }),
  };
}
