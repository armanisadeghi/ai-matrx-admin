import { maskOffensive } from "../maskOffensive";

describe("maskOffensive", () => {
  it("masks slurs and profanity in a third-party bio, keeping the first letter and the length", () => {
    const bio = "Gay fag with no limits, fucking around";
    expect(maskOffensive(bio)).toBe("Gay f** with no limits, f****** around");
  });

  it("catches plurals and suffixes, any case", () => {
    expect(maskOffensive("FAGS and Shitty takes")).toBe("F*** and S***** takes");
  });

  it("leaves words that only contain a stem alone", () => {
    const clean = "Scunthorpe class cocktail Dickens assessment spice Hancock document";
    expect(maskOffensive(clean)).toBe(clean);
  });

  it("passes empty values through", () => {
    expect(maskOffensive(null)).toBeNull();
    expect(maskOffensive("")).toBe("");
  });
});
