/**
 * "Run again" re-runs the SAME inputs (live 2026-10-21, agent c6c4862b): the Studio seeds its runs,
 * so the last run's values are HOST values (`chat.conversation.host_value_names` held all five). Reading
 * only the person's own values re-ran with none, and the launch was refused "Fill in amount, …".
 * Real chat reducer + the real stamp action a reload dispatches; red on the own-values-only read.
 */
import reducer, {
  initInstanceVariables,
  stampSubmittedFirstTurnValues,
} from "@ai-matrx/chat/agents/redux/execution-system/instance-variable-values/instance-variable-values.slice";
import { runAgainSeed } from "../run-again";

const CID = "run-1";
const VALUES = { amount: "$86", customer_name: "Dana", invoice_number: "1042" };

function stateAfterReload(hostValueNames: string[]) {
  let slice = reducer(undefined, initInstanceVariables({ conversationId: CID, definitions: [], scopeValues: {} }));
  slice = reducer(slice, stampSubmittedFirstTurnValues({ conversationId: CID, values: VALUES, hostValueNames }));
  return {
    instanceVariableValues: slice,
    messages: { byConversationId: { [CID]: { orderedIds: [], byId: {} } } },
  } as never;
}

describe("Run again keeps the last run's inputs", () => {
  it("carries the values the Studio seeded (host values)", () => {
    const seed = runAgainSeed(stateAfterReload(Object.keys(VALUES)), CID);
    expect(seed?.variables).toEqual(VALUES);
  });

  it("carries the values the person typed (own values)", () => {
    const seed = runAgainSeed(stateAfterReload([]), CID);
    expect(seed?.variables).toEqual(VALUES);
  });
});
