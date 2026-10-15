import { formingRows, isKindJsonText } from "../lane-answer";

describe("Watch AI never shows a kind's JSON as it is written (MKT-122)", () => {
  it("recognises kind JSON, fenced or bare, whole or cut off mid-key", () => {
    expect(isKindJsonText('{"__kind":"brand_whats_new","facts":{')).toBe(true);
    expect(isKindJsonText('```json\n{"__kind"')).toBe(true);
    expect(isKindJsonText('Here you go: {"__kind": "x"}')).toBe(true);
  });
  it("leaves prose alone", () => {
    expect(isKindJsonText("The brand sells wool socks.")).toBe(false);
    expect(isKindJsonText("")).toBe(false);
  });
  it("turns a forming value into readable rows without keys of the transport", () => {
    const rows = formingRows({ __kind: "k", name: "Wool", facts: { city_name: "Niota", tags: ["a", "b"] } });
    expect(rows).toEqual([
      { depth: 0, label: "name", text: "Wool" },
      { depth: 0, label: "facts", text: null },
      { depth: 1, label: "city name", text: "Niota" },
      { depth: 1, label: "tags", text: "a, b" },
    ]);
  });
});

describe("a finished call shows its stored answer (MKT-126)", () => {
  const { recordedAnswerRows } = require("../lane-answer");
  it("reads fenced and bare kind JSON into rows", () => {
    expect(recordedAnswerRows('```json\n{"__kind":"k","name":"Wool"}\n```').rows).toEqual([
      { depth: 0, label: "name", text: "Wool" },
    ]);
    expect(recordedAnswerRows('Done. {"__kind":"k","name":"Wool"}')).toEqual({
      prose: "Done.",
      rows: [{ depth: 0, label: "name", text: "Wool" }],
    });
  });
  it("leaves prose as prose", () => {
    expect(recordedAnswerRows("Just words").rows).toBeNull();
  });
});
