/**
 * @jest-environment jsdom
 *
 * THE QUESTIONNAIRE'S DEBUG TOGGLE IS ADMIN-ONLY AND STAYS INSIDE THE BLOCK.
 * Until 2026-10-16 every questionnaire rendered a "Show Debug View" bug button
 * for every person, pinned `fixed top-10 left-4` — so on /chat it floated over
 * the sidebar rail's Search icon. It now shows only while the admin debug switch
 * is on, and never with a fixed position.
 *
 * Use case: a florist answers a two-question intake an agent asked before pricing a wedding order.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const dispatch = jest.fn();
jest.mock("@/lib/redux/hooks", () => ({ useAppDispatch: () => dispatch }));

import QuestionnaireRenderer from "../QuestionnaireRenderer";
import { separatedMarkdownParser } from "@/components/mardown-display/markdown-classification/processors/custom/parser-separated";

const BODY = [
  "## Q1: How many arrangements does the wedding need?",
  "Type: Input",
  "",
  "## Q2: Which flowers are a must?",
  "Type: Checkbox",
  "- Peonies",
  "- Garden roses",
].join("\n");

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function storeWithDebug(isDebugMode: boolean) {
  return configureStore({
    reducer: { adminDebug: (state = { isDebugMode, indicators: {}, debugData: {} }) => state },
  });
}

async function renderQuestionnaire(isDebugMode: boolean | null) {
  const block = (
    <QuestionnaireRenderer
      data={separatedMarkdownParser(BODY) as never}
      questionnaireId="florist-intake"
      conversationId="florist-chat"
      messageId="answer-3"
      blockIndex={0}
    />
  );
  await act(async () =>
    root.render(isDebugMode === null ? block : <Provider store={storeWithDebug(isDebugMode)}>{block}</Provider>),
  );
  return container.querySelector('[aria-label="Show Debug View"]');
}

it("shows no debug toggle to a person without the admin debug switch", async () => {
  expect(await renderQuestionnaire(false)).toBeNull();
});

it("shows no debug toggle in a host with no app store", async () => {
  expect(await renderQuestionnaire(null)).toBeNull();
});

it("shows the toggle inside the block, never fixed, while admin debug mode is on", async () => {
  const toggle = await renderQuestionnaire(true);
  expect(toggle).not.toBeNull();
  for (let el: Element | null = toggle; el && el !== container; el = el.parentElement) {
    expect(el.className).not.toMatch(/\bfixed\b/);
  }
});
