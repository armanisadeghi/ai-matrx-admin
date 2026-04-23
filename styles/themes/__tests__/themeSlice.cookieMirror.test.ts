/**
 * themeSlice.cookieMirror.test.ts — Phase 3 PR 3.B
 *
 * Covers the cookie-mirror side-effect that keeps the server-readable
 * `theme` cookie in lockstep with the Redux `theme.mode`. Two layers are
 * exercised here:
 *
 *   1. `writeThemeCookie(mode)` posts to `/api/set-theme` with the correct
 *      body and swallows fetch failures (fire-and-forget).
 *
 *   2. The subscription pattern installed by `providers/StoreProvider.tsx` —
 *      fires `writeThemeCookie` only when `theme.mode` *changes*, seeded
 *      from the store's initial state so a REHYDRATE landing with the same
 *      value does NOT trigger a redundant POST.
 *
 * Runs under jsdom. `global.fetch` is stubbed with a Jest mock; we never
 * hit the network.
 */

import { configureStore } from "@reduxjs/toolkit";
import themeReducer, {
    setMode,
    toggleMode,
    writeThemeCookie,
    type ThemeMode,
    type ThemeState,
} from "../themeSlice";
import {
    REHYDRATE_ACTION_TYPE,
    type RehydrateAction,
} from "@/lib/sync/engine/rehydrate";

// --- fetch stub ----------------------------------------------------------

const originalFetch = global.fetch;

// jsdom doesn't polyfill Response, but `writeThemeCookie` is fire-and-forget
// and doesn't read the response body — a minimal resolved object is enough.
function stubFetch(
    impl?: (input: RequestInfo | URL, init?: RequestInit) => Promise<unknown>,
): jest.Mock {
    const fn = jest.fn(impl ?? (() => Promise.resolve({ ok: true, status: 200 })));
    (global as { fetch: typeof fetch }).fetch = fn as unknown as typeof fetch;
    return fn;
}

afterEach(() => {
    (global as { fetch: typeof fetch }).fetch = originalFetch;
    jest.restoreAllMocks();
});

// --- writeThemeCookie ----------------------------------------------------

describe("writeThemeCookie", () => {
    it("POSTs /api/set-theme with the dark payload", async () => {
        const fetchMock = stubFetch();

        writeThemeCookie("dark");
        // Flush the fire-and-forget microtask.
        await Promise.resolve();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("/api/set-theme");
        expect(init?.method).toBe("POST");
        expect((init?.headers as Record<string, string>)["Content-Type"]).toBe(
            "application/json",
        );
        expect(init?.body).toBe(JSON.stringify({ theme: "dark" }));
    });

    it("POSTs /api/set-theme with the light payload", async () => {
        const fetchMock = stubFetch();

        writeThemeCookie("light");
        await Promise.resolve();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][1]?.body).toBe(
            JSON.stringify({ theme: "light" }),
        );
    });

    it("swallows fetch rejections (fire-and-forget)", async () => {
        const fetchMock = stubFetch(() =>
            Promise.reject(new Error("offline")),
        );

        // Must not throw synchronously.
        expect(() => writeThemeCookie("dark")).not.toThrow();

        // And the rejection must be caught — no unhandledrejection.
        // Letting the task queue drain is enough; if uncaught, Node would log.
        await new Promise((r) => setTimeout(r, 0));

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});

// --- subscription pattern (replica of StoreProvider wiring) --------------

/**
 * Mirrors the subscription installed by
 * `providers/StoreProvider.tsx::getOrCreateClientStore`. Installing the same
 * logic here verifies the contract without the React/singleton complexity
 * of the provider. If StoreProvider's logic changes, this test must too.
 */
function installThemeCookieMirror(
    store: ReturnType<typeof makeTestStore>,
): () => void {
    let lastMode: ThemeMode | undefined = store.getState().theme?.mode;
    return store.subscribe(() => {
        const mode = store.getState().theme?.mode;
        if (mode && mode !== lastMode) {
            lastMode = mode;
            writeThemeCookie(mode);
        }
    });
}

function makeTestStore(preload?: ThemeState) {
    return configureStore({
        reducer: { theme: themeReducer },
        preloadedState: preload ? { theme: preload } : undefined,
    });
}

describe("StoreProvider theme-cookie subscription pattern", () => {
    it("fires writeThemeCookie when setMode changes the value", async () => {
        const fetchMock = stubFetch();
        const store = makeTestStore({ mode: "dark" });
        installThemeCookieMirror(store);

        store.dispatch(setMode("light"));
        await Promise.resolve();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][1]?.body).toBe(
            JSON.stringify({ theme: "light" }),
        );
    });

    it("fires writeThemeCookie on toggleMode", async () => {
        const fetchMock = stubFetch();
        const store = makeTestStore({ mode: "dark" });
        installThemeCookieMirror(store);

        store.dispatch(toggleMode());
        await Promise.resolve();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][1]?.body).toBe(
            JSON.stringify({ theme: "light" }),
        );
    });

    it("does NOT fire on setMode when the value is unchanged", async () => {
        const fetchMock = stubFetch();
        const store = makeTestStore({ mode: "dark" });
        installThemeCookieMirror(store);

        // Dispatch an action that keeps the value identical. The reducer
        // still runs but the subscription watcher must short-circuit.
        store.dispatch(setMode("dark"));
        await Promise.resolve();

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("does NOT fire when REHYDRATE lands with the same value as initial state", async () => {
        const fetchMock = stubFetch();
        // This is the critical property: first-load SSR baseline and the
        // persisted cookie/LS value agree, so REHYDRATE fires but must not
        // trigger a redundant POST.
        const store = makeTestStore({ mode: "dark" });
        installThemeCookieMirror(store);

        const rehydrate: RehydrateAction = {
            type: REHYDRATE_ACTION_TYPE,
            payload: {
                sliceName: "theme",
                state: { mode: "dark" },
            },
            meta: { fromRehydrate: true },
        };
        store.dispatch(rehydrate);
        await Promise.resolve();

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("fires when REHYDRATE brings in a different value than the seeded initial state", async () => {
        const fetchMock = stubFetch();
        // Edge case: SSR baseline was "light" but the LS/IDB had "dark"
        // (e.g. user toggled in another tab before this tab loaded). The
        // REHYDRATE should update the cookie too.
        const store = makeTestStore({ mode: "light" });
        installThemeCookieMirror(store);

        const rehydrate: RehydrateAction = {
            type: REHYDRATE_ACTION_TYPE,
            payload: {
                sliceName: "theme",
                state: { mode: "dark" },
            },
            meta: { fromRehydrate: true },
        };
        store.dispatch(rehydrate);
        await Promise.resolve();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][1]?.body).toBe(
            JSON.stringify({ theme: "dark" }),
        );
    });

    it("fires once per distinct change across multiple dispatches", async () => {
        const fetchMock = stubFetch();
        const store = makeTestStore({ mode: "dark" });
        installThemeCookieMirror(store);

        store.dispatch(setMode("light")); // fires
        store.dispatch(setMode("light")); // no-op
        store.dispatch(toggleMode()); // fires (back to dark)
        store.dispatch(setMode("dark")); // no-op

        await Promise.resolve();

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[0][1]?.body).toBe(
            JSON.stringify({ theme: "light" }),
        );
        expect(fetchMock.mock.calls[1][1]?.body).toBe(
            JSON.stringify({ theme: "dark" }),
        );
    });
});
