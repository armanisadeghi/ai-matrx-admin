/**
 * "Make this an agent" reads the RIGHT answer and survives a reload.
 *
 * - The approved answer is the latest answer that actually came back. A refused turn (an approval
 *   hold) or a failed one leaves an assistant record behind; taking "the latest assistant message"
 *   handed the build the refusal line as its baseline.
 * - The in-flight draft (approved + capture + inputs brief) is read back from the doer's
 *   conversation metadata, and an incomplete draft is never resumed.
 */
import { MAKE_DRAFT_KEY, approvedAnswerFrom, readMakeDraft, type StudioMessageRecord } from "../studio-state";

const text = (t: string) => [{ type: "text", text: t }];

describe("approvedAnswerFrom", () => {
  const byId: Record<string, StudioMessageRecord> = {
    u1: { role: "user", content: text("Write the reminder for Maria") },
    a1: { role: "assistant", content: [{ type: "thinking", text: "hmm" }, ...text("Hi Maria! Reminder: Wed, Oct 14 at 9:30 AM.")] },
    u2: { role: "user", content: text("Use Wed") },
    a2: { role: "assistant", status: "failed", content: text("This agent spent more than its approval limit") },
    a3: { role: "assistant", _clientStatus: "error", content: text("stream broke") },
    a4: { role: "assistant", metadata: { failed: true }, content: text("partial") },
  };

  it("skips refused and failed turns and returns the last real answer, without thinking", () => {
    expect(approvedAnswerFrom(["u1", "a1", "u2", "a2", "a3", "a4"], byId)).toEqual({
      id: "a1",
      text: "Hi Maria! Reminder: Wed, Oct 14 at 9:30 AM.",
    });
  });

  it("returns null when no answer ever came back", () => {
    expect(approvedAnswerFrom(["u1", "a2"], byId)).toBeNull();
    expect(approvedAnswerFrom(undefined, undefined)).toBeNull();
  });
});

describe("readMakeDraft", () => {
  it("reads a saved draft from conversation metadata", () => {
    const brief = { variables: [{ name: "patient_name", test_value: "Maria Lopez" }] };
    expect(readMakeDraft({ other: 1, [MAKE_DRAFT_KEY]: { approved: "Hi Maria", capture: "steps", brief } })).toEqual({
      approved: "Hi Maria",
      capture: "steps",
      brief,
    });
  });

  it("never resumes an incomplete draft", () => {
    expect(readMakeDraft(null)).toBeNull();
    expect(readMakeDraft({})).toBeNull();
    expect(readMakeDraft({ [MAKE_DRAFT_KEY]: { approved: " ", brief: {} } })).toBeNull();
    expect(readMakeDraft({ [MAKE_DRAFT_KEY]: { approved: "Hi" } })).toBeNull();
  });
});

import { rerunSeedFrom } from "../studio-state";

describe("rerunSeedFrom", () => {
  it("re-runs the last run's own inputs and first typed message", () => {
    expect(
      rerunSeedFrom({ address: "1427 Alder Creek Lane", bedrooms: 4, empty: "" }, [
        { role: "user", content: [{ type: "text", text: "Make it punchy" }] },
        { role: "assistant", content: [{ type: "text", text: "Sunlight pours…" }] },
      ]),
    ).toEqual({ variables: { address: "1427 Alder Creek Lane", bedrooms: "4" }, userInput: "Make it punchy" });
  });

  it("is null when the last run had no inputs at all", () => {
    expect(rerunSeedFrom({}, [])).toBeNull();
    expect(rerunSeedFrom(undefined, undefined)).toBeNull();
  });
});
