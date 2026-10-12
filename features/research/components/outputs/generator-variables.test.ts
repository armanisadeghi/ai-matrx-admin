/**
 * @jest-environment node
 */
import { buildGeneratorVariables, NO_VOICE_LENS_NOTE } from "./generator-variables";

describe("an Outputs Studio generator always sends voice_lens", () => {
  it("never sends a blank voice_lens (the mandate door refuses a blank guaranteed value)", () => {
    for (const tone of ["", "   ", "\n"]) {
      expect(buildGeneratorVariables("report", tone).voice_lens).toBe(NO_VOICE_LENS_NOTE);
    }
  });
  it("sends the person's note when there is one", () => {
    expect(buildGeneratorVariables("report", "  warm, plain  ").voice_lens).toBe("warm, plain");
  });
});
