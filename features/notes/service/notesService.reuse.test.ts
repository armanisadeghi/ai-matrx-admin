import { emptyNoteReuseUpdates } from "./notesService";
import type { Note } from "../types";

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111112";

describe("emptyNoteReuseUpdates", () => {
  const existing = {
    id: "11111111-1111-4111-8111-111111111111",
    label: "New Note",
  } as Note;

  it("applies the explicit dialog name when reusing an empty note", () => {
    expect(
      emptyNoteReuseUpdates(existing, {
        label: "War-room incident note",
        organization_id: ORGANIZATION_ID,
      }),
    ).toEqual({ label: "War-room incident note" });
  });

  it("does not turn a default reuse into a redundant write", () => {
    expect(emptyNoteReuseUpdates(existing, { organization_id: ORGANIZATION_ID })).toEqual({});
  });

  it("preserves explicit create metadata, ordering, row controls, and context links", () => {
    expect(emptyNoteReuseUpdates(existing, { organization_id: ORGANIZATION_ID, metadata: { source: "test" }, custom_fields: { studyAnnotation: { kind: "note" } }, position: 4, published_to_web: false, project_id: "22222222-2222-4222-8222-222222222222", task_id: "33333333-3333-4333-8333-333333333333" })).toMatchObject({ metadata: { source: "test" }, custom_fields: { studyAnnotation: { kind: "note" } }, position: 4, published_to_web: false, project_id: "22222222-2222-4222-8222-222222222222", task_id: "33333333-3333-4333-8333-333333333333" });
  });
});
