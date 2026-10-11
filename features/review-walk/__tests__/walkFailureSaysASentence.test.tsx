/**
 * A walk opened from a candidate pair never prints the raw server error (it can
 * carry an internal account id); it speaks the pair window's sentence and keeps
 * the raw text behind the error-details affordance.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));

import { RecordedStepError } from "../components/RecordedStepError";

const RAW = "Run refused: protected account 87a6e699-3622-4869-8843-d0867456c0dd cannot be billed";
const ERROR = { code: "protected_account_run_refused", message: RAW };

let container: HTMLDivElement;
let root: Root | null = null;
function mount(detailLabel: string | null) {
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
    root.render(<RecordedStepError error={ERROR} detailLabel={detailLabel} />);
  });
}
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container?.remove();
});

describe("walk failure state for candidate runs", () => {
  it("says 'Not run: <reason>' and keeps the raw text out of the visible window", () => {
    mount("Pair 3 · 14:05");
    expect(container.textContent).toContain("Not run: this account can't be billed for background runs");
    expect(container.textContent).not.toMatch(/87a6e699/);
  });

  it("the walk window renders the shared component", () => {
    const src = readFileSync("features/review-walk/components/ReviewWalkWindow.tsx", "utf8");
    expect(src).toMatch(/<RecordedStepError/);
    expect(src).not.toMatch(/This step recorded an error/);
  });
});
