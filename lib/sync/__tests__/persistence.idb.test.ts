/**
 * persistence.idb.test.ts — Dexie wrapper contract (warm-cache tier).
 *
 * Runs under jsdom + `fake-indexeddb/auto` so every test gets a fresh,
 * in-memory IndexedDB. `__resetIdbForTests()` clears the Dexie singleton
 * between suites so we don't leak a closed DB handle.
 */

import "fake-indexeddb/auto";
import {
    clearAll,
    clearIdentity,
    readSlice,
    writeSlice,
} from "../persistence/idb";

describe("persistence/idb", () => {
    // Reuse the module-level Dexie handle across the suite (cheaper than
    // recreating), and just wipe the store contents between tests so data
    // never bleeds. `deleteDatabase` races with fake-indexeddb's async
    // teardown and is not needed here.
    beforeEach(async () => {
        await clearAll();
    });

    it("writeSlice + readSlice round-trip", async () => {
        await writeSlice("auth:u1", "userPrefs", 1, { theme: "dark" });
        const record = await readSlice("auth:u1", "userPrefs", 1);
        expect(record).not.toBeNull();
        expect(record!.body).toEqual({ theme: "dark" });
        expect(record!.identityKey).toBe("auth:u1");
        expect(record!.sliceName).toBe("userPrefs");
        expect(record!.version).toBe(1);
        expect(typeof record!.persistedAt).toBe("number");
    });

    it("readSlice returns null for a miss", async () => {
        const record = await readSlice("auth:u1", "userPrefs", 1);
        expect(record).toBeNull();
    });

    it("readSlice treats version mismatch as miss", async () => {
        await writeSlice("auth:u1", "userPrefs", 1, { theme: "dark" });
        const record = await readSlice("auth:u1", "userPrefs", 2);
        expect(record).toBeNull();
    });

    it("readSlice scopes by identityKey (no cross-identity leak)", async () => {
        await writeSlice("auth:u1", "userPrefs", 1, { theme: "dark" });
        const theirs = await readSlice("auth:u2", "userPrefs", 1);
        expect(theirs).toBeNull();
    });

    it("writeSlice overwrites the same identity:slice:version record", async () => {
        await writeSlice("auth:u1", "userPrefs", 1, { theme: "dark" });
        await writeSlice("auth:u1", "userPrefs", 1, { theme: "light" });
        const record = await readSlice("auth:u1", "userPrefs", 1);
        expect(record!.body).toEqual({ theme: "light" });
    });

    it("clearIdentity deletes only that identity's records", async () => {
        await writeSlice("auth:u1", "userPrefs", 1, { v: "one" });
        await writeSlice("auth:u1", "notesList", 1, { n: 1 });
        await writeSlice("auth:u2", "userPrefs", 1, { v: "two" });

        const removed = await clearIdentity("auth:u1");
        expect(removed).toBe(2);

        expect(await readSlice("auth:u1", "userPrefs", 1)).toBeNull();
        expect(await readSlice("auth:u1", "notesList", 1)).toBeNull();
        const kept = await readSlice("auth:u2", "userPrefs", 1);
        expect(kept).not.toBeNull();
        expect(kept!.body).toEqual({ v: "two" });
    });

    it("clearAll empties the store", async () => {
        await writeSlice("auth:u1", "userPrefs", 1, {});
        await writeSlice("auth:u2", "userPrefs", 1, {});
        await clearAll();
        expect(await readSlice("auth:u1", "userPrefs", 1)).toBeNull();
        expect(await readSlice("auth:u2", "userPrefs", 1)).toBeNull();
    });

    it("gracefully handles opaque bodies (array / primitive)", async () => {
        await writeSlice("auth:u1", "a", 1, [1, 2, 3]);
        await writeSlice("auth:u1", "b", 1, 42);
        expect((await readSlice("auth:u1", "a", 1))!.body).toEqual([1, 2, 3]);
        expect((await readSlice("auth:u1", "b", 1))!.body).toBe(42);
    });
});
