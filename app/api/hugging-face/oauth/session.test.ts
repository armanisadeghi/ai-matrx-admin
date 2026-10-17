
import { refusalWords } from "./session";

describe("refusalWords", () => {
  it("reads aidream's error envelope (user_message first)", () => {
    expect(
      refusalWords({
        error: "forbidden",
        message: "internal words",
        user_message: "Sign in with Hugging Face is not set up on AI Matrx yet. Paste a Hugging Face access token instead.",
      }),
    ).toBe("Sign in with Hugging Face is not set up on AI Matrx yet. Paste a Hugging Face access token instead.");
  });
  it("falls back to message, then FastAPI's detail", () => {
    expect(refusalWords({ message: "m" })).toBe("m");
    expect(refusalWords({ detail: "d" })).toBe("d");
  });
  it("is null when no sentence is present", () => {
    expect(refusalWords(null)).toBeNull();
    expect(refusalWords({ detail: [{ msg: "x" }] })).toBeNull();
    expect(refusalWords({ user_message: "  " })).toBeNull();
  });
});
