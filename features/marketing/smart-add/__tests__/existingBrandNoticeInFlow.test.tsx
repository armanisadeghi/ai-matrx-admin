/** @jest-environment jsdom */
/**
 * MKT-121: under the entry field the "You already have …" notice sits IN FLOW, so it can never float over
 * "Review web results" (or any control below it). Above the Create bar it is in flow inside the bar's sticky box.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ExistingBrandNotice } from "../ExistingBrandNotice";

jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@ai-matrx/design-system/controls", () => ({ Button: (p: { children: React.ReactNode }) => <button>{p.children}</button> }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const match = { brand: { id: "b1", slug: "taqueria", name: "Taqueria Mixteca" }, detail: null } as never;

function render(placement: "above" | "below") {
  const host = document.createElement("div");
  document.body.appendChild(host);
  act(() => createRoot(host).render(<ExistingBrandNotice placement={placement} matches={[match]} onAddTo={() => {}} onSeparate={() => {}} />));
  return host.querySelector('[data-testid="existing-brand-notice"]') as HTMLElement;
}

describe("ExistingBrandNotice placement", () => {
  it("below the entry field it is in flow, not absolutely positioned over the page", () => {
    const n = render("below");
    expect(n.className).toContain("relative");
    expect(n.className).not.toContain("absolute");
  });
  it("above the Create bar it is in flow too, so the page can scroll clear of it", () => {
    const n = render("above");
    expect(n.className).toContain("relative");
    expect(n.className).not.toContain("absolute");
  });
});
