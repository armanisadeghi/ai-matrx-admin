/**
 * KIND-HOST CONVERGENCE GUARD. The web and Matrx 2 share ONE kind registry: both make the package's
 * `registerKindHost` call, and the package owns the core kinds (flashcards, quiz, study pack, study
 * notes, lesson scripts) and the content_ir reader. Red on the old wiring (the web built its own
 * KindRegistry and kept its own copies of those files); green once the web registers into the package.
 *
 * Census: every kind the web knew before the switch (fixtures/kind-host-census.before.json, captured on
 * the old wiring) keeps every facet (schemas are other lanes' to edit, so not frozen here), its block dispatch, and — for flashcard_set and quiz_set drawn in
 * a chat answer — every control.
 */
// eslint-disable-next-line import/order -- the judge's mocks must register first
import "@/features/content-ir/render-paths/__tests__/dom-frame-judge";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import "@/providers/richContentHost";
import { kindRegistry } from "@/features/content-ir/registry/kind-registry";
import { hostCapability } from "@ai-matrx/rich-content/host";
import { packageKindRegistry } from "@ai-matrx/rich-content/kinds/registry/package-kind-registry";
import {
  BLOCK_DISPATCH,
  resolveBlockDispatch,
} from "@ai-matrx/rich-content/display/chat-markdown/block-registry/block-dispatch";
import { DOMAIN_BLOCK_DISPATCH } from "@/features/rich-content-host/domain-block-dispatch";
import { RichContent } from "@ai-matrx/rich-content/levels/RichContent";
import { flashcardsServerDataFromEnvelope } from "@ai-matrx/rich-content/kinds/definitions/flashcard-set";
import { quizServerDataFromEnvelope } from "@ai-matrx/rich-content/kinds/definitions/quiz-set";
import { TooltipProvider } from "@/components/ui/tooltip";

jest.setTimeout(120_000);
// The quiz hashes its content (crypto.subtle); jsdom has no SubtleCrypto.
if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, "crypto", { value: jest.requireActual<typeof import("node:crypto")>("node:crypto").webcrypto, configurable: true });

const FLASH = { __kind: "flashcard_set", title: "Cell biology", cards: [{ __kind: "flashcard", front: "What makes ATP?", back: "Mitochondria" }] };
const QUIZ = {
  __kind: "quiz_set",
  title: "Cells",
  questions: [{ __kind: "quiz_question", type: "multiple_choice", question: "Powerhouse?", options: ["Mitochondria", "Nucleus"], correct_answer: "Mitochondria" }],
};

async function draw(source: string) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(<TooltipProvider><RichContent level="full" imagePolicy="ai" source={source} /></TooltipProvider>));
  for (let i = 0; i < 10; i += 1) await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  const buttons = [...container.querySelectorAll("button")].map((b) => (b.getAttribute("aria-label") || b.textContent || "").trim()).filter(Boolean).sort();
  const attrs = [...new Set([...container.querySelectorAll("*")].flatMap((el) => el.getAttributeNames().filter((n) => n.startsWith("data-")).map((n) => `${n}=${el.getAttribute(n)}`)))].filter((a) => !/=(\d+|r\d+|:r)/.test(a)).sort();
  const text = (container.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 400);
  act(() => root.unmount());
  container.remove();
  return { buttons, attrs, text };
}

function dispatchClass(type: string): string {
  const fn = resolveBlockDispatch(type as never);
  if (!fn) return "none";
  if (fn === (DOMAIN_BLOCK_DISPATCH as Record<string, unknown>)[type]) return "domain";
  if (fn === (BLOCK_DISPATCH as Record<string, unknown>)[type]) return "engine";
  return "other";
}

const ROOT = path.resolve(__dirname, "../../..");
const BEFORE = JSON.parse(readFileSync(path.join(__dirname, "fixtures/kind-host-census.before.json"), "utf8")) as {
  kinds: Record<string, Record<string, unknown>>;
  dispatch: Record<string, string>;
  render: Record<string, { buttons: string[] }>;
};
/** The only dispatch changes the switch makes: the package's own views answer these block types below the unified stage. */
const PACKAGE_VIEW_TYPES = new Set(["flashcards", "quiz"]);

