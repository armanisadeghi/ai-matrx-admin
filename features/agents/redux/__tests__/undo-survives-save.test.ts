import { upsertAgent } from "@ai-matrx/chat/agents/redux/agent-definition/slice";
import type { AgentDefinition } from "@ai-matrx/chat/agents/types/agent-definition.types";
import {
  agentDefinitionWithBuilderReducer as reducer,
  setAgentField,
  markAgentSaved,
  undoAgentEdit,
  redoAgentEdit,
} from "../agent-builder.slice";

const ID = "77c81ce0-4585-4ac9-91f8-ce8857c5bbfc";

function seeded() {
  let state = reducer(undefined, { type: "init" });
  return reducer(state, upsertAgent({ id: ID, name: "Original" } as unknown as AgentDefinition));
}

describe("undo/redo survive Save", () => {
  it("Cmd+Z after Save restores the pre-edit value and re-dirties it", () => {
    let state = seeded();
    state = reducer(state, setAgentField({ id: ID, field: "name", value: "Edited" }));
    state = reducer(state, markAgentSaved({ id: ID }));
    expect(state.agents[ID]._dirty).toBe(false);
    expect(state.agents[ID]._undoPast.length).toBe(1);

    state = reducer(state, undoAgentEdit({ id: ID }));
    expect(state.agents[ID].name).toBe("Original");
    expect(state.agents[ID]._dirty).toBe(true); // saving now writes the undone text

    state = reducer(state, redoAgentEdit({ id: ID }));
    expect(state.agents[ID].name).toBe("Edited");
    expect(state.agents[ID]._dirty).toBe(false); // back at the saved value
  });
});
