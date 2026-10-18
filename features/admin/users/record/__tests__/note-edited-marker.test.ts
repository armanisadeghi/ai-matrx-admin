import { noteWasEdited } from "../UserNotesTab";

describe("noteWasEdited", () => {
  const base = { created_at: "2026-10-18T10:00:00Z", updated_at: "2026-10-18T10:00:00Z", metadata: {} };
  it("is false for a fresh note", () => expect(noteWasEdited(base)).toBe(false));
  it("is true when updated later with no pin stamp", () =>
    expect(noteWasEdited({ ...base, updated_at: "2026-10-18T11:00:00Z" })).toBe(true));
  it("is false when the update is the pin", () =>
    expect(noteWasEdited({ ...base, updated_at: "2026-10-18T11:00:00Z", metadata: { pinned_at: "2026-10-18T11:00:00.2Z" } })).toBe(false));
  it("is true when edited after the pin", () =>
    expect(noteWasEdited({ ...base, updated_at: "2026-10-18T12:00:00Z", metadata: { pinned_at: "2026-10-18T11:00:00Z" } })).toBe(true));
});
