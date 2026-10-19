/**
 * @jest-environment jsdom
 */
// ChunkTolerant swallows a chunk-load failure and nothing else: a real bug still reaches the boundary above.
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ChunkTolerant } from "../ChunkTolerant";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class Above extends React.Component<{ children: React.ReactNode }, { hit: boolean }> {
  state = { hit: false };
  static getDerivedStateFromError() {
    return { hit: true };
  }
  render() {
    return this.state.hit ? <b data-testid="above" /> : this.props.children;
  }
}
const Boom = ({ error }: { error: Error }): never => {
  throw error;
};

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  jest.restoreAllMocks();
});

it("swallows a ChunkLoadError", () => {
  const e = Object.assign(new Error("Failed to load chunk x.js"), { name: "ChunkLoadError" });
  act(() => root.render(<Above><ChunkTolerant what="x"><Boom error={e} /></ChunkTolerant></Above>));
  expect(container.querySelector('[data-testid="above"]')).toBeNull();
});

it("re-throws any other error to the boundary above", () => {
  act(() => root.render(<Above><ChunkTolerant what="x"><Boom error={new Error("real bug")} /></ChunkTolerant></Above>));
  expect(container.querySelector('[data-testid="above"]')).not.toBeNull();
});