function census() {
  const registry = kindRegistry as unknown as {
    listDefinitions(): Array<Record<string, unknown> & { kind: string }>;
    getDeclaredLoadingComponent(k: string): unknown;
    isKnownKind(k: string): boolean;
    isRenderableKind(k: string): boolean;
  };
  return Object.fromEntries(registry.listDefinitions().map((d) => [d.kind, {
    legacyBlockType: d.legacyBlockType ?? null,
    toLegacyServerData: typeof d.toLegacyServerData === "function",
    toMarkdown: typeof d.toMarkdown === "function",
    artifact: d.artifact ?? null,
    persistence: d.persistence ?? null,
    loadingComponent: d.loadingComponent ?? null,
    partialReady: d.partialReady ?? null,
    declaredLoading: registry.getDeclaredLoadingComponent(d.kind) ?? null,
    known: registry.isKnownKind(d.kind),
    renderable: registry.isRenderableKind(d.kind),
  }]));
}

describe("the web is a kind host of the package's one registry", () => {
  it("the host's kindRegistry and this app's kindRegistry ARE the package registry", () => {
    expect(hostCapability("kindRegistry" as never)).toBe(packageKindRegistry());
    expect(kindRegistry).toBe(packageKindRegistry());
  });

  it("flashcard_set and quiz_set are the package's own definitions, not a web copy", () => {
    const reg = packageKindRegistry();
    expect(reg.getDefinition("flashcard_set")?.toLegacyServerData).toBe(flashcardsServerDataFromEnvelope);
    expect(reg.getDefinition("quiz_set")?.toLegacyServerData).toBe(quizServerDataFromEnvelope);
  });

  it("no web file copies a package kind file: same basename means a re-export of the package", () => {
    const pkg = path.join(ROOT, "node_modules/@ai-matrx/rich-content/dist/kinds");
    const pkgNames = new Set(["definitions", "registry"].flatMap((d) => readdirSync(path.join(pkg, d)).filter((f) => f.endsWith(".js")).map((f) => f.replace(/\.js$/, ""))));
    const copies: string[] = [];
    for (const dir of ["features/content-ir/kinds", "features/content-ir/registry"]) {
      for (const f of readdirSync(path.join(ROOT, dir))) {
        if (!/\.tsx?$/.test(f) || /\.test\.tsx?$/.test(f)) continue;
        const name = f.replace(/\.tsx?$/, "");
        if (!pkgNames.has(name)) continue;
        const body = readFileSync(path.join(ROOT, dir, f), "utf8");
        if (!body.includes(`export * from "@ai-matrx/rich-content/kinds/`)) copies.push(`${dir}/${f}`);
      }
    }
    expect(copies).toEqual([]);
    for (const retired of ["flashcard-set", "quiz-set", "study-pack", "study-notes", "lesson-scripts"]) {
      expect(existsSync(path.join(ROOT, "features/content-ir/kinds", `${retired}.ts`))).toBe(false);
    }
  });

  it("every kind the web knew before the switch keeps every facet", () => {
    const now = census();
    const lost = Object.keys(BEFORE.kinds).filter((k) => !(k in now));
    expect(lost).toEqual([]);
    const drifted: string[] = [];
    for (const [kind, facets] of Object.entries(BEFORE.kinds)) {
      for (const [facet, value] of Object.entries(facets)) {
        const got = (now[kind] as Record<string, unknown> | undefined)?.[facet];
        if (JSON.stringify(got) !== JSON.stringify(value)) drifted.push(`${kind}.${facet}: ${JSON.stringify(value)} -> ${JSON.stringify(got)}`);
      }
    }
    expect(drifted).toEqual([]);
  });

  it("every block type keeps its renderer (flashcards and quiz fall back to the package's views)", () => {
    const changed = Object.entries(BEFORE.dispatch)
      .map(([type, before]) => ({ type, expected: PACKAGE_VIEW_TYPES.has(type) ? "other" : before, now: dispatchClass(type) }))
      .filter((row) => row.now !== row.expected);
    expect(changed).toEqual([]);
  });

  it("a chat answer with a flashcard_set and a quiz_set draws every control it drew before", async () => {
    const flash = await draw("Here:\n\n```json\n" + JSON.stringify(FLASH) + "\n```\n");
    const quiz = await draw("Here:\n\n```json\n" + JSON.stringify(QUIZ) + "\n```\n");
    expect(flash.attrs).toContain("data-kind-record-host=flashcard_set");
    expect(quiz.attrs).toContain("data-kind-record-host=quiz_set");
    expect(flash.attrs.some((a) => a.startsWith("data-kind-stand-in"))).toBe(false);
    expect(quiz.attrs.some((a) => a.startsWith("data-kind-stand-in"))).toBe(false);
    expect(flash.buttons).toEqual(BEFORE.render.flashcard_set.buttons);
    expect(quiz.buttons).toEqual(BEFORE.render.quiz_set.buttons);
  });
});
