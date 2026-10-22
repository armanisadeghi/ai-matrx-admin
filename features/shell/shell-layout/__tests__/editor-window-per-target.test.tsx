// Audit round 2 #3 (2026-10-22): with the person's own editor open (or restored), "Edit sidebar…" on an
// organization's settings page surfaced that same window, and its Save wrote the PERSON's layout. The
// editor now opens one window per layout edited: opening the organization's never reuses the person's.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { act } from "react";
import { createRoot } from "react-dom/client";
import { overlaysReducer } from "@ai-matrx/summon";

const actions: { type: string; payload: { overlayId: string; instanceId: string; data: Record<string, unknown> } }[] = [];
jest.mock("@/lib/redux/hooks", () => ({ useAppDispatch: () => (a: never) => void actions.push(a) }));

import {
  shellLayoutEditorInstanceId,
  useOpenShellLayoutEditor,
  type OpenShellLayoutEditorOptions,
} from "@/features/overlays/definitions/shellLayoutEditorWindow.overlay";

const ORG = "11111111-2222-4333-8444-555555555555";

function openAll(...calls: OpenShellLayoutEditorOptions[]) {
  let open!: ReturnType<typeof useOpenShellLayoutEditor>;
  function Grab() {
    open = useOpenShellLayoutEditor();
    return null;
  }
  const root = createRoot(document.createElement("div"));
  act(() => root.render(<Grab />));
  for (const c of calls) open(c);
  act(() => root.unmount());
}

it("the organization's editor is its own window; the person's stays the person's", () => {
  openAll({ region: "sidebar" }, { region: "sidebar", target: "organization", organizationId: ORG });
  const state = actions.reduce((s, a) => overlaysReducer(s, a as never), undefined as never as ReturnType<typeof overlaysReducer>);
  const bucket = state.overlays.shellLayoutEditorWindow ?? {};
  expect(Object.keys(bucket).sort()).toEqual([`organization-${ORG}`, "person"]);
  expect(bucket.person?.data).toMatchObject({ target: "person", organizationId: null });
  expect(bucket[`organization-${ORG}`]?.data).toMatchObject({ target: "organization", organizationId: ORG });
});

it("reopening the same layout's editor reuses its window", () => {
  expect(shellLayoutEditorInstanceId({ region: "dock" })).toBe(shellLayoutEditorInstanceId({ region: "look", target: "person" }));
  expect(shellLayoutEditorInstanceId({ target: "organization", organizationId: ORG })).toBe(`organization-${ORG}`);
});
