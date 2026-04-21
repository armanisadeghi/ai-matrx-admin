/**
 * channel.test.ts — identity gating, schema filtering, subscription routing.
 *
 * Runs under jsdom once the Phase 1 jest config flip lands. Until then, we
 * stub BroadcastChannel on globalThis.
 */

import { openSyncChannel, CHANNEL_NAME } from "../channel";
import { buildActionMessage, buildHydrateRequest, SYNC_PROTOCOL_VERSION } from "../messages";
import type { IdentityKey } from "../types";

type Listener = (evt: MessageEvent) => void;

class FakeBroadcastChannel {
    static peers: FakeBroadcastChannel[] = [];
    public onmessage: Listener | null = null;
    public closed = false;
    constructor(public name: string) {
        FakeBroadcastChannel.peers.push(this);
    }
    postMessage(data: unknown) {
        for (const peer of FakeBroadcastChannel.peers) {
            if (peer === this || peer.closed) continue;
            peer.onmessage?.({ data } as MessageEvent);
        }
    }
    close() {
        this.closed = true;
        FakeBroadcastChannel.peers = FakeBroadcastChannel.peers.filter((p) => p !== this);
    }
}

function installFakeBC() {
    FakeBroadcastChannel.peers = [];
    (globalThis as unknown as { BroadcastChannel: typeof FakeBroadcastChannel }).BroadcastChannel =
        FakeBroadcastChannel;
}

function uninstallBC() {
    delete (globalThis as unknown as { BroadcastChannel?: unknown }).BroadcastChannel;
}

const identityA: IdentityKey = { type: "auth", userId: "a", key: "auth:a" };
const identityB: IdentityKey = { type: "auth", userId: "b", key: "auth:b" };

describe("openSyncChannel", () => {
    beforeEach(() => installFakeBC());
    afterEach(() => uninstallBC());

    it("reports available when BroadcastChannel exists", () => {
        const ch = openSyncChannel(identityA);
        expect(ch.available).toBe(true);
        ch.close();
    });

    it("reports unavailable when BroadcastChannel is missing", () => {
        uninstallBC();
        const ch = openSyncChannel(identityA);
        expect(ch.available).toBe(false);
        ch.close();
    });

    it("delivers identity-matched messages to subscribers", () => {
        const receiver = openSyncChannel(identityA);
        const sender = openSyncChannel(identityA);
        const received: unknown[] = [];
        receiver.subscribe((m) => received.push(m));

        sender.post(buildActionMessage(identityA.key, "theme", 1, { type: "theme/setMode" }));
        expect(received).toHaveLength(1);
        sender.close();
        receiver.close();
    });

    it("drops messages with mismatched identity", () => {
        const receiver = openSyncChannel(identityA);
        const sender = openSyncChannel(identityB);
        const received: unknown[] = [];
        receiver.subscribe((m) => received.push(m));

        sender.post(buildActionMessage(identityB.key, "theme", 1, { type: "theme/setMode" }));
        expect(received).toHaveLength(0);
        sender.close();
        receiver.close();
    });

    it("drops malformed messages without throwing", () => {
        const receiver = openSyncChannel(identityA);
        const received: unknown[] = [];
        receiver.subscribe((m) => received.push(m));

        // Simulate an unrelated/garbage payload via the raw BC.
        const peer = new FakeBroadcastChannel(CHANNEL_NAME);
        peer.postMessage({ not: "a real message" });
        expect(received).toHaveLength(0);
        peer.close();
        receiver.close();
    });

    it("supports multiple subscribers", () => {
        const receiver = openSyncChannel(identityA);
        const sender = openSyncChannel(identityA);
        let countA = 0;
        let countB = 0;
        receiver.subscribe(() => countA++);
        receiver.subscribe(() => countB++);
        sender.post(buildHydrateRequest(identityA.key, "n", [{ sliceName: "theme", version: 1 }]));
        expect(countA).toBe(1);
        expect(countB).toBe(1);
        sender.close();
        receiver.close();
    });

    it("setIdentity updates the inbound gate", () => {
        const receiver = openSyncChannel(identityA);
        const sender = openSyncChannel(identityB);
        const received: unknown[] = [];
        receiver.subscribe((m) => received.push(m));

        receiver.setIdentity(identityB);
        sender.post(buildActionMessage(identityB.key, "theme", 1, { type: "theme/setMode" }));
        expect(received).toHaveLength(1);
        sender.close();
        receiver.close();
    });

    // Silence unused import warning.
    it("uses the expected protocol version", () => {
        expect(SYNC_PROTOCOL_VERSION).toBe(1);
    });
});
