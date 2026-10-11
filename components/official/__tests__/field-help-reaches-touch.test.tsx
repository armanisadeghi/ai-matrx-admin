import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Field } from "../Field";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// Arman, 2026-10-10: tooltips always — and a tooltip a phone cannot open is no tooltip.
// A string `help` must render through InfoHint (hover, keyboard AND tap), never the
// hover-only Radix tooltip it used before.
describe("Field — string help is reachable on touch", () => {
  let host: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("renders the InfoHint trigger named after the label", () => {
    act(() =>
      root.render(
        <Field label="Slug" htmlFor="s" help="Lowercase, no spaces.">
          <input id="s" />
        </Field>,
      ),
    );
    expect(host.querySelector('[aria-label="About Slug"]')).not.toBeNull();
    expect(host.querySelector('[aria-label="Help"]')).toBeNull();
  });
});
