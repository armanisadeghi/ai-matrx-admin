/**
 * messages.test.ts — Zod schema + cheap discriminant must agree on verdicts.
 */

import {
    SYNC_PROTOCOL_VERSION,
    SyncMessageSchema,
    isProbablyValidSyncMessage,
    parseSyncMessage,
    buildActionMessage,
    buildHydrateRequest,
    buildHydrateResponse,
} from "../messages";

describe("messages", () => {
    const identityKey = "auth:user-1";

    const valid = [
        buildActionMessage(identityKey, "theme", 1, { type: "theme/setMode", payload: "dark" }),
        buildHydrateRequest(identityKey, "nonce-1", [{ sliceName: "theme", version: 1 }]),
        buildHydrateResponse(identityKey, "nonce-1", { theme: { mode: "dark" } }),
    ];

    const invalid: unknown[] = [
        null,
        undefined,
        42,
        "string",
        {},
        { type: "UNKNOWN", protocolVersion: SYNC_PROTOCOL_VERSION, identityKey },
        { type: "ACTION", protocolVersion: 999, identityKey, sliceName: "theme", version: 1, action: { type: "x" } },
        { type: "ACTION", protocolVersion: SYNC_PROTOCOL_VERSION, identityKey: "", sliceName: "theme", version: 1, action: { type: "x" } },
        { type: "ACTION", protocolVersion: SYNC_PROTOCOL_VERSION, identityKey, sliceName: "", version: 1, action: { type: "x" } },
        { type: "ACTION", protocolVersion: SYNC_PROTOCOL_VERSION, identityKey, sliceName: "theme", version: -1, action: { type: "x" } },
        { type: "ACTION", protocolVersion: SYNC_PROTOCOL_VERSION, identityKey, sliceName: "theme", version: 1, action: null },
        { type: "ACTION", protocolVersion: SYNC_PROTOCOL_VERSION, identityKey, sliceName: "theme", version: 1, action: { type: "" } },
        { type: "HYDRATE_REQUEST", protocolVersion: SYNC_PROTOCOL_VERSION, identityKey, nonce: "", slices: [{ sliceName: "theme", version: 1 }] },
        { type: "HYDRATE_REQUEST", protocolVersion: SYNC_PROTOCOL_VERSION, identityKey, nonce: "n", slices: [] },
        { type: "HYDRATE_RESPONSE", protocolVersion: SYNC_PROTOCOL_VERSION, identityKey, nonce: "n", slices: [] },
    ];

    it("Zod accepts every known-valid shape", () => {
        for (const v of valid) {
            expect(SyncMessageSchema.safeParse(v).success).toBe(true);
        }
    });

    it("cheap check accepts every known-valid shape", () => {
        for (const v of valid) {
            expect(isProbablyValidSyncMessage(v)).toBe(true);
        }
    });

    it("Zod rejects every known-invalid shape", () => {
        for (const v of invalid) {
            expect(SyncMessageSchema.safeParse(v).success).toBe(false);
        }
    });

    it("cheap check rejects every known-invalid shape", () => {
        for (const v of invalid) {
            expect(isProbablyValidSyncMessage(v)).toBe(false);
        }
    });

    it("parseSyncMessage returns ok for valid and not-ok for invalid", () => {
        for (const v of valid) {
            const r = parseSyncMessage(v);
            expect(r.ok).toBe(true);
        }
        for (const v of invalid) {
            const r = parseSyncMessage(v);
            expect(r.ok).toBe(false);
        }
    });
});
