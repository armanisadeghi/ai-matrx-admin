/**
 * Preferences update only on change (Arman, 2026-10-17): no 60 s re-read timer. A change anywhere arrives
 * live (PreferencesLiveSync); a tab left away re-reads once on return. Echoes of our own saves are dropped.
 */
import "fake-indexeddb/auto";
import { configureStore, createSlice } from "@reduxjs/toolkit";
import { createStaleRefreshScheduler } from "@/lib/sync/engine/remoteFetch";
import { userPreferencesPolicy } from "../userPreferencesSlice";
import {
  noteOwnPreferencesWrite,
  preferencesRowIsNews,
  resetPreferencesVersions,
  PREFERENCES_REVALIDATE_AFTER_ABSENCE_MS,
} from "../preferencesLive";
import { definePolicy } from "@/lib/sync/policies/define";
import type { IdentityKey } from "@/lib/sync/types";

const identity: IdentityKey = { type: "auth", userId: "u1", key: "auth:u1" };

describe("the userPreferences policy", () => {
  it("has no polling timer and revalidates only after a long absence", () => {
    expect(userPreferencesPolicy.config.staleAfter).toBeUndefined();
    expect(userPreferencesPolicy.config.remote?.revalidateOnFocus).toBe(true);
    expect(userPreferencesPolicy.config.remote?.revalidateOnFocusAfterMs).toBe(PREFERENCES_REVALIDATE_AFTER_ABSENCE_MS);
  });
});

describe("the refresh scheduler with the real preferences policy shape", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  function setup(afterMs: number | undefined) {
    const calls: string[] = [];
    const policy = definePolicy<{ value: string }>({
      sliceName: "live",
      preset: "warm-cache",
      version: 1,
      broadcast: { actions: ["live/x"] },
      remote: {
        revalidateOnFocus: true,
        ...(afterMs === undefined ? {} : { revalidateOnFocusAfterMs: afterMs }),
        fetch: async () => {
          calls.push("fetch");
          return null;
        },
      },
    });
    const slice = createSlice({ name: "live", initialState: { value: "" }, reducers: {} });
    const store = configureStore({ reducer: { live: slice.reducer } });
    let clock = 0;
    let focus: () => void = () => {};
    const reg = createStaleRefreshScheduler([policy], store, () => identity, {
      now: () => clock,
      attachFocus: (cb) => {
        focus = cb;
        return () => {};
      },
    });
    return { calls, reg, focus: () => focus(), advance: (ms: number) => (clock += ms) };
  }

  it("never re-reads on a timer, however long the tab idles", async () => {
    const s = setup(30 * 60_000);
    jest.advanceTimersByTime(3 * 60 * 60_000);
    await Promise.resolve();
    expect(s.calls).toHaveLength(0);
    s.reg.cancelAll();
  });

  it("a short absence does not re-read; a long one re-reads once", async () => {
    const s = setup(30 * 60_000);
    s.advance(5 * 60_000);
    s.focus();
    await Promise.resolve();
    await Promise.resolve();
    expect(s.calls).toHaveLength(0);
    s.advance(31 * 60_000);
    s.focus();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(s.calls).toHaveLength(1);
    s.reg.cancelAll();
  });
});

describe("realtime rows for preferences", () => {
  beforeEach(() => resetPreferencesVersions());

  it("a collaborator's change is news; its repeat is not", () => {
    expect(preferencesRowIsNews({ version: 4 })).toBe(true);
    expect(preferencesRowIsNews({ version: 4 })).toBe(false);
  });
  it("the echo of this tab's own save is dropped", () => {
    noteOwnPreferencesWrite(7);
    expect(preferencesRowIsNews({ version: 7 })).toBe(false);
  });
  it("a collaborator's older version arriving after our save is still news", () => {
    noteOwnPreferencesWrite(7);
    expect(preferencesRowIsNews({ version: 6 })).toBe(true);
  });
  it("a row with no readable version is news (never silently dropped)", () => {
    expect(preferencesRowIsNews({})).toBe(true);
    expect(preferencesRowIsNews(undefined)).toBe(true);
  });
});
