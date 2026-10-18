"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { selectIsAuthenticated } from "@/lib/redux/selectors/userSelectors";
import {
  checkSlackConnection,
  disconnectSlack,
  loadSlackConnection,
  startSlackSignIn,
  type SlackConnection,
} from "./service";

/** The Hugging Face hook's shape (`useHuggingFaceConnection`), for the person's own Slack account. */
export function useSlackConnection() {
  const organizationId = useAppSelector(selectOrganizationId);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [connection, setConnection] = useState<SlackConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setConnection(await loadSlackConnection());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load Slack.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    void loadSlackConnection()
      .then((loaded) => {
        if (!active) return;
        setConnection(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load Slack.");
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
      setError(cause instanceof Error ? cause.message : "Slack request failed.");
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
    checked,
    organizationId,
    reload,
    check: () =>
      run(async () => {
        const result = await checkSlackConnection();
        setChecked(result.team_name ?? result.team_url ?? "Slack");
      }),
    disconnect: () =>
      run(async () => {
        setChecked(null);
        setConnection(await disconnectSlack());
      }),
    signIn: (returnUrl: string) =>
      run(async () => {
        if (!organizationId) throw new Error("Choose an organization before connecting Slack.");
        const result = await startSlackSignIn(returnUrl, organizationId);
        if (!result.ok) {
          if (!result.cancelled) throw new Error(result.error);
          return;
        }
        await reload();
      }),
  };
}
