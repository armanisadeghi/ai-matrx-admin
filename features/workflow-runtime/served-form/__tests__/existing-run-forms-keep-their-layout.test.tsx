/** @jest-environment jsdom */
//
// "Nothing should have ever changed for active things" (Arman). The server stamps
// layout "simple" on every run-form response, so an existing workflow's form
// must stay the stacked cards unless the HOST opts in to the one-box layout.

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

jest.mock("@ai-matrx/chat/mandates/invoke/SimpleBoxForm", () => ({
  SimpleBoxForm: () => <div data-testid="one-box" />,
}));
jest.mock("../ServedInputFields", () => ({
  EMPTY_SERVED_INPUTS: [],
  ServedFieldControl: () => null,
  ServedFormScream: () => null,
  ServedInputFields: () => <div data-testid="stacked" />,
  useServedInputKinds: () => ({ kinds: {}, kindError: null }),
  useServedInputValues: () => ({ values: {}, setValue: () => undefined }),
}));
jest.mock("../useServedRunForm", () => ({
  useServedRunForm: () => ({ status: "loading" }),
  useServedRunStart: () => ({ starting: false, start: async () => ({ status: "error", message: "x" }) }),
}));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));

import { ServedRunForm } from "../ServedRunForm";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const state = {
  status: "ready",
  form: {
    surfaceServed: true,
    derivedFromSections: false,
    inputs: [],
    hints: { displayNoun: "", submitLabel: "", layout: "simple" },
  },
} as never;

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

test("an existing workflow run form stays stacked even when the server says simple", () => {
  act(() => root.render(<ServedRunForm definitionId="d" state={state} onStarted={() => undefined} />));
  expect(host.querySelector('[data-testid="stacked"]')).not.toBeNull();
  expect(host.querySelector('[data-testid="one-box"]')).toBeNull();
});

test("a surface that opts in gets the one-box layout", () => {
  act(() =>
    root.render(<ServedRunForm definitionId="d" state={state} layout="simple" onStarted={() => undefined} />),
  );
  expect(host.querySelector('[data-testid="one-box"]')).not.toBeNull();
});
