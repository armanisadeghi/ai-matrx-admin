/**
 * THE OFFICE LOOK IS ONE STORED SETTING (Arman 2026-10-12: "set in settings and we remember the
 * last version they used").
 *
 * - The home switch (`useOfficeLook` → setPreference display.officeLook) and the Settings row
 *   (`useSetting(OFFICE_LOOK_SETTING_PATH)`) read and write the SAME value.
 * - The value survives a load (the `display` module is persisted and rehydrated).
 * - Absent / stale values read as Google, the default.
 */
import reducer, {
  initializeUserPreferencesState,
  setPreference,
  type UserPreferences,
} from "@/lib/redux/preferences/userPreferencesSlice";
import { REHYDRATE_ACTION_TYPE } from "@/lib/sync/engine/rehydrate";
import { getSliceBinding, parseSettingsPath } from "@/features/settings/slice-bindings";
import { OFFICE_LOOK_SETTING_PATH, resolveOfficeLook } from "../office-look";

const settingsRead = (prefs: ReturnType<typeof initializeUserPreferencesState>) => {
  const { slice, key } = parseSettingsPath(OFFICE_LOOK_SETTING_PATH);
  return getSliceBinding(slice).read({ userPreferences: prefs } as never, key);
};

it("the home switch's write is what the Settings row reads", () => {
  const after = reducer(
    initializeUserPreferencesState(),
    setPreference({ module: "display", preference: "officeLook", value: "microsoft" }),
  );
  expect(resolveOfficeLook(after.display.officeLook)).toBe("microsoft");
  expect(settingsRead(after)).toBe("microsoft");
});

it("the Settings row's write is what the homes read", () => {
  const { slice, key } = parseSettingsPath(OFFICE_LOOK_SETTING_PATH);
  const action = getSliceBinding(slice).write(key, "microsoft");
  const after = reducer(initializeUserPreferencesState(), action as never);
  expect(resolveOfficeLook(after.display.officeLook)).toBe("microsoft");
});

it("the last look used comes back after a reload", () => {
  const base = initializeUserPreferencesState();
  const saved: Partial<UserPreferences> = { display: { ...base.display, officeLook: "microsoft" } };
  const after = reducer(base, {
    type: REHYDRATE_ACTION_TYPE,
    payload: { sliceName: "userPreferences", state: saved },
    meta: { source: "idb" },
  } as never);
  expect(after.display.officeLook).toBe("microsoft");
});

it("nothing stored, or anything unknown, is Google", () => {
  expect(resolveOfficeLook(initializeUserPreferencesState().display.officeLook)).toBe("google");
  expect(resolveOfficeLook("excel")).toBe("google");
  expect(resolveOfficeLook(null)).toBe("google");
  expect(resolveOfficeLook("microsoft")).toBe("microsoft");
});
