/**
 * The app's @ai-matrx/summon ports. Store-independent ones (notify, errors) are module values;
 * the rest are built from the app store: identity (`auth:<id>` / `guest:<fingerprint>`), the
 * admin debug flag, and persistence over the person's `users.user_surface_state` rows through
 * the app's @ai-matrx/data doors.
 */
import { createDb } from "@ai-matrx/data/db";
import type { DebugPort, ErrorSinkPort, IdentityPort, NotifyOptions, NotifyPort, OverlayPersistencePort } from "@ai-matrx/summon";
import type { DataOverlayPersistence } from "@ai-matrx/summon/persistence/data";
import { toast } from "@/lib/toast";
import { captureError } from "@/lib/diagnostics/errorCaptureStore";
import { selectIsDebugMode } from "@/lib/redux/preferences/adminDebugSlice";
import { selectAuthReady, selectFingerprintId, selectUserId } from "@/lib/redux/selectors/userSelectors";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import type { RootState } from "@/lib/redux/store";
import { supabase } from "@/utils/supabase/client";

interface StoreLike {
  getState(): unknown;
  subscribe(listener: () => void): () => void;
}

const toastOptions = (o?: NotifyOptions) =>
  o ? { id: o.id, description: o.description, duration: o.duration, action: o.action } : undefined;

export const appNotifyPort: NotifyPort = {
  info: (message, o) => void toast.info(message, toastOptions(o)),
  warn: (message, o) => void toast.warning(message, toastOptions(o)),
  error: (message, o) => void toast.error(message, toastOptions(o)),
  dismiss: (id) => void toast.dismiss(id),
};

export const appErrorPort: ErrorSinkPort = {
  capture: (error, context) => {
    const e = error instanceof Error ? error : new Error(typeof error === "string" ? error : "overlay error");
    const source = typeof context.source === "string" ? context.source : "overlays";
    captureError({
      source: "runtime-exception",
      name: `overlays:${source}`,
      message: e.message,
      stack: e.stack,
      raw: context,
      level: typeof context.level === "string" ? context.level : undefined,
    });
  },
};

export function createDebugPort(getState: () => unknown): DebugPort {
  return { enabled: () => !!getState() && selectIsDebugMode(getState() as RootState) };
}

// The store's middleware is built inside configureStore, before the store exists; it reads state
// through this binding (lib/redux/store.ts binds it right after creating the store).
let readStoreState: () => unknown = () => undefined;
export function bindOverlayStoreState(read: () => unknown): void {
  readStoreState = read;
}

/** Ports the store's overlays middleware needs (the render watchdog): notify, errors, debug. */
export function createStoreOverlayPorts() {
  return { notify: appNotifyPort, errors: appErrorPort, debug: createDebugPort(() => readStoreState()) };
}

export function createIdentityPort(store: StoreLike): IdentityPort {
  return {
    current: () => {
      const s = store.getState() as RootState;
      const userId = selectUserId(s);
      const fingerprint = selectFingerprintId(s);
      const key = userId ? `auth:${userId}` : fingerprint ? `guest:${fingerprint}` : "anonymous";
      return { key, ready: selectAuthReady(s) };
    },
    subscribe: (listener) => store.subscribe(listener),
  };
}

/**
 * Persistence over `users.user_surface_state`. The adapter loads on the first call (persistence
 * starts in the idle-loaded overlay services), so the root provider's static graph never carries it.
 * Boot is one `loadAll` read.
 */
export function createPersistencePort(store: StoreLike): OverlayPersistencePort {
  let adapter: Promise<DataOverlayPersistence> | null = null;
  const real = () =>
    (adapter ??= import("@ai-matrx/summon/persistence/data").then(({ createDataPersistence }) =>
      createDataPersistence({
        db: createDb({ client: supabase, organization: () => selectOrganizationId(store.getState() as RootState) }),
        userId: () => selectUserId(store.getState() as RootState),
      }),
    ));
  return {
    perPerson: true,
    load: async (key) => (await real()).load(key),
    save: async (key, value, options) => (await real()).save(key, value, options),
    remove: async (key) => (await real()).remove(key),
    list: async (prefix) => (await real()).list(prefix),
    loadAll: async () => (await real()).loadAll(),
  };
}

export function createAppOverlayPorts(store: StoreLike) {
  return {
    identity: createIdentityPort(store),
    notify: appNotifyPort,
    errors: appErrorPort,
    debug: { ...createDebugPort(() => store.getState()), subscribe: (l: () => void) => store.subscribe(l) },
    persistence: createPersistencePort(store),
  };
}
