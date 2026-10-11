/**
 * A failed pair shows a short sentence, never the raw server text (verifier,
 * 2026-10-10: the pair window printed the refusal with an internal account id).
 * The raw detail stays behind ErrorNotice's details affordance.
 */
import { pairFailureSentence } from "../words";

const RAW = "Run refused: protected account 87a6e699-3622-4869-8843-d0867456c0dd cannot be billed";

describe("pairFailureSentence", () => {
  it("a known code reads as its plain reason", () => {
    expect(
      pairFailureSentence({ code: "protected_account_run_refused", status: "failed", message: RAW }, "failed"),
    ).toBe("Not run: this account can't be billed for background runs");
  });
  it("the run row's code is used when the payload is withheld", () => {
    expect(pairFailureSentence(undefined, "attempts_exhausted")).toBe("Not run: it crashed on every attempt");
  });
  it("an unknown failure never echoes the raw message or an id", () => {
    const words = pairFailureSentence({ code: "failed", message: RAW }, "failed");
    expect(words).toBe("The run failed.");
    expect(words).not.toMatch(/[0-9a-f]{8}-/);
  });
});
