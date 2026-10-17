import { firstStep, nextStep, meetMatrxSeen, MEET_MATRX_SEEN_KEY } from "../welcomeSteps";

describe("the sign-up welcome is one sequence", () => {
  it("a new account starts with who they are, whether or not it has met Matrx", () => {
    expect(firstStep({ newUser: true, meetSeen: false })).toBe("identity");
    expect(firstStep({ newUser: true, meetSeen: true })).toBe("identity");
  });

  it("a returning person who has not met Matrx meets it once; one who has goes straight to the tiles", () => {
    expect(firstStep({ newUser: false, meetSeen: false })).toBe("meet");
    expect(firstStep({ newUser: false, meetSeen: true })).toBe("start");
  });

  it("the sequence runs identity -> meet -> start, and never shows Meet Matrx twice", () => {
    expect(nextStep("identity", false)).toBe("meet");
    expect(nextStep("identity", true)).toBe("start");
    expect(nextStep("meet", false)).toBe("start");
    expect(nextStep("start", false)).toBe("start");
  });

  it("progress is read from the person's server-side record, only an explicit true counts", () => {
    expect(meetMatrxSeen({ user_metadata: { [MEET_MATRX_SEEN_KEY]: true } })).toBe(true);
    expect(meetMatrxSeen({ user_metadata: { [MEET_MATRX_SEEN_KEY]: "yes" } })).toBe(false);
    expect(meetMatrxSeen({ user_metadata: {} })).toBe(false);
    expect(meetMatrxSeen(null)).toBe(false);
  });
});
