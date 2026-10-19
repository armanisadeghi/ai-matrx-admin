import { parseAdvanced } from "../ToolAdvanced";
import { filledValues } from "../ToolDescribe";

describe("parseAdvanced", () => {
  it("applies only the Tool's own options and names the rest", () => {
    expect(parseAdvanced('{"website":"a.com","zzz":1}', ["website", "country"])).toEqual({ values: { website: "a.com" }, unused: ["zzz"] });
  });
  it("says why in plain words", () => {
    expect(parseAdvanced("{oops", ["a"])).toEqual({ problem: "That isn't valid JSON. Check the commas and quotes." });
    expect("problem" in parseAdvanced("[1]", ["a"])).toBe(true);
  });
});

describe("filledValues", () => {
  it("reads the form-fill answer and nothing else", () => {
    expect(filledValues({ fields: [{ name: "website", value: "a.com" }] })).toEqual({ website: "a.com" });
    expect(filledValues(null)).toBeNull();
    expect(filledValues({ nope: 1 })).toBeNull();
  });
});
