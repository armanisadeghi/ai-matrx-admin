// Audit round 2 #2 (2026-10-22): the Shape widget's picker listed kinds before anything on the launchpad had
// loaded this app's rich-content host, which is where the kind database client is registered — so it said
// "No kind data client". The picker asks for the host first, then lists.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const order: string[] = [];
let landHost!: () => void;
jest.mock("@ai-matrx/rich-content/host", () => ({
  requestRichContentHost: () => {
    order.push("host requested");
    return new Promise<void>((r) => (landHost = () => (order.push("host landed"), r())));
  },
}));
jest.mock("@/features/content-ir/registry/kind-catalog", () => ({
  listAllKinds: jest.fn(async () => {
    order.push("kinds listed");
    return [];
  }),
}));
jest.mock("@/features/content-ir/studio/instance-service", () => ({ listKindInstances: jest.fn(async () => []) }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));

import { act } from "react";
import { createRoot } from "react-dom/client";
import { KindInstancePicker } from "../KindInstancePicker";

it("lists kinds only after the host that registers the kind client has landed", async () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  await act(async () => root.render(<KindInstancePicker kindDefinitionId="" value="" onChange={() => {}} />));
  expect(order).toEqual(["host requested"]);
  await act(async () => landHost());
  expect(order).toEqual(["host requested", "host landed", "kinds listed"]);
  act(() => root.unmount());
});
