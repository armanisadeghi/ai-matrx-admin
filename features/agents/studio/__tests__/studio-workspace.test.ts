jest.mock("@ai-matrx/data/db", () => ({ mergeJsonColumn: jest.fn() }));
jest.mock("@/utils/supabase/client", () => ({ createClient: jest.fn() }));

import {
  WORKSPACE_KEY,
  codeApprove,
  emptyWorkspace,
  keepSuggestedInput,
  personAddListItem,
  personRemoveListItem,
  personSetInput,
  personSetListItem,
  personSetText,
  readWorkspace,
  workspaceIsEmpty,
} from "../workspace";

describe("the shared Studio workspace (person's side)", () => {
  it("a half-written stored row still reads as a full record", () => {
    const ws = readWorkspace({ [WORKSPACE_KEY]: { goal: "g", inputs: "oops", by: 3 } });
    expect(ws.goal).toBe("g");
    expect(ws.inputs).toEqual([]);
    expect(ws.by).toEqual({});
    expect(workspaceIsEmpty(emptyWorkspace())).toBe(true);
    expect(readWorkspace(null).steps).toEqual([]);
  });

  it("every person edit marks the field as theirs, so the server refuses the assistant's overwrite", () => {
    let ws = personSetText(emptyWorkspace(), "goal", "mine");
    expect(ws.by.goal).toBe("person");
    ws = { ...ws, inputs: [{ name: "audience", label: "Who", value: "cafes", by: "assistant" }] };
    ws = personSetInput(ws, "audience", { value: "wholesale cafes" });
    expect(ws.inputs[0]).toMatchObject({ value: "wholesale cafes", by: "person" });
    expect(ws.by["inputs.audience"]).toBe("person");
  });

  it("removing a text row moves the later rows' marks up with them", () => {
    let ws = personAddListItem(emptyWorkspace(), "requirements", "a");
    ws = personAddListItem(ws, "requirements", "b");
    ws = personAddListItem(ws, "requirements", "c");
    ws = { ...ws, by: { ...ws.by, "requirements.0": "assistant" } };
    ws = personRemoveListItem(ws, "requirements", 0);
    expect(ws.requirements).toEqual(["b", "c"]);
    expect(ws.by).toEqual({ "requirements.0": "person", "requirements.1": "person" });
    expect(personSetListItem(ws, "requirements", 1, "C").requirements).toEqual(["b", "C"]);
  });

  it("the approval is written by code, and a kept suggestion becomes the person's", () => {
    const ws = codeApprove(emptyWorkspace(), "the answer", 9);
    expect(ws.approved_result).toEqual({ text: "the answer", turn: 9, by: "code" });
    const kept = keepSuggestedInput(ws, { name: "city", label: "City", value: "Austin", suggested: true });
    expect(kept.inputs[0]).toMatchObject({ name: "city", by: "person", suggested: false });
    expect(keepSuggestedInput(kept, { name: "city" }).inputs).toHaveLength(1);
  });
});
