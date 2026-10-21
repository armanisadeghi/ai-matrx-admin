/**
 * ONE MEANING PER STATE (settings-translation F-b). The server treats a saved
 * reasoning_effort "auto" exactly like an absent key (aidream
 * catalog/canonicalize.py), so choosing "auto" in the builder must REMOVE the
 * key — never save a word equal to unset. Ticking the box to set the setting
 * never stores "auto".
 *
 * The builder's write path is its settings target (../agent-settings-target.ts),
 * the one object THE model-settings panel writes through — driven here over a
 * real agent-definition store, reading the DB update payload the save path builds.
 */

import { agentDefinitionWithBuilderReducer } from "@/features/agents/redux/agent-builder.slice";
import { configureStore } from "@reduxjs/toolkit";
import type { ControlDefinition } from "@ai-matrx/agents/settings";
import { mergePartialAgent } from "@ai-matrx/chat/agents/redux/agent-definition/slice";
import { agentDefinitionToUpdate } from "@ai-matrx/chat/agents/redux/agent-definition/converters";
import { readControlBindablePolicy } from "@ai-matrx/chat/agents/utils/control-variables";
import { agentSettingsTarget } from "../agent-settings-target";

const AGENT_ID = "c1e5a9f3-7b2d-4d8e-9a61-3f4b2c8d7e05";
const EFFORT: ControlDefinition = {
  type: "enum",
  enum: ["auto", "none", "low", "medium", "high", "xhigh"],
  default: "auto",
};

function makeStore(settings: Record<string, unknown>) {
  const store = configureStore({
    reducer: { agentDefinition: agentDefinitionWithBuilderReducer },
    middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
  });
  store.dispatch(
    mergePartialAgent({
      id: AGENT_ID,
      name: "Contract Clause Reviewer",
      modelId: "6f1d2b0e-5d0a-4a57-9c34-0b8a3d6e1f21",
      settings,
      variableDefinitions: [],
      tools: [],
    } as Parameters<typeof mergePartialAgent>[0]),
  );
  return store;
}

type TestStore = ReturnType<typeof makeStore>;

function targetOf(store: TestStore) {
  const agent = store.getState().agentDefinition.agents[AGENT_ID];
  return agentSettingsTarget({
    agentId: AGENT_ID,
    dispatch: store.dispatch,
    settings: agent.settings ?? {},
    variableDefinitions: agent.variableDefinitions ?? [],
    outputSchema: null,
    bindablePolicy: readControlBindablePolicy(undefined),
    issuesByKey: {},
    allIssues: [],
    normalizedControls: null,
  });
}

/** The settings JSON the save path writes to the database. */
function savedSettings(store: TestStore): Record<string, unknown> {
  const agent = store.getState().agentDefinition.agents[AGENT_ID];
  return agentDefinitionToUpdate({ settings: agent.settings }).settings as Record<string, unknown>;
}

describe("'auto' effort is not set — one meaning per state (F-b)", () => {
  it("choosing auto removes the saved key", () => {
    const store = makeStore({ reasoning_effort: "high", max_output_tokens: 4096 });
    targetOf(store).change("reasoning_effort", "auto", EFFORT);
    expect(savedSettings(store)).toEqual({ max_output_tokens: 4096 });
  });

  it("choosing a level still saves it", () => {
    const store = makeStore({ reasoning_effort: "high" });
    targetOf(store).change("reasoning_effort", "low", EFFORT);
    expect(savedSettings(store)).toEqual({ reasoning_effort: "low" });
  });

  it("ticking the box never stores 'auto'", () => {
    const store = makeStore({});
    targetOf(store).turnOn("reasoning_effort", EFFORT);
    expect(savedSettings(store).reasoning_effort).not.toBe("auto");
    expect(savedSettings(store).reasoning_effort).toBeDefined();
  });
});
