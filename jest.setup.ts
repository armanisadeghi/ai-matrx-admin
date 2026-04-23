/**
 * jest.setup.ts — polyfills applied before every test in the jsdom env.
 *
 * Why structuredClone? Dexie (warm-cache persistence tier) uses
 * `structuredClone` to clone values before storing them in IndexedDB. Modern
 * Node (17+) has it as a global, and real browsers have it, but the jsdom
 * test environment scrubs it off the test-local `globalThis`. Polyfilling
 * back to the Node global here so the Dexie wrapper runs unmodified.
 */

if (typeof (globalThis as { structuredClone?: unknown }).structuredClone !== "function") {
    // Node ≥17 ships a global `structuredClone`, but jsdom strips it from the
    // test-local `globalThis`. `v8.deserialize(v8.serialize(v))` gives us the
    // same semantics (HTML-structured-clone algorithm) without depending on
    // whatever node version is running — and is what Node's own polyfill does.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const v8 = require("node:v8") as { deserialize: (buf: Buffer) => unknown; serialize: (v: unknown) => Buffer };
    (globalThis as { structuredClone?: <T>(v: T) => T }).structuredClone = <T>(v: T): T =>
        v8.deserialize(v8.serialize(v)) as T;
}
