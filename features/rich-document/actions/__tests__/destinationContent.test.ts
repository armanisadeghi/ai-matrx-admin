/**
 * THE ONE "prepare content for a destination" step (RC-B6 round 2: Save to
 * Notes stored the raw `<artifact type="table" …>` envelope while Create Task
 * stripped it). Every action that sends content somewhere takes it from
 * `contentForDestination(ctx)`; only write-back actions keep the stored bytes.
 */
import * as fs from "fs";
import * as path from "path";
import { ensureWebRichDocumentRegistrations } from "@/features/rich-content-host/rich-document-registrations";
import { contentForDestination, contentForPrint } from "../utils";
import { chatContext } from "../../test-utils/chatContext";

// Chat's message actions and this app's handlers, before any registry read.
ensureWebRichDocumentRegistrations();

const ENVELOPED =
  'Your checklist:\n\n<artifact type="table" id="t1" version="1" title="Table 1">\n| Step | Owner |\n| --- | --- |\n| Payroll | Dana |\n</artifact>\n';

describe("every outbound writer uses the one destination step", () => {
  // Write-back (the stored bytes ARE the envelopes) and faithful capture.
  const RAW_ALLOWED = new Set([
    "edit.ts", // edits the stored message
    "preparedEdit.ts", // the save adapter's authoritative bytes
    "fullscreen-editor.ts", // edits the source
    "feedback.ts", // originalContent = the model's actual output, verbatim
  ]);
  const OUTBOUND = [
    /\b(content|initialContent|text|selection)\s*:\s*ctx\.content\b(?!\s*\})/,
    /\[ctx\.content\]/,
    /\b(copyText|copyToClipboard|printMarkdownContent|speak|markdownToHtml|cleanMarkdown|toPlainText|pushMarkdownToDocument|sendContentToGoogleDoc)\(\s*ctx\.content\b/,
    /\(\s*\n\s*ctx\.content,/,
  ];

  const dir = path.join(__dirname, "../handlers");
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
    if (RAW_ALLOWED.has(file)) continue;
    it(`${file} sends no raw ctx.content anywhere`, () => {
      const src = fs.readFileSync(path.join(dir, file), "utf8");
      const offenders = OUTBOUND.flatMap((re) => {
        const m = src.match(new RegExp(re.source, "g"));
        return m ?? [];
      });
      expect(offenders).toEqual([]);
    });
  }
});

// What Save to Notes opens (the quick-save window, readable text without envelopes or __kind JSON)
// is @ai-matrx/chat's own since message-actions W2a: the package's w2a-rows-reach-their-host-seams
// test guards it.

describe("a __kind answer reaches every destination as readable markdown", () => {
  const SET = {
    __kind: "flashcard_set",
    title: "Cell biology",
    cards: [{ __kind: "flashcard", front: "Powerhouse?", back: "Mitochondria" }],
  };

  it("contentForDestination converts a whole-answer kind and a fenced kind", () => {
    const whole = contentForDestination({ ...chatContext("assistant"), content: JSON.stringify(SET) });
    expect(whole).not.toContain("__kind");
    expect(whole).toContain("Mitochondria");

    const fenced = contentForDestination({
      ...chatContext("assistant"),
      content: "Your cards:\n\n```json\n" + JSON.stringify(SET) + "\n```\n",
    });
    expect(fenced).not.toContain("__kind");
    expect(fenced).toContain("Your cards:");
  });

  it("kindless content is unchanged", () => {
    const text = "Plain **answer** with ```json\n{\"a\":1}\n```";
    expect(contentForDestination({ ...chatContext("assistant"), content: text })).toBe(text);
  });
});

describe("a print keeps the artifact envelopes (each block prints through its own adapter)", () => {
  it("contentForPrint keeps <artifact>, contentForDestination unwraps it", () => {
    const ctx = { ...chatContext("assistant"), content: ENVELOPED };
    expect(contentForPrint(ctx)).toContain('<artifact type="table"');
    expect(contentForDestination(ctx)).not.toContain("<artifact");
  });
});
