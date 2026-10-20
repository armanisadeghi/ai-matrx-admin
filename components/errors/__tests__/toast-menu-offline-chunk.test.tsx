/** @jest-environment jsdom */
// AT-FIX-I: an error toast's copy menu loads through one async edge. Offline that chunk cannot arrive, and the
// failure must stay in the toast's slot (nothing drawn) instead of reaching the page's error boundary.
import React, { act } from "react";
import { createRoot } from "react-dom/client";

jest.mock("@/components/errors/ErrorAlchemyMenu", () => {
  const error = new Error("Failed to load chunk /_next/static/chunks/menu.js");
  error.name = "ChunkLoadError";
  throw error;
});

import { decorateErrorToast } from "../errorToastAlchemy";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class Page extends React.Component<{ children: React.ReactNode }, { hit: boolean }> {
  state = { hit: false };
  static getDerivedStateFromError() {
    return { hit: true };
  }
  render() {
    return this.state.hit ? <h1 data-testid="page-error" /> : this.props.children;
  }
}

it("a toast whose copy menu cannot load draws nothing there and keeps the page", async () => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  const out = decorateErrorToast("The usage read failed", undefined, undefined);
  const host = document.createElement("div");
  const root = createRoot(host);
  await act(async () => root.render(<Page><p data-testid="page">page</p>{out.action as React.ReactNode}</Page>));
  for (let i = 0; i < 5; i += 1) await act(async () => new Promise((r) => setTimeout(r, 0)));
  expect(host.querySelector('[data-testid="page-error"]')).toBeNull();
  expect(host.querySelector('[data-testid="page"]')).not.toBeNull();
  await act(async () => root.unmount());
  jest.restoreAllMocks();
});
