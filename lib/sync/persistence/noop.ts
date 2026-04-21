/**
 * lib/sync/persistence/noop.ts
 *
 * No-op persistence adapter for `volatile` and `ui-broadcast` presets. The
 * engine resolves the adapter by preset; volatile slices never persist, so
 * their adapter calls are no-ops.
 *
 * Exists so the middleware can call `adapter.write()` without branching on
 * preset at every action (Constitution IV: engine is smart, call sites dumb).
 */

import type { PersistenceAdapter } from "./types";
/* eslint-disable @typescript-eslint/no-unused-vars */

export const noopAdapter: PersistenceAdapter = {
    read() {
        return null;
    },
    write() {
        /* noop */
    },
    remove() {
        /* noop */
    },
};
