/**
 * A rehydrate carrying the same content as the slice holds changes NOTHING by reference.
 * The break this catches: the merge rebuilt every module as a fresh object, so the first click on the
 * chat composer's + menu (which triggers a stale-refresh rehydrate) re-rendered ~12 unrelated subscribers.
 */
import reducer, {
  initializeUserPreferencesState,
  type UserPreferences,
} from "@/lib/redux/preferences/userPreferencesSlice";
import { REHYDRATE_ACTION_TYPE } from "@/lib/sync/engine/rehydrate";

function rehydrate(state: ReturnType<typeof initializeUserPreferencesState>, payload: Partial<UserPreferences>) {
  return reducer(state, {
    type: REHYDRATE_ACTION_TYPE,
    payload: { sliceName: "userPreferences", state: payload },
    meta: { source: "idb" },
  } as never);
}

function saved(s: ReturnType<typeof initializeUserPreferencesState>): Partial<UserPreferences> {
  const { _meta, ...rest } = s;
  void _meta;
  return JSON.parse(JSON.stringify(rest));
}

it("identical content leaves every module referentially the same", () => {
  const first = rehydrate(initializeUserPreferencesState(), saved(initializeUserPreferencesState()));
  const second = rehydrate(first, saved(first));
  const keys = Object.keys(first).filter((k) => k !== "_meta") as (keyof UserPreferences)[];
  const moved = keys.filter((k) => second[k] !== first[k]);
  expect(moved).toEqual([]);
  expect(second._meta).toBe(first._meta);
  expect(second).toBe(first);
});

it("a changed field still lands, and only its module changes", () => {
  const first = rehydrate(initializeUserPreferencesState(), saved(initializeUserPreferencesState()));
  const payload = saved(first);
  payload.assists = { ...first.assists, quietUntil: "2030-01-01T00:00:00.000Z" } as UserPreferences["assists"];
  const second = rehydrate(first, payload);
  expect(second.assists.quietUntil).toBe("2030-01-01T00:00:00.000Z");
  expect(second.favorites).toBe(first.favorites);
  expect(second.assists).not.toBe(first.assists);
});
