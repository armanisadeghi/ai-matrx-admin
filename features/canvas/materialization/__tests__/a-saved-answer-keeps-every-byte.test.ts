/**
 * Saving an answer's blocks as canvas rows never changes a byte the person was shown
 * (Arman: "our UI CANNOT LIE to the user about what is there"; 2026-10-21).
 *
 * The materializer used to re-serialize every split block back to markdown and re-write the
 * bodies of kind blocks into compact JSON: a `<cooking_recipe>` or `<timeline>` written as
 * markdown, a pretty-printed ```json flashcard set, a ```comparison fence and `<flashcards>` were
 * all stored as different text than the answer held (message e38df89b, content_history reason
 * `artifact_materialization`), and blank lines between blocks were re-counted. Now only a block's
 * wrapper (its fence or tag) becomes the id-bearing `<artifact>` tag; its body and every byte
 * around it stay exactly as written, for every block kind.
 *
 * Each case goes through the real orchestrator (`materializeBlocks`) with an in-memory canvas
 * writer, and compares the stored text byte for byte.
 */

import type { CxContentBlock } from "@ai-matrx/chat/public-chat/types/cx-tables";
import { splitContentIntoBlocksV2 } from "@ai-matrx/rich-content/display/markdown-classification/processors/utils/content-splitter-v2";
import { materializeBlocks, type MaterializeWriter } from "../materializeBlocks";
import { planMaterialization } from "../planMaterialization";

const J = (o: unknown, pretty = false) => (pretty ? JSON.stringify(o, null, 2) : JSON.stringify(o));
interface Sample { name: string; open: string; inner: string; close: string }
const fence = (name: string, lang: string, inner: string): Sample => ({ name, open: "```" + lang, inner, close: "```" });
const tag = (name: string, t: string, inner: string): Sample => ({ name, open: `<${t}>`, inner, close: `</${t}>` });
const SAMPLES: Sample[] = [
  fence("chart", "chart", J({ type: "pie", title: "Visits", data: [{ label: "Web", value: 6 }, { label: "App", value: 4 }] })),
  fence("stats", "stats", J({ title: "Totals", stats: [{ label: "Revenue", value: "$1.2M" }, { label: "Users", value: 12 }] })),
  fence("tasks", "tasks", "## Sprint 12\n- [ ] Write the plan\n- [x] Book the room"),
  fence("mermaid", "mermaid", "flowchart TD\n  A[Start] --> B{Ready?}\n  B -->|Yes| C[Ship]"),
  fence("svg", "svg", '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>'),
  fence("diff", "diff", "--- a/x.txt\n+++ b/x.txt\n@@ -1 +1 @@\n-old line\n+new line"),
  fence("html", "html", "<!doctype html>\n<html><body><h1>Hi</h1></body></html>"),
  fence("react", "react", "export default function App() {\n  return <div>Hi</div>;\n}"),
  fence("comparison", "comparison", J({ comparison: { title: "Plans", items: ["Alpha", "Beta"], criteria: [{ name: "Price", values: [10, 20] }] } })),
  fence("diagram", "diagram", J({ type: "flowchart", title: "Flow", nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }], edges: [{ source: "a", target: "b" }] })),
  fence("json flashcard_set (pretty)", "json", J({ __kind: "flashcard_set", title: "Cells", cards: [{ __kind: "flashcard", front: "Q1", back: "A1" }] }, true)),
  fence("json timeline kind", "json", J({ __kind: "timeline", title: "T", periods: [{ __kind: "timeline_period", period: "2020", events: [{ __kind: "timeline_event", id: "e1", title: "Launch", date: "", description: "" }] }] }, true)),
  { name: "artifact non-uuid kind", open: '<artifact type="flashcards" id="mitosis-deck">', inner: J({ __kind: "flashcard_set", title: "Mitosis", cards: [{ __kind: "flashcard", front: "Q", back: "A" }] }), close: "</artifact>" },
  tag("cooking_recipe", "cooking_recipe", "### Pancakes\nPrep: 10 minutes\nCook: 20 minutes\n#### Ingredients\n- 2 eggs\n#### Instructions\n1. Mix for 3 minutes"),
  tag("troubleshooting", "troubleshooting", "### The app will not start\n- Check the cable\n- Restart it"),
  tag("timeline", "timeline", "**2020**\n- Launch: the first release"),
  tag("progress_tracker", "progress_tracker", "### Launch\n- [x] Plan\n- [ ] Ship"),
  tag("flashcards", "flashcards", "Front: What is 2+2?\nBack: 4\n\nFront: Capital of France?\nBack: Paris"),
  tag("questionnaire", "questionnaire", "### Intake\n1. What is your name?\n2. How old are you?"),
  tag("resources", "resources", "### Reading\n- [MDN](https://developer.mozilla.org) - web docs"),
  tag("research", "research", "# Findings\n## Summary\nTea is calm."),
  { name: "table", open: "", inner: "| Name | Age |\n| --- | --- |\n| Ann | 3 |\n| Bob | 4 |", close: "" },
  { name: "tree", open: "", inner: "project/\n├── src/\n│   └── index.ts\n└── package.json", close: "" },
];
const sourceOf = (s: Sample) => (s.open ? `${s.open}\n${s.inner}\n${s.close}` : s.inner);

