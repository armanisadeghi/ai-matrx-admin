/**
 * Walk 2026-10-15/16: a deck showed fewer slides after a reload. Reproduced live: three slides added
 * ~1 s apart, reload 50 ms after the last → 7 on screen, 6 stored. Two causes, both forced here:
 *  1. whole-deck saves ran concurrently, so an older write could land last;
 *  2. leaving the page fired a save nobody waited for, and nothing asked before unloading.
 */
import { createDeckSaver, listenToDeckPage } from "../deck-autosave";

function deferred() {
  let resolve!: (ok: boolean) => void;
  const promise = new Promise<boolean>((r) => (resolve = r));
  return { promise, resolve };
}

describe("the deck save path", () => {
  it("never runs two whole-deck writes at once, and the newest deck is written last", async () => {
    let state = { revision: 1, deck: ["s1", "s2"] };
    const writes: { deck: string[]; done: ReturnType<typeof deferred> }[] = [];
    const saver = createDeckSaver({
      current: () => state,
      write: (deck) => {
        const done = deferred();
        writes.push({ deck, done });
        return done.promise;
      },
    });
    const first = saver.save();
    state = { revision: 2, deck: ["s1", "s2", "s3"] };
    const second = saver.save();
    await Promise.resolve();
    expect(writes).toHaveLength(1); // the second waits for the first
    writes[0]!.done.resolve(true);
    await first;
    await new Promise((r) => setTimeout(r, 0));
    expect(writes).toHaveLength(2);
    expect(writes[1]!.deck).toEqual(["s1", "s2", "s3"]);
    writes[1]!.done.resolve(true);
    await second;
    expect(saver.hasUnsaved()).toBe(false);
  });

  it("a save still in flight counts as unsaved, so leaving asks and flushes", async () => {
    const state = { revision: 3, deck: ["a"] };
    const done = deferred();
    const writes: string[][] = [];
    const saver = createDeckSaver({ current: () => state, write: (d) => (writes.push(d), done.promise) });
    const stop = listenToDeckPage(saver);
    const leave = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(leave);
    expect(leave.defaultPrevented).toBe(true);
    expect(writes).toHaveLength(1);
    done.resolve(true);
    await new Promise((r) => setTimeout(r, 0));
    const again = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(again);
    expect(again.defaultPrevented).toBe(false);
    stop();
  });

  it("a failed write stays unsaved", async () => {
    const saver = createDeckSaver({ current: () => ({ revision: 1, deck: [] }), write: async () => false });
    await saver.save();
    expect(saver.hasUnsaved()).toBe(true);
  });
});
