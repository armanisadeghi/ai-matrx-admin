"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { selectIsAuthenticated } from "@/lib/redux/selectors/userSelectors";
import {
  checkNotionConnection,
  disconnectNotion,
  loadNotionConnection,
  startNotionSignIn,
  type NotionConnection,
} from "./service";

/** The Hugging Face hook's shape (`useHuggingFaceConnection`), for the person's own Notion account. */
export function useNotionConnection() {
  const organizationId = useAppSelector(selectOrganizationId);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [connection, setConnection] = useState<NotionConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setConnection(await loadNotionConnection());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load Notion.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    void loadNotionConnection()
      .then((loaded) => {
        if (!active) return;
        setConnection(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load Notion.");
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
      setError(cause instanceof Error ? cause.message : "Notion request failed.");
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
        const result = await checkNotionConnection();
        const failed = result.workspaces.filter((w) => !w.ok);
        if (failed.length > 0) {
          throw new Error(
            failed.map((w) => `${w.workspace_name ?? "Workspace"}: ${w.error ?? "Notion did not accept it. Reconnect it."}`).join(" "),
          );
        }
        setChecked("ok");
      }),
    disconnect: (connectionId?: string) =>
      run(async () => {
        setChecked(null);
        setConnection(await disconnectNotion(connectionId));
      }),
    signIn: (returnUrl: string) =>
      run(async () => {
        if (!organizationId) throw new Error("Choose an organization before connecting Notion.");
        const result = await startNotionSignIn(returnUrl, organizationId);
        if (!result.ok) {
          if (!result.cancelled) throw new Error(result.error);
          return;
        }
        await reload();
      }),
  };
}
