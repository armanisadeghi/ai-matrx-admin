/** @jest-environment jsdom */
//
// L11h (2026-10-18) — every place a person STARTS a workflow run sends their
// current scope selection as `scope_ids`, the same selection the chat sends
// (appContext scope selection), so scope-bound items resolve the chosen scopes.
// Covers the three starters: run, step-by-step run, and the served run form.
// Fails against the HEAD code, which sent no scope_ids.

import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";

const SCOPE_A = "11111111-1111-4111-8111-111111111111";
const SCOPE_B = "22222222-2222-4222-8222-222222222222";

const state = {
  appContext: { scope_selections: {} as Record<string, string | null> },
};
const sent: Array<Record<string, any>> = [];

jest.mock("@/lib/api/call-api", () => ({
  callApi: (config: Record<string, unknown>) => config,
}));
jest.mock("@/lib/redux/hooks", () => {
  const dispatch = (arg: unknown): unknown => {
    if (typeof arg === "function") return (arg as any)(dispatch, () => state);
    sent.push(arg as Record<string, any>);
    return Promise.resolve({ error: null });
  };
  return {
    useAppDispatch: () => dispatch,
    useAppSelector: () => "org-1",
  };
});
jest.mock("@/lib/redux/slices/appContextSlice", () => ({
  selectScopeSelectionsContext: (s: typeof state) => s.appContext.scope_selections,
  selectOrganizationId: () => "org-1",
}));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn() } }));
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));

import { useWorkflowRunControls, type WorkflowRunControls } from "../hooks/useWorkflowRunControls";
import { useServedRunStart, type ServedRunStart } from "../served-form/useServedRunForm";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount<T>(use: () => T): T {
  let value: T | null = null;
  function Harness() {
    value = use();
    return null;
  }
  act(() => createRoot(document.createElement("div")).render(<Harness />));
  return value as T;
}

beforeEach(() => {
  sent.length = 0;
  state.appContext.scope_selections = {};
});

describe("a run start carries the current scope selection", () => {
  const chosen = () => {
    state.appContext.scope_selections = { [SCOPE_A]: SCOPE_A, [SCOPE_B]: SCOPE_B, gone: null };
  };

  test("startRun sends scope_ids", async () => {
    chosen();
    const c = mount<WorkflowRunControls>(useWorkflowRunControls);
    await act(async () => {
      await c.startRun({ definitionId: "wf" });
    });
    expect(sent[0]!.path).toBe("/workflows/{definition_id}/runs");
    expect(sent[0]!.body.scope_ids).toEqual([SCOPE_A, SCOPE_B]);
  });

  test("startStepRun sends scope_ids", async () => {
    chosen();
    const c = mount<WorkflowRunControls>(useWorkflowRunControls);
    await act(async () => {
      await c.startStepRun({ definitionId: "wf" });
    });
    expect(sent[0]!.path).toBe("/workflows/{definition_id}/step-runs");
    expect(sent[0]!.body.scope_ids).toEqual([SCOPE_A, SCOPE_B]);
  });

  test("the served run form sends scope_ids", async () => {
    chosen();
    const s = mount<ServedRunStart>(useServedRunStart);
    await act(async () => {
      await s.start("wf", { inputs: {}, inputSources: {} } as any);
    });
    expect(sent[0]!.body.scope_ids).toEqual([SCOPE_A, SCOPE_B]);
  });

  test("with nothing chosen no scope_ids key rides", async () => {
    const c = mount<WorkflowRunControls>(useWorkflowRunControls);
    await act(async () => {
      await c.startRun({ definitionId: "wf" });
    });
    expect("scope_ids" in sent[0]!.body).toBe(false);
  });
});
