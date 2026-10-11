import {
  applyBlockInsert,
  blockChipState,
  blockNamesInText,
  declaredNames,
  splitBlockText,
  toBlockName,
  typedTriggerAt,
  withDeclared,
  withoutDeclared,
} from "../tokens";

describe("block tokens", () => {
  it("finds declared-style tokens and ignores variables and escaped examples", () => {
    const text = "Use {{<research_rules>}} and {{topic}} but {{!<keep_me>}} and {{<Bad Name>}}";
    expect(blockNamesInText(text)).toEqual(["research_rules"]);
  });

  it("splits without losing a byte", () => {
    const text = "a {{<x>}} b {{<y-2>}}{{<x>}} c";
    const segs = splitBlockText(text);
    expect(segs.map((s) => s.text).join("")).toBe(text);
    expect(segs.filter((s) => s.kind === "block").map((s) => s.name)).toEqual(["x", "y-2", "x"]);
  });

  it("chip state: undeclared, missing, ok", () => {
    const declared = new Set(["a", "b"]);
    const missing = new Set(["b"]);
    expect(blockChipState("c", declared, missing)).toBe("undeclared");
    expect(blockChipState("b", declared, missing)).toBe("missing");
    expect(blockChipState("a", declared, missing)).toBe("ok");
  });

  it("typing {{< near the caret opens the picker with the typed query", () => {
    expect(typedTriggerAt("hello {{<res", 12)).toEqual({ start: 6, query: "res" });
    expect(typedTriggerAt("hello {{<", 9)).toEqual({ start: 6, query: "" });
    expect(typedTriggerAt("hello {{!<", 10)).toBeNull();
    expect(typedTriggerAt("hello {{name", 12)).toBeNull();
    expect(typedTriggerAt("{{<done>}} x", 12)).toBeNull();
  });

  it("insert replaces the typed trigger, or the selection", () => {
    const trig = typedTriggerAt("see {{<res", 10);
    const out = applyBlockInsert("see {{<res", 10, 10, "research_rules", trig);
    expect(out.text).toBe("see {{<research_rules>}}");
    expect(out.caret).toBe(out.text.length);
    const sel = applyBlockInsert("abc def", 4, 7, "x", null);
    expect(sel.text).toBe("abc {{<x>}}");
  });

  it("names: slug from a label; declared list keeps order and never double-declares", () => {
    expect(toBlockName("Research rules!")).toBe("research_rules");
    expect(toBlockName("123 go")).toBe("go");
    expect(declaredNames([{ name: "a" }, { name: "a" }, { name: "Bad" }, "b", 4])).toEqual(["a", "b"]);
    expect(withDeclared([{ name: "a" }], "b")).toEqual([{ name: "a" }, { name: "b" }]);
    expect(withDeclared([{ name: "a" }], "a")).toEqual([{ name: "a" }]);
    expect(withoutDeclared([{ name: "a" }, { name: "b" }], "a")).toEqual([{ name: "b" }]);
  });
});
