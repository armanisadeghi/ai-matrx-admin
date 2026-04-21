/**
 * lib/sync/channel.ts
 *
 * Thin wrapper around the native `BroadcastChannel("matrx-sync")`. Responsible
 * for: open/close lifecycle, identity-gated inbound filtering, schema-validated
 * inbound routing, and typed outbound emission.
 *
 * Replaces: per-feature `new BroadcastChannel(...)` usage. Delete trigger: when
 * `grep -r "new BroadcastChannel" features/ lib/ --exclude-dir=sync` returns 0.
 */

import { logger } from "./logger";
import { parseSyncMessage, type SyncMessage } from "./messages";
import type { IdentityKey } from "./types";

export const CHANNEL_NAME = "matrx-sync";

export type ChannelHandler = (message: SyncMessage) => void;

export interface SyncChannel {
    /** Emit a message. No-op if the channel is closed or unavailable. */
    post(message: SyncMessage): void;
    /** Register a handler for identity-matched, schema-valid messages. */
    subscribe(handler: ChannelHandler): () => void;
    /** Update the local identity used for gating inbound messages. */
    setIdentity(identity: IdentityKey): void;
    /** Close the underlying channel. */
    close(): void;
    /** Whether the native BroadcastChannel API is available in this environment. */
    readonly available: boolean;
}

function hasBroadcastChannel(): boolean {
    return typeof globalThis !== "undefined" && typeof (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel === "function";
}

export function openSyncChannel(initialIdentity: IdentityKey): SyncChannel {
    const available = hasBroadcastChannel();
    const handlers = new Set<ChannelHandler>();
    let identity = initialIdentity;
    let bc: BroadcastChannel | null = null;

    if (available) {
        try {
            bc = new BroadcastChannel(CHANNEL_NAME);
            bc.onmessage = (evt: MessageEvent) => {
                const result = parseSyncMessage(evt.data);
                if (result.ok !== true) {
                    logger.warn("broadcast.invalid", { meta: { reason: result.reason } });
                    return;
                }
                const msg = result.message;
                if (msg.identityKey !== identity.key) {
                    logger.debug("broadcast.identity-mismatch", {
                        meta: { got: msg.identityKey, want: identity.key },
                    });
                    return;
                }
                for (const h of handlers) {
                    try {
                        h(msg);
                    } catch (err) {
                        logger.error("broadcast.handler-threw", {
                            meta: { error: err instanceof Error ? err.message : String(err) },
                        });
                    }
                }
            };
        } catch (err) {
            logger.error("broadcast.open-failed", {
                meta: { error: err instanceof Error ? err.message : String(err) },
            });
            bc = null;
        }
    }

    return {
        available: bc !== null,
        post(message) {
            if (!bc) return;
            try {
                bc.postMessage(message);
                logger.debug("broadcast.emit", { meta: { type: message.type } });
            } catch (err) {
                logger.error("broadcast.post-failed", {
                    meta: { error: err instanceof Error ? err.message : String(err) },
                });
            }
        },
        subscribe(handler) {
            handlers.add(handler);
            return () => {
                handlers.delete(handler);
            };
        },
        setIdentity(next) {
            identity = next;
        },
        close() {
            handlers.clear();
            if (bc) {
                try {
                    bc.close();
                } catch {
                    /* noop */
                }
                bc = null;
            }
        },
    };
}
