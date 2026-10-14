/**
 * Every write target and page tool the Agent Builder declares has a handler,
 * and every handler is declared — a declared target with no handler is a door
 * the helper is told exists and that fails when used; an undeclared handler is
 * a capability nobody can reach.
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { createChatStore } from "@ai-matrx/chat/store/create-chat-store";
import { agentBuilderManifest } from "@ai-matrx/chat/surfaces/manifests/agent-builder.manifest";
import { getRegisteredSurfaceClientTools } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";

jest.mock("@/components/cost/pointsRate", () => ({ currentPointsRate: () => 20_000 }));
jest.mock("@/features/scopes/service/associationsService", () => ({ associationsService: {} }));
jest.mock("@/features/agents/run-review/responseFeedbackService", () => ({ fetchLatestFeedback: jest.fn() }));
jest.mock("@/features/agents/samples/service", () => ({}));
jest.mock("@/features/agents/samples/apply-sample", () => ({}));
jest.mock("@/features/agents/components/model-view/requestModelView", () => ({}));

import { useAgentBuilderWriteHandlers } from "../useAgentBuilderWriteHandlers";
import { AgentBuilderClientTools } from "../useAgentBuilderClientTools";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const AGENT = "6f0c1b8e-3c55-4b5e-9a0e-2d8f1f9a7c11";

it("declared write targets and handlers are the same set", () => {
  let keys: string[] = [];
  function Probe() {
    keys = Object.keys(useAgentBuilderWriteHandlers(AGENT)());
    return null;
  }
  const root = createRoot(document.createElement("div"));
  act(() => root.render(<Provider store={createChatStore()}><Probe /></Provider>));
  const declared = (agentBuilderManifest.writeTargets ?? []).map((t) => t.name);
  expect(keys.sort()).toEqual([...declared].sort());
  act(() => root.unmount());
});

it("declared page tools and registered tool handlers are the same set", () => {
  const root = createRoot(document.createElement("div"));
  act(() =>
    root.render(
      <Provider store={createChatStore()}>
        <AgentBuilderClientTools agentId={AGENT} />
      </Provider>,
    ),
  );
  const registered = Object.keys(getRegisteredSurfaceClientTools(agentBuilderManifest.surfaceName));
  const declared = (agentBuilderManifest.clientTools ?? []).map((t) => t.name);
  expect(registered.sort()).toEqual([...declared].sort());
  act(() => root.unmount());
});
