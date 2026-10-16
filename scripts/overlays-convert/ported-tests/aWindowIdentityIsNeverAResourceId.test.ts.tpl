/**
 * A window identity is never a resource id: reloading `quick_data:quickDataWindow` opens the window
 * with no table, and no definition's link forwards its own overlay id into its data. Ported onto
 * the package link door + the definitions' link.hydrate.
 */
import { APP_OVERLAYS } from "@/features/overlays/definitions/registry";
import { getRestorableUuid } from "@/features/overlays/definitions/link-helpers";
import { linkHydrator, registerAppLinks } from "@/features/overlays/definitions/__tests__/linkKit";

jest.mock("@ai-matrx/chat/agents/redux/execution-system/thunks/load-conversation.thunk", () => ({
  loadConversation: jest.fn((args: unknown) => ({ type: "test/loadConversation", payload: args })),
}));
jest.mock("@ai-matrx/chat/agents/runtime-reconnect/follow-what-is-still-in-flight", () => ({ followWhatIsStillInFlight: jest.fn() }));

function valuesOf(value: unknown, out: unknown[] = []): unknown[] {
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) valuesOf(v, out);
  } else out.push(value);
  return out;
}

const openedData = (dispatch: jest.Mock): unknown =>
  (dispatch.mock.calls.find(([a]) => (a as { type?: string })?.type === "overlays/openOverlay")?.[0] as { payload: { data: unknown } } | undefined)?.payload.data;

describe("a window identity is never a resource id", () => {
  beforeAll(() => registerAppLinks());

  it("reloading `quick_data:quickDataWindow` opens the window with no table selected", async () => {
    const dispatch = jest.fn();
    await linkHydrator("quick_data")!(dispatch, "quickDataWindow", {});
    expect(dispatch.mock.calls.some(([a]) => (a as { type?: string })?.type === "overlays/openOverlay")).toBe(true);
    expect(openedData(dispatch)).toBeNull();
  });

  it("a real table id still deep-links", async () => {
    const id = "522c3ff1-7229-439c-be00-5b20492cc328";
    const dispatch = jest.fn();
    await linkHydrator("quick_data")!(dispatch, id, {});
    expect(openedData(dispatch)).toEqual({ selectedTable: id });
  });

  it("no window forwards its own overlay id into its data", async () => {
    const offenders: string[] = [];
    for (const def of APP_OVERLAYS) {
      const key = def.link?.key;
      const hydrator = key ? linkHydrator(key) : undefined;
      if (!key || !hydrator) continue;
      const dispatch = jest.fn();
      await hydrator(dispatch, def.id, {});
      for (const [action] of dispatch.mock.calls) {
        const data = (action as { payload?: { data?: unknown } })?.payload?.data;
        if (valuesOf(data).includes(def.id)) offenders.push(`${key} -> ${def.id}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("a non-uuid never reaches a uuid door", () => {
    expect(getRestorableUuid("quickDataWindow", "quickDataWindow")).toBeNull();
    expect(getRestorableUuid("not-a-uuid")).toBeNull();
  });
});
