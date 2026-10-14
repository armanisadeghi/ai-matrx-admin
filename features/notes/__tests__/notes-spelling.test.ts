import {
  applyReplacement,
  checkableWordAt,
  matchCase,
} from "../spelling/wordAt";
import { replacePointerWord } from "../spelling/pointerWord";

const TEXT = "Teh quick brwon fox";

describe("word detection", () => {
  it("finds the word under any offset inside it", () => {
    for (const off of [10, 12, 15]) {
      expect(checkableWordAt(TEXT, off)).toEqual({ start: 10, end: 15, word: "brwon" });
    }
  });
  it("returns null in whitespace-only gaps", () => {
    expect(checkableWordAt("a  b", 2)).toBeNull();
  });
  it.each([
    ["https://exmaple.com/pgae", 10],
    ["see www.exmaple.com now", 8],
    ["mail bob@exmaple.com", 12],
    ["ping @brwon now", 8],
    ["abc123 here", 2],
    ["use NASA today", 6],
    ["snake_cse here", 3],
    ["run `brwon` now", 7],
    ["```\nbrwon\n```", 5],
  ])("skips %j", (text, off) => {
    expect(checkableWordAt(text, off as number)).toBeNull();
  });
  it("still checks prose after a closed code span", () => {
    expect(checkableWordAt("run `x` brwon", 10)?.word).toBe("brwon");
  });
  it("keeps contractions whole", () => {
    expect(checkableWordAt("it's fine", 2)?.word).toBe("it's");
  });
});

describe("replacement", () => {
  it("changes only the word's range", () => {
    expect(applyReplacement(TEXT, 10, 15, "brown")).toBe("Teh quick brown fox");
  });
  it("matches the typed capitalization", () => {
    expect(matchCase("Teh", "the")).toBe("The");
    expect(matchCase("brwon", "brown")).toBe("brown");
  });
  it("replaces exactly that word in a textarea and nothing else", () => {
    const ta = document.createElement("textarea");
    ta.value = `${TEXT}\nline two brwon`;
    document.body.appendChild(ta);
    const ok = replacePointerWord(
      { kind: "textarea", textarea: ta, span: { start: 10, end: 15, word: "brwon" } },
      "brown",
    );
    expect(ok).toBe(true);
    expect(ta.value).toBe("Teh quick brown fox\nline two brwon");
    ta.remove();
  });
  it("refuses when the text moved under it", () => {
    const ta = document.createElement("textarea");
    ta.value = "xx Teh quick brwon fox";
    expect(
      replacePointerWord(
        { kind: "textarea", textarea: ta, span: { start: 10, end: 15, word: "brwon" } },
        "brown",
      ),
    ).toBe(false);
    expect(ta.value).toBe("xx Teh quick brwon fox");
  });
});
