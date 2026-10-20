/**
 * A NOTE'S CHROME IS PART OF THE DOCUMENT (review 3 2026-10-20 R1). In Read, resting the pointer on
 * the note's bottom status bar ("Saved · 21 words…") revealed the page assistant's "Type your
 * message…" dock over the blocks: `[data-document-surface]` sat on the editor body only, so the
 * status bar, the tab row and the toolbar beside it were "not the document" (@ai-matrx/chat
 * `isInWritingSurface`), and Read takes no focus.
 *
 * The rule, walked over every real layout (discovered, never listed): in every source file that
 * draws a note's editor (`<NoteContentEditor`), the JSX tree holding it has ONE outermost element,
 * that element carries `data-document-surface`, and everything else the tree draws (tabs, toolbar,
 * title, presence, metadata/status bar) sits inside it. A new layout is checked by being written.
 * Then the real predicate (the installed @ai-matrx/chat) is run over the frame each layout draws.
 * Break it names: removing the attribute from any layout's frame → that layout red.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

jest.mock("next/dynamic", () => () => () => null);

import { isInWritingSurface } from "@ai-matrx/chat/agents/components/ambient-assistant/ScrollAssistantLauncher";

const ROOT = join(__dirname, "..", "..", "..");
const SURFACE = "NoteContentEditor";
const FRAME_ATTR = "data-document-surface";

type Jsx = ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment;

function layouts(): string[] {
  const out = execSync(`git ls-files -- 'features/**/*.tsx' 'components/**/*.tsx' 'app/**/*.tsx'`, { cwd: ROOT, encoding: "utf8" });
  return out
    .split("\n")
    .filter((f) => f && !/(__tests__|\.test\.|\.spec\.)/.test(f))
    .filter((f) => readFileSync(join(ROOT, f), "utf8").includes(`<${SURFACE}`));
}

const isJsx = (n: ts.Node): n is Jsx => ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n);
const tagOf = (n: Jsx): string =>
  ts.isJsxFragment(n) ? "" : (ts.isJsxElement(n) ? n.openingElement.tagName : n.tagName).getText();
const attrsOf = (n: Jsx) => (ts.isJsxFragment(n) ? null : ts.isJsxElement(n) ? n.openingElement.attributes : n.attributes);
const isIntrinsic = (n: Jsx) => /^[a-z]/.test(tagOf(n));
const hasAttr = (n: Jsx, name: string) =>
  Boolean(attrsOf(n)?.properties.some((p) => ts.isJsxAttribute(p) && p.name.getText() === name));

function jsxIn(node: ts.Node): Jsx[] {
  const all: Jsx[] = [];
  const visit = (n: ts.Node) => {
    if (isJsx(n)) all.push(n);
    ts.forEachChild(n, visit);
  };
  visit(node);
  return all;
}

/** The JSX ancestors of `node` (nearest first), across `{…}` containers, up to the function. */
function jsxAncestors(node: ts.Node): Jsx[] {
  const out: Jsx[] = [];
  for (let n = node.parent; n && !ts.isFunctionLike(n) && !ts.isSourceFile(n); n = n.parent) if (isJsx(n)) out.push(n);
  return out;
}

interface Frame {
  file: string;
  line: number;
  frameTag: string | null;
  marked: boolean;
  outside: string[];
}

function framesOf(file: string): Frame[] {
  const text = readFileSync(join(ROOT, file), "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const surfaces = jsxIn(sf).filter((n) => !ts.isJsxFragment(n) && tagOf(n) === SURFACE);
  return surfaces.map((surface) => {
    const chain = jsxAncestors(surface); // nearest first
    const root = chain[chain.length - 1] ?? surface;
    // The frame: the OUTERMOST plain element on the way from the tree's root to the editor.
    const frame = [...chain].reverse().find(isIntrinsic) ?? null;
    const insideFrame = (n: ts.Node) => frame !== null && n.pos >= frame.pos && n.end <= frame.end;
    const onPath = new Set<ts.Node>(chain);
    const outside = jsxIn(root)
      .filter((n) => n !== root && !onPath.has(n) && !insideFrame(n))
      .map((n) => `${tagOf(n) || "<>"} @${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`);
    return {
      file,
      line: sf.getLineAndCharacterOfPosition(surface.getStart()).line + 1,
      frameTag: frame ? tagOf(frame) : null,
      marked: frame !== null && hasAttr(frame, FRAME_ATTR),
      outside,
    };
  });
}

const FILES = layouts();

it("finds the real note layouts (the walk is discovered, not listed)", () => {
  expect(FILES).toEqual(
    expect.arrayContaining([
      "features/notes/components/NotesView.tsx",
      "features/notes/components/NoteWorkspace.tsx",
      "features/notes/components/NotesWindowView.tsx",
    ]),
  );
});

describe.each(FILES)("%s", (file) => {
  it("frames every note editor it draws: one outer element, marked as the document, holding all its chrome", () => {
    for (const frame of framesOf(file)) {
      expect(frame).toEqual(expect.objectContaining({ marked: true, outside: [] }));
    }
  });
});

describe("the installed page-assistant predicate over a framed layout", () => {
  afterEach(() => (document.body.innerHTML = ""));
  it("the status bar, tab row and toolbar inside the frame count as the document; the list beside it does not", () => {
    document.body.innerHTML = `<main class="shell-main"><div data-group="">
      <div data-panel=""><button id="row">A note</button></div>
      <div data-panel=""><div ${FRAME_ATTR}="">
        <div id="tabs"><button id="tab">A note</button></div>
        <div id="toolbar"><button id="bold">B</button></div>
        <div ${FRAME_ATTR}=""><p id="text">Read</p></div>
        <footer id="status"><span id="words">21 words</span></footer>
      </div></div></div></main>`;
    for (const id of ["tab", "bold", "text", "status", "words"]) {
      expect([id, isInWritingSurface(document.getElementById(id))]).toEqual([id, true]);
    }
    expect(isInWritingSurface(document.getElementById("row"))).toBe(false);
  });
});
