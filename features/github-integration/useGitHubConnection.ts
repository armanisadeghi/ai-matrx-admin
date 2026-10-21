"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  EMPTY_INVENTORY,
  disconnectGitHubConnection,
  loadGitHubConnectionInventory,
  startGitHubConnection,
  syncGitHubConnection,
} from "./service";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import {
  selectIsAuthenticated,
  selectUserId,
} from "@/lib/redux/selectors/userSelectors";

/**
 * ONE GITHUB READ PER PAGE, NOT ONE PER CALLER (2026-10-21). The chat's MCP
 * catalog asks for GitHub's status from five always-mounted places (the
 * connections strip, the session panel, the attachments chip, the + menu's
 * Connections panel, the adoption watch); each instance used to start its own
 * `loadGitHubConnectionInventory` and hold its own copy. The inventory is one
 * shared answer: the first mount reads, every other caller reads the same
 * answer, and a mount after `FRESH_FOR_MS` reads again. Actions stay
 * per-caller (their busy / error belong to the button that started them).
 */
const FRESH_FOR_MS = 30_000;

type SharedRead = {
  userId: string | null;
  inventory: typeof EMPTY_INVENTORY;
  loading: boolean;
  readError: string | null;
  readAt: number;
};

let shared: SharedRead = {
  userId: null,
  inventory: EMPTY_INVENTORY,
  loading: true,
  readError: null,
  readAt: 0,
};
let inflight: { userId: string | null; promise: Promise<void> } | null = null;
/** Only the newest read publishes, so a slow older answer never overwrites a newer one. */
let latestRead = 0;
const listeners = new Set<() => void>();

function publish(next: Partial<SharedRead>) {
  shared = { ...shared, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const readShared = () => shared;

/**
 * Read the inventory for `userId`, joining a read already in flight for them —
 * unless `fresh` (after an action changed the connection, an earlier read's
 * answer is already stale).
 */
function readInventory(
  userId: string | null,
  options: { fresh?: boolean } = {},
): Promise<void> {
  if (!options.fresh && inflight && inflight.userId === userId) {
    return inflight.promise;
  }
  const mine = ++latestRead;
  if (shared.userId !== userId) {
    publish({ userId, inventory: EMPTY_INVENTORY, readError: null, readAt: 0 });
  }
  publish({ loading: true });
  const promise = loadGitHubConnectionInventory()
    .then(
      (inventory) => {
        if (mine !== latestRead) return;
        publish({ inventory, readError: null, loading: false, readAt: Date.now() });
      },
      (cause: unknown) => {
        const message =
          cause instanceof Error ? cause.message : "Unable to load GitHub.";
        if (mine === latestRead) {
          publish({ readError: message, loading: false, readAt: Date.now() });
        }
        throw new Error(message);
      },
    )
    .finally(() => {
      if (inflight?.promise === promise) inflight = null;
    });
  inflight = { userId, promise };
  return promise;
}

/** Test seam: forget the shared read. */
export function resetGitHubConnectionReadForTests() {
  inflight = null;
  latestRead = 0;
  shared = {
    userId: null,
    inventory: EMPTY_INVENTORY,
    loading: true,
    readError: null,
    readAt: 0,
  };
}

export function useGitHubConnection() {
  const organizationId = useAppSelector(selectOrganizationId);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const userId = useAppSelector(selectUserId);
  const read = useSyncExternalStore(subscribe, readShared, readShared);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const ownRead = read.userId === userId;
  const inventory = ownRead ? read.inventory : EMPTY_INVENTORY;
  const loading = !ownRead || read.loading;
  /**
   * The inventory READ's own failure (never an action's), so a list drawn from
   * `inventory` can say "couldn't load" instead of "no repositories yet".
   */
  const readError = ownRead ? read.readError : null;

  const reload = async () => {
    setError(null);
    try {
      await readInventory(userId, { fresh: true });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load GitHub.",
      );
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const current = readShared();
    const fresh =
      current.userId === userId &&
      current.readAt > 0 &&
      Date.now() - current.readAt < FRESH_FOR_MS;
    if (fresh) return;
    // A failed read is carried by the shared `readError` (shown as `error` below).
    readInventory(userId).catch(() => undefined);
  }, [isAuthenticated, userId]);

  const authorize = async (returnUrl: string, mode?: "install") => {
    if (pending.current) return;
    if (!organizationId) {
      setError("Select an organization before connecting GitHub.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const outcome = await startGitHubConnection(
        returnUrl,
        organizationId,
        mode,
      );
      if (outcome.ok) {
        await reload();
      } else if (!outcome.cancelled) {
        // A complete OAuth exchange can persist `needs_attention`; refresh it so
        // the card tells the truth instead of retaining a stale disconnected row.
        await reload();
        setError(outcome.error);
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to connect GitHub.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const connect = (returnUrl = window.location.pathname) =>
    authorize(returnUrl);
  const install = (returnUrl = window.location.pathname) =>
    authorize(returnUrl, "install");

  const sync = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await syncGitHubConnection();
      await reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to refresh GitHub.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await disconnectGitHubConnection();
      await reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to disconnect GitHub.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return {
    inventory: isAuthenticated ? inventory : EMPTY_INVENTORY,
    loading: isAuthenticated && loading,
    busy,
    // An action's own failure, else the shared read's.
    error: error ?? (isAuthenticated ? readError : null),
    readError: isAuthenticated ? readError : null,
    reload,
    connect,
    install,
    sync,
    disconnect,
  };
}
