/**
 * The review walk's address: the `review_walk` link round-trips every unit kind, a bad token opens
 * nothing, and the definition declares a multi, addressed, preserved window. Ported onto the
 * package link door + the definition's link.hydrate (the url-sync internals are gone).
 */
import { configureStore, type Middleware, type UnknownAction } from "@reduxjs/toolkit";

import { selectOpenInstances } from "@ai-matrx/summon/open";
import { overlaysReducer } from "@ai-matrx/summon";
import { appOverlayDefinition } from "@/features/overlays/definitions/register";
import { linkHydrator, parsePanels, registerAppLinks } from "@/features/overlays/definitions/__tests__/linkKit";
import type { AppDispatch } from "@/lib/redux/store";

import { REVIEW_WALK_URL_KEY, WALK_UNIT_KINDS, parseReviewWalkUrlId, reviewWalkInstanceId, reviewWalkUrlId } from "../address";
import { openReviewWalk } from "../openReviewWalk";

const UNIT_ID = "3f9a1c2e-7b4d-4e8a-9c1f-0a2b3c4d5e6f";

function makeStore() {
  const seen: UnknownAction[] = [];
  const record: Middleware = () => (next) => (action) => {
    seen.push(action as UnknownAction);
    return next(action);
  };
  const store = configureStore({
    reducer: { overlays: overlaysReducer },
    middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }).concat(record),
  });
  return { store, seen };
}

describe("review walk address", () => {
  beforeAll(() => registerAppLinks());

  it("round-trips every unit kind through the ?panels= token grammar", () => {
    for (const unitKind of WALK_UNIT_KINDS) {
      const token = `${REVIEW_WALK_URL_KEY}:${reviewWalkUrlId({ unitKind, unitId: UNIT_ID })}`;
      const [parsed] = parsePanels(token);
      expect(parsed!.typeKey).toBe("review_walk");
      expect(parseReviewWalkUrlId(parsed!.instanceId)).toEqual({ unitKind, unitId: UNIT_ID });
    }
    expect(WALK_UNIT_KINDS).toEqual(expect.arrayContaining(["assistant_message", "agent_request", "wf_node_outcome"]));
  });

  it("refuses half an identity", () => {
    for (const bad of ["", "default", "reviewWalkWindow", "assistant_message.", `.${UNIT_ID}`, `bogus.${UNIT_ID}`]) {
      expect(parseReviewWalkUrlId(bad)).toBeNull();
    }
  });

  it("declares a definition: multi, addressed, preserved on its identity", () => {
    const def = appOverlayDefinition("reviewWalkWindow");
    expect(def?.instance).toBe("multi");
    expect(def?.link?.key).toBe(REVIEW_WALK_URL_KEY);
    expect(def?.window?.mobile).toBe("fullscreen");
    expect(def?.window?.ephemeral).toBeFalsy();
    const preservation = def?.window?.preservation || undefined; // `false` = opted out (summon 0.1.22+)
    expect(preservation?.requiredDataKeys).toEqual(["unitKind", "unitId"]);
    expect(preservation?.dataKeys).toEqual(expect.arrayContaining(["unitKind", "unitId", "agentId", "agentName"]));
  });

  it("opens the walk from a link under the opener's deterministic instance id", async () => {
    const { store } = makeStore();
    const hydrator = linkHydrator(REVIEW_WALK_URL_KEY);
    expect(hydrator).toBeDefined();
    await hydrator!(store.dispatch, `wf_node_outcome.${UNIT_ID}`, {});
    const open = selectOpenInstances(store.getState(), "reviewWalkWindow");
    expect(open).toEqual([
      {
        instanceId: reviewWalkInstanceId({ unitKind: "wf_node_outcome", unitId: UNIT_ID }),
        data: expect.objectContaining({ unitKind: "wf_node_outcome", unitId: UNIT_ID }),
      },
    ]);
  });

  it("a link for a bad token opens nothing and says why", async () => {
    const { store } = makeStore();
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      await linkHydrator(REVIEW_WALK_URL_KEY)!(store.dispatch, "reviewWalkWindow", {});
      expect(selectOpenInstances(store.getState(), "reviewWalkWindow")).toEqual([]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("names no walkable unit"));
    } finally {
      warn.mockRestore();
    }
  });

  it("opening the same unit twice focuses the existing window and keeps its data", async () => {
    const { store, seen } = makeStore();
    const ref = { unitKind: "assistant_message" as const, unitId: UNIT_ID };
    (store.dispatch as AppDispatch)(openReviewWalk({ ...ref, agentId: "agent-1", agentName: "Ada" }));
    await linkHydrator(REVIEW_WALK_URL_KEY)!(store.dispatch, reviewWalkUrlId(ref), {});
    const open = selectOpenInstances(store.getState(), "reviewWalkWindow");
    expect(open).toHaveLength(1);
    expect(open[0]!.data).toMatchObject({ agentId: "agent-1", agentName: "Ada" });
    const id = reviewWalkInstanceId(ref);
    expect(seen.map((a) => a.type)).toEqual(expect.arrayContaining(["windowManager/restoreWindow", "windowManager/focusWindow"]));
    expect(seen.filter((a) => a.type === "windowManager/focusWindow").map((a) => (a as { payload?: unknown }).payload)).toEqual([id]);
  });
});
