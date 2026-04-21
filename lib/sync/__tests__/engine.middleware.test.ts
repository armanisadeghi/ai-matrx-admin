/**
 * engine.middleware.test.ts — broadcast + sync write-through behavior.
 */

import { configureStore, createSlice } from "@reduxjs/toolkit";
import { definePolicy } from "../policies/define";
import { createSyncMiddleware } from "../engine/middleware";
import type { SyncChannel } from "../channel";
import type { IdentityKey } from "../types";
import type { SyncMessage } from "../messages";

function makeFakeChannel(): SyncChannel & { sent: SyncMessage[] } {
    const sent: SyncMessage[] = [];
    return {
        available: true,
        sent,
        post: (m) => {
            sent.push(m);
        },
        subscribe: () => () => {},
        setIdentity: () => {},
        close: () => {},
    } as SyncChannel & { sent: SyncMessage[] };
}

const identity: IdentityKey = { type: "auth", userId: "u", key: "auth:u" };

describe("createSyncMiddleware", () => {
    beforeEach(() => window.localStorage.clear());
    afterAll(() => window.localStorage.clear());

    it("broadcasts actions in the allow-list", () => {
        const policy = definePolicy({
            sliceName: "ui",
            preset: "ui-broadcast",
            version: 1,
            broadcast: { actions: ["ui/ping"] },
        });
        const channel = makeFakeChannel();
        const slice = createSlice({
            name: "ui",
            initialState: { v: 0 },
            reducers: { ping: (s) => void (s.v += 1), other: (s) => void (s.v += 1) },
        });
        const store = configureStore({
            reducer: { ui: slice.reducer },
            middleware: (gDM) =>
                gDM().concat(createSyncMiddleware({ policies: [policy], channel, getIdentity: () => identity })),
        });

        store.dispatch({ type: "ui/ping" });
        expect(channel.sent).toHaveLength(1);
        expect(channel.sent[0].type).toBe("ACTION");

        // Not in allow-list — no broadcast.
        store.dispatch({ type: "ui/other" });
        expect(channel.sent).toHaveLength(1);
    });

    it("does not re-broadcast actions with meta.fromBroadcast=true", () => {
        const policy = definePolicy({
            sliceName: "ui",
            preset: "ui-broadcast",
            version: 1,
            broadcast: { actions: ["ui/ping"] },
        });
        const channel = makeFakeChannel();
        const slice = createSlice({
            name: "ui",
            initialState: { v: 0 },
            reducers: { ping: (s) => void (s.v += 1) },
        });
        const store = configureStore({
            reducer: { ui: slice.reducer },
            middleware: (gDM) =>
                gDM().concat(createSyncMiddleware({ policies: [policy], channel, getIdentity: () => identity })),
        });

        store.dispatch({ type: "ui/ping", meta: { fromBroadcast: true } });
        expect(channel.sent).toHaveLength(0);
    });

    it("writes through synchronously for boot-critical slices", () => {
        const policy = definePolicy<{ mode: "light" | "dark" }>({
            sliceName: "theme",
            preset: "boot-critical",
            version: 1,
            broadcast: { actions: ["theme/setMode"] },
            partialize: ["mode"],
        });
        const channel = makeFakeChannel();
        const slice = createSlice({
            name: "theme",
            initialState: { mode: "light" as "light" | "dark" },
            reducers: {
                setMode: (s, a: { type: string; payload: "light" | "dark" }) => {
                    s.mode = a.payload;
                },
            },
        });
        const store = configureStore({
            reducer: { theme: slice.reducer },
            middleware: (gDM) =>
                gDM().concat(createSyncMiddleware({ policies: [policy], channel, getIdentity: () => identity })),
        });

        store.dispatch({ type: "theme/setMode", payload: "dark" });
        const raw = window.localStorage.getItem("matrx:theme");
        expect(raw).not.toBeNull();
        const parsed = JSON.parse(raw!);
        expect(parsed.version).toBe(1);
        expect(parsed.identityKey).toBe("auth:u");
        expect(parsed.body).toEqual({ mode: "dark" });
    });
});
