import { cleanContent } from "../clean";
import { cleanValue } from "../clean-cells";
import { DEFAULT_ENABLED_OPERATIONS } from "../operations";
import { buildOperationCards } from "../review";

const clean = (text: string, ids = DEFAULT_ENABLED_OPERATIONS) =>
  cleanContent(text, ids).cleaned;

describe("unescape-markdown", () => {
  it("is on by default and restores escaped bold, headings and lists", () => {
    const note =
      "\\# Title\n\n1\\. \\*\\*Offering inventory\\*\\* [D1, D2]. Every \\_item\\_ \\- done";
    expect(clean(note)).toBe(
      "# Title\n\n1. **Offering inventory** [D1, D2]. Every _item_ - done",
    );
  });

  it("removes doubled (re-escaped) backslashes too", () => {
    expect(clean("\\\\*\\\\*bold\\\\*\\\\*")).toBe("**bold**");
  });

  it("leaves backslashes before letters, line ends and inside code alone", () => {
    const note =
      'Path C:\\Users\\me\nhard break\\\nnext `a \\* b`\n\n```\nx = "\\*"\n```';
    expect(clean(note)).toBe(note);
  });

  it("never touches LaTeX math", () => {
    const note =
      "Inline $\\{a\\}$ and \\[ \\frac{1}{2} \\] and $$\\left\\{ x \\right\\}$$";
    expect(clean(note)).toBe(note);
  });

  it("still unescapes plain \\[link\\] brackets that are not math", () => {
    expect(clean("see \\[link\\]")).toBe("see [link]");
  });

  it("review card count matches the engine", () => {
    const note = "\\*\\*a\\*\\* and \\#b";
    const cards = buildOperationCards(note, ["unescape-markdown"]);
    expect(cards).toHaveLength(1);
    expect(cards[0].count).toBe(5);
    expect(
      cleanContent(note, ["unescape-markdown"]).operations.find(
        (o) => o.id === "unescape-markdown",
      )?.changes,
    ).toBe(5);
  });
});

describe("decode-escape-sequences", () => {
  const ids = ["decode-escape-sequences" as const];

  it("is off by default", () => {
    expect(DEFAULT_ENABLED_OPERATIONS).not.toContain("decode-escape-sequences");
    expect(clean("a\\nb")).toBe("a\\nb");
  });

  it("decodes literal \\n, \\r\\n, \\t, quotes and \\u escapes", () => {
    expect(
      clean('line1\\nline2\\r\\nline3\\tcol \\"q\\" it\\u2019s', ids),
    ).toBe(`line1\nline2\nline3\tcol "q" it${String.fromCodePoint(0x2019)}s`);
  });

  it("skips an escaped backslash and refuses sentinel code points", () => {
    expect(clean("keep \\\\n and \\ue000", ids)).toBe("keep \\\\n and \\ue000");
  });
});

describe("decode-html-entities", () => {
  const ids = ["decode-html-entities" as const];

  it("decodes named and numeric entities once, and <br>", () => {
    expect(
      clean("Tom &amp; Jerry&nbsp;&#39;x&#x27; &mdash; a<br/>b &amp;lt;", ids),
    ).toBe(`Tom & Jerry 'x' ${String.fromCodePoint(0x2014)} a\nb &lt;`);
  });

  it("leaves unknown entities and protected code alone", () => {
    const note = "&bogus; `&amp;`";
    expect(clean(note, ids)).toBe(note);
  });

  it("never decodes into the reserved sentinels", () => {
    expect(clean("&#xE000;", ids)).toBe("&#xE000;");
  });
});

describe("value engine", () => {
  it("unescapes then unwraps a cell", () => {
    expect(
      cleanValue("\\*\\*Lead\\*\\*", ["unescape-markdown", "unwrap-bold"])
        .after,
    ).toBe("Lead");
  });
});
