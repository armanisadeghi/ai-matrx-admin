import { boardChoices } from "../boardChoices";
import { countryOptions, defaultCountry, plainField, plainOption, recordNoun } from "../inputWords";

describe("plain input words", () => {
  it("the maps search form reads as questions, with an example, and a country picker", () => {
    const kw = plainField({ name: "keyword", label: "Keyword", required: true });
    expect(kw).toMatchObject({ label: "What are you looking for?", placeholder: "e.g. dentist in Irvine", picker: null, advanced: false });
    expect(plainField({ name: "country", label: "Country", required: true })).toMatchObject({ label: "Country", picker: "country" });
  });
  it("cid and place id are advanced", () => {
    expect(plainField({ name: "cid", label: "Cid", required: true }).advanced).toBe(true);
    expect(plainField({ name: "place_id", label: "Place id", required: true }).advanced).toBe(true);
    expect(plainOption("cid").advanced).toBe(true);
    expect(plainOption("location").advanced).toBe(false);
  });
  it("an unknown technical name gets words; a plain catalog label is kept", () => {
    expect(plainField({ name: "num_of_reviews", label: "num_of_reviews", required: false }).label).toBe("Num of reviews");
    expect(plainField({ name: "brand", label: "Brand name", required: false }).label).toBe("Brand name");
  });
  it("countries start with the home country, default US", () => {
    expect(countryOptions("GB")[0]).toBe("GB");
    expect(defaultCountry("de")).toBe("DE");
    expect(defaultCountry("zz").length).toBe(2);
  });
  it("record noun", () => {
    expect(recordNoun("Trustpilot reviews")).toBe("reviews");
    expect(recordNoun("Google Play app")).toBe("records");
  });
});

describe("board choices", () => {
  const boards = [
    ...Array.from({ length: 12 }, (_, i) => ({ id: `u${i}`, title: "Untitled board" })),
    ...Array.from({ length: 10 }, (_, i) => ({ id: `b${i}`, title: `Board ${i}` })),
  ];
  it("collapses duplicate names, newest first, recent 8 and the rest", () => {
    const c = boardChoices(boards);
    expect(c.recent).toHaveLength(8);
    expect(c.recent[0].id).toBe("u0");
    expect(c.recent.filter((b) => b.title === "Untitled board")).toHaveLength(1);
    expect(c.recent.length + c.more.length).toBe(11);
  });
});
