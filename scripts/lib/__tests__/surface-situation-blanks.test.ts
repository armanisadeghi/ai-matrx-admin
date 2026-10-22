/**
 * A situation blank must name a value the surface's chain declares (or `user`); a brace
 * pair that is not a blank is a defect too.
 * The whole registry is checked by `pnpm check:surface-drift` (rule 12).
 */
import { situationBlankFailures } from "../surface-situation-blanks";

const surface = (situation: string, values: string[]) => ({
  surfaceName: "matrx-user/test-deck",
  situation,
  values: values.map((name) => ({ name })),
});

describe("situationBlankFailures", () => {
  it("passes declared blanks, dotted paths, fallbacks and the user key", () => {
    expect(
      situationBlankFailures([
        surface("{user.name|The person} opened {deck.name} with {card_count|no} cards.", [
          "deck",
          "card_count",
        ]),
      ]),
    ).toEqual([]);
  });

  it("fails a blank naming an undeclared value", () => {
    const failures = situationBlankFailures([surface("They are on card {card_number}.", ["card_count"])]);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('"card_number"');
  });

  it("fails a brace pair that is not a blank", () => {
    const failures = situationBlankFailures([surface("They see {the card front}.", [])]);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("render literally");
  });

  it("ignores surfaces without a situation", () => {
    expect(situationBlankFailures([{ surfaceName: "a/b", values: [] }])).toEqual([]);
  });
});
