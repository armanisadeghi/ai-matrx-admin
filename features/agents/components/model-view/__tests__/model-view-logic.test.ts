import {
  effectiveVariables,
  emptyVariables,
  fullModelText,
  messageText,
  platformLabel,
  splitByValues,
} from "../modelViewLogic";

describe("splitByValues", () => {
  it("marks exactly the inserted values, longest first, and keeps every byte", () => {
    const text = "Hello Ann Lee, about Ann.";
    const segments = splitByValues(text, ["Ann", "Ann Lee"]);
    expect(segments.map((s) => s.text).join("")).toBe(text);
    expect(segments.filter((s) => s.inserted).map((s) => s.text)).toEqual([
      "Ann Lee",
      "Ann",
    ]);
  });

  it("does not mark short values or regex characters as patterns", () => {
    expect(splitByValues("a b a", ["a"]).every((s) => !s.inserted)).toBe(true);
    const out = splitByValues("cost (a+b)* done", ["(a+b)*"]);
    expect(out.find((s) => s.inserted)?.text).toBe("(a+b)*");
  });

  it("returns the text whole when nothing is inserted", () => {
    expect(splitByValues("plain", [])).toEqual([{ text: "plain", inserted: false }]);
  });
});

describe("variables", () => {
  it("lists declared variables with no value, edits winning over the run", () => {
    const values = effectiveVariables({ who: "Ann", topic: "" }, { topic: "tides" });
    expect(emptyVariables(["who", "topic", "tone"], values)).toEqual(["tone"]);
    expect(emptyVariables(["who", "topic"], effectiveVariables({ who: "Ann" }, { who: "  " }))).toEqual([
      "who",
      "topic",
    ]);
  });
});

describe("reading the server's answer", () => {
  it("joins text parts and names other parts by type", () => {
    expect(
      messageText({ content: [{ type: "text", text: "Hi" }, { type: "image" }] }),
    ).toBe("Hi\n[image]");
  });

  it("copies the system string untouched, then each message", () => {
    const text = fullModelText({
      model: "m",
      system_prompt: "SYS {{undeclared}}",
      messages: [{ role: "user", content: [{ type: "text", text: "Hello Ann" }] }],
      tools: [],
    });
    expect(text).toBe("SYSTEM\nSYS {{undeclared}}\n\nUSER\nHello Ann");
  });

  it("labels the platform pieces briefly", () => {
    expect(platformLabel("org_catalog")).toBe("Organizations");
    expect(platformLabel("something_new")).toBe("something_new");
  });
});
