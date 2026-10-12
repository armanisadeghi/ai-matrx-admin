import { isTypedUserTurn } from "./providerMessageText";

const turn = (role: string, text: string) => ({ role, display: { text } });

describe("isTypedUserTurn", () => {
  it("accepts what a person typed", () => {
    expect(isTypedUserTurn(turn("user", "Fix the send button"))).toBe(true);
    expect(isTypedUserTurn(turn("user", "<b>bold</b> idea"))).toBe(true);
  });
  it("rejects assistant, empty and host envelopes", () => {
    expect(isTypedUserTurn(turn("assistant", "Done"))).toBe(false);
    expect(isTypedUserTurn(turn("user", "   "))).toBe(false);
    expect(isTypedUserTurn(turn("user", "<task-notification>\n<task-id>x</task-id>"))).toBe(false);
    expect(isTypedUserTurn(turn("user", "<system-reminder>ctx</system-reminder>"))).toBe(false);
    expect(isTypedUserTurn(turn("user", "<command-name>/clear</command-name>"))).toBe(false);
  });
});
