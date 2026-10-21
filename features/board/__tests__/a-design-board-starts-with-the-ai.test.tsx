// A NEW DESIGN SYSTEM BOARD STARTS WITH THE AI (Arman 2026-10-21, smart-add-brand VISION Part 30): two ways to
// start, AI first. SUT: `DesignBoardStartDialog`: its primary press is "Build with AI" and hands the person's
// own words as typed; "Start from a style" is the second way, a list of the reference styles. And the opened
// board runs the kept start once (`takeBoardStart`). RED before: the gallery asked only for a name and made a
// board full of a starter's rows.

import { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@ai-matrx/design-system", () => ({
  Dialog: ({ open, children }: { open: boolean; children: unknown }) => (open ? <div>{children as never}</div> : null),
  DialogContent: ({ children }: { children: unknown }) => <div>{children as never}</div>,
  DialogHeader: ({ children }: { children: unknown }) => <div>{children as never}</div>,
  DialogFooter: ({ children }: { children: unknown }) => <div>{children as never}</div>,
  DialogTitle: ({ children }: { children: unknown }) => <h2>{children as never}</h2>,
  DialogDescription: ({ children }: { children: unknown }) => <p>{children as never}</p>,
}));
jest.mock("@ai-matrx/design-system/controls", () => ({
  Button: ({ children, variant, onClick, disabled }: { children: unknown; variant?: string; onClick?: () => void; disabled?: boolean }) => (
    <button data-variant={variant} onClick={onClick} disabled={disabled}>
      {children as string}
    </button>
  ),
  RegionSkeleton: () => <div aria-busy="true" />,
}));
jest.mock("@/components/official/ProInput", () => ({
  ProInput: (p: { value: string; onChange: (e: { target: { value: string } }) => void }) => <input data-testid="name" value={p.value} onChange={p.onChange} />,
}));
jest.mock("@/components/official/ProTextarea", () => ({
  ProTextarea: (p: { value: string; onChange: (e: { target: { value: string } }) => void }) => <textarea data-testid="brief" value={p.value} onChange={p.onChange} />,
}));
const listBoardStyles = jest.fn(async () => [{ templateId: "tpl-calm", name: "Calm neutral", forWho: "Software products and SaaS teams" }]);
jest.mock("../templates/board-packs", () => ({ listBoardStyles: (...a: unknown[]) => listBoardStyles(...(a as [])) }));
jest.mock("../templates/open-design-build", () => ({}));

import { DesignBoardStartDialog } from "../templates/design-start";

async function mount(onStart: jest.Mock) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<DesignBoardStartDialog open onOpenChange={() => undefined} packKey="pack:t1" defaultName="Acme design system" onStart={onStart} />));
  return host;
}
const buttons = (host: HTMLElement) => Array.from(host.querySelectorAll("button"));

describe("a new design system board starts with the AI", () => {
  it("the primary press is Build with AI and sends the person's words as typed", async () => {
    const onStart = jest.fn();
    const host = await mount(onStart);
    const primary = buttons(host).filter((b) => b.dataset.variant === "primary");
    expect(primary.map((b) => b.textContent)).toEqual(["Build with AI"]);
    expect(buttons(host).map((b) => b.textContent)).toEqual(["Start from a style", "Build with AI"]);
    const brief = host.querySelector("textarea")!;
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
      set.call(brief, "A family bakery in Austin");
      brief.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => primary[0].click());
    expect(onStart).toHaveBeenCalledWith({ name: "Acme design system", mode: "ai", brief: "A family bakery in Austin" });
  });

  it("Start from a style is the second way: a list of styles, then Use style", async () => {
    const onStart = jest.fn();
    const host = await mount(onStart);
    await act(async () => buttons(host).find((b) => b.textContent === "Start from a style")!.click());
    await act(async () => new Promise((r) => setTimeout(r, 0)));
    expect(listBoardStyles).toHaveBeenCalledWith("pack:t1");
    const style = host.querySelector('[role="radio"]') as HTMLButtonElement;
    expect(style.textContent).toContain("Calm neutral");
    await act(async () => style.click());
    await act(async () => buttons(host).find((b) => b.textContent === "Use style")!.click());
    expect(onStart).toHaveBeenCalledWith({ name: "Acme design system", mode: "style", styleTemplateId: "tpl-calm", styleName: "Calm neutral" });
  });
});