const MESSAGE_ID = "00000000-0000-4000-8000-00000000a001";

function fakeWriter(): MaterializeWriter {
  let n = 0;
  return {
    isReadableById: async () => true,
    upsertForSource: async () => {
      n += 1;
      return {
        id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
        version: 1,
        conversation_id: null,
      } as never;
    },
    setExternalLink: async () => undefined as never,
    upsertDiscoveryIndex: async () => ({ id: "00000000-0000-4000-8000-00000000b001" }) as never,
  };
}

async function save(content: CxContentBlock[]): Promise<CxContentBlock[]> {
  let stored: CxContentBlock[] | null = null;
  const result = await materializeBlocks({
    source: { system: "cx_message", id: MESSAGE_ID },
    content,
    writer: fakeWriter(),
    runDomainAdapters: false,
    persistRewrite: async (rewritten) => {
      stored = rewritten;
      return { ok: true };
    },
  });
  expect(result.errors).toEqual([]);
  if (!stored) throw new Error("nothing was saved");
  return stored;
}

const textOf = (blocks: CxContentBlock[]) =>
  blocks.map((b) => ((b as { type?: string }).type === "text" ? (b as { text: string }).text : "")).join("\u0002");

/** Every saved `<artifact …>` tag's edges become markers; the body between stays as it is. */
const STORED_TAG = /<artifact [^>]*id="00000000-0000-4000-8000-\d{12}"[^>]*>\n([\s\S]*?)\n<\/artifact>/g;
const markStored = (text: string) => text.replace(STORED_TAG, "\u0000$1\u0001");
const markSample = (s: Sample) => `\u0000${s.inner}\u0001`;

const text = (t: string): CxContentBlock => ({ type: "text", text: t }) as CxContentBlock;

describe("materialization keeps every byte of the answer", () => {
  it.each(SAMPLES.map((s) => [s.name, s] as const))("%s: saved as an artifact, body byte for byte", async (_name, s) => {
    const answer = `Intro.\n\n${sourceOf(s)}\n\nOutro.`;
    const stored = await save([text(answer)]);
    expect(stored).toHaveLength(1);
    const saved = (stored[0] as { text: string }).text;
    // It did materialize (one id-bearing tag), and nothing but the wrapper changed.
    expect(saved.match(STORED_TAG)).toHaveLength(1);
    expect(markStored(saved)).toBe(`Intro.\n\n${markSample(s)}\n\nOutro.`);
    // Round trip: the saved answer reads back with the same body, and saving it again is a no-op.
    const artifact = splitContentIntoBlocksV2(saved).find((b) => b.type === "artifact");
    expect(artifact?.content).toBe(s.inner);
    expect(planMaterialization(stored).hasChanges).toBe(false);
  });

  it("an answer holding every kind, with a second text block and a thinking block, keeps every byte", async () => {
    const thinking = { type: "thinking", text: "Need to repeat exactly.", id: "", summary: [], metadata: {} } as unknown as CxContentBlock;
    const body = SAMPLES.map(sourceOf).join("\n\n");
    const first = {
      type: "text",
      id: "",
      text: `Green tea is calm.\n\n<info>\n\n</info>\n\n<foo>\nfoo body\n</foo>\n\n${body}\n\n\n\nTrailing prose with  two spaces.\n`,
      metadata: { m: 1 },
      citations: [],
    } as unknown as CxContentBlock;
    const second = text("\n\nMy reply ran out of room.");
    const stored = await save([thinking, first, second]);

    expect(stored).toHaveLength(3);
    expect(stored[0]).toBe(thinking);
    expect(stored[2]).toBe(second);
    // The first text block keeps its own fields.
    expect(stored[1]).toMatchObject({ id: "", metadata: { m: 1 }, citations: [] });
    const saved = (stored[1] as { text: string }).text;
    expect(saved.match(STORED_TAG)).toHaveLength(SAMPLES.length);
    expect(markStored(saved)).toBe(
      (first as unknown as { text: string }).text.replace(body, SAMPLES.map(markSample).join("\n\n")),
    );
    expect(textOf(planMaterialization(stored).rewrittenBlocks as CxContentBlock[])).toBe(textOf(stored));
  });

  it("a block the reply never closed is left exactly as written", async () => {
    // The e38df89b shape: the reply hit its token limit inside <progress_tracker>.
    const cut = "```chart\n{\"type\":\"pie\",\"data\":[{\"label\":\"Web\",\"value\":6}]}\n```\n\n<progress_tracker>\n### Launch\n- [x] Plan\n";
    const stored = await save([text(cut), text("\n\nMy reply ran out of room.")]);
    const saved = (stored[0] as { text: string }).text;
    expect(saved.match(STORED_TAG)).toHaveLength(1);
    expect(saved.endsWith("\n\n<progress_tracker>\n### Launch\n- [x] Plan\n")).toBe(true);
    expect((stored[1] as { text: string }).text).toBe("\n\nMy reply ran out of room.");
  });
});
