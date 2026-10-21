/** @jest-environment jsdom */
/**
 * Round 3: "Create a separate brand" is never a silent press. While it works the button is disabled with a spinner
 * (so a second press cannot double it) and says it is creating; at rest it is the plain, pressable button.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ExistingBrandNotice } from "../ExistingBrandNotice";

jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@ai-matrx/design-system/controls", () => ({
  Button: (p: { children: React.ReactNode; disabled?: boolean; onClick?: () => void; "data-testid"?: string }) => (
    <button disabled={p.disabled} onClick={p.onClick} data-testid={p["data-testid"]}>{p.children}</button>
  ),
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const match = { brand: { id: "b1", slug: "t", name: "Taqueria" }, detail: null } as never;

function render(separating: boolean, onSeparate = () => {}) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  act(() => createRoot(host).render(<ExistingBrandNotice placement="above" matches={[match]} onAddTo={() => {}} onSeparate={onSeparate} separating={separating} />));
  return host.querySelector('[data-testid="existing-brand-separate"]') as HTMLButtonElement;
}

describe("Create a separate brand shows pending", () => {
  it("is pressable at rest and calls onSeparate", () => {
    const fn = jest.fn();
    const b = render(false, fn);
    expect(b.disabled).toBe(false);
    act(() => b.click());
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it("while working it is disabled, spinning and says Creating", () => {
    const fn = jest.fn();
    const b = render(true, fn);
    expect(b.disabled).toBe(true);
    expect(b.textContent).toContain("Creating");
    expect(b.querySelector("svg")).not.toBeNull();
    act(() => b.click());
    expect(fn).not.toHaveBeenCalled();
  });
});
