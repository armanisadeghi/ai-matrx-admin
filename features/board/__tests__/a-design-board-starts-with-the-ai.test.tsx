// A NEW DESIGN SYSTEM BOARD STARTS WITH THE AI (Arman 2026-10-21/22, smart-add-brand VISION Parts 30-31): two ways
// to start, AI first. SUT: `DesignBoardStartDialog`: its primary press is "Create" (no "Build with AI" step, no
// box to type in: the agent talks first once the board opens); "Start from a style" is the second way, a list of
// the reference styles.

import { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@ai-matrx/design-system", () => ({
  Dialog: ({ open, children }: { open: boolean; children: unknown }) => (open ? <div>{children as never}</div> : null),
  DialogContent: ({ children, showCloseButton, ...rest }: { children: unknown; showCloseButton?: boolean } & Record<string, unknown>) => (
    <div {...(rest as object)} data-close={showCloseButton === false ? "hidden" : "shown"}>{children as never}</div>
  ),
  DialogHeader: ({ children }: { children: unknown }) => <div>{children as never}</div>,
  DialogFooter: ({ children }: { children: unknown }) => <div>{children as never}</div>,
  DialogTitle: ({ children }: { children: unknown }) => <h2>{children as never}</h2>,
  DialogDescription: ({ children }: { children: unknown }) => <p>{children as never}</p>,
  ShimmerText: ({ text }: { text: string }) => <span data-shimmer="">{text}</span>,
}));
jest.mock("@ai-matrx/design-system/controls", () => ({
  Button: ({ children, variant, onClick, disabled }: { children: unknown; variant?: string; onClick?: () => void; disabled?: boolean }) => (
    <button data-variant={variant} onClick={onClick} disabled={disabled}>
      {children as string}
    </button>
  ),
  RegionSkeleton: () => <div aria-busy="true" />,
  StageSteps: ({ steps, current }: { steps: { id: string; label: string }[]; current: number }) => (
    <ol>
      {steps.map((st, i) => (
        <li key={st.id} data-state={i < current ? "done" : i === current ? "current" : "upcoming"}>
          {st.label}
        </li>
      ))}
    </ol>
  ),
}));
jest.mock("@/components/official/ProInput", () => ({
  ProInput: (p: { value: string; onChange: (e: { target: { value: string } }) => void }) => <input data-testid="name" value={p.value} onChange={p.onChange} />,
}));
jest.mock("@/features/marketing/components/brands/BrandPicker", () => ({ BrandPicker: () => <div data-testid="brand" /> }));
const listBoardStyles = jest.fn(async () => [{ templateId: "tpl-calm", name: "Calm neutral", forWho: "Software products and SaaS teams" }]);
jest.mock("../templates/board-packs", () => ({ listBoardStyles: (...a: unknown[]) => listBoardStyles(...(a as [])) }));
jest.mock("../templates/board-start", () => ({}));

import { DesignBoardStartDialog, type DesignBoardProgress } from "../templates/design-start";

async function mount(onStart: jest.Mock, progress: DesignBoardProgress | null = null) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () =>
    root.render(<DesignBoardStartDialog open onOpenChange={() => undefined} packKey="pack:t1" defaultName="Acme design system" onStart={onStart} progress={progress} />),
  );
  return host;
}
const buttons = (host: HTMLElement) => Array.from(host.querySelectorAll("button"));

describe("a new design system board starts with the AI", () => {
  it("the primary press is Create: the AI builds it, nothing to type and no Build with AI step", async () => {
    const onStart = jest.fn();
    const host = await mount(onStart);
    const primary = buttons(host).filter((b) => b.dataset.variant === "primary");
    expect(primary.map((b) => b.textContent)).toEqual(["Create"]);
    expect(buttons(host).map((b) => b.textContent)).toEqual(["Start from a style", "Create"]);
    expect(host.querySelector("textarea")).toBeNull();
    expect(host.textContent).not.toContain("Build with AI");
    await act(async () => primary[0].click());
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ name: "Acme design system", mode: "ai" }));
    expect(onStart.mock.calls[0][0]).not.toHaveProperty("brief");
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
    expect(onStart).toHaveBeenCalledWith({ name: "Acme design system", mode: "style", styleTemplateId: "tpl-calm", styleName: "Calm neutral", brandId: null });
  });

  it("after the press the dialog shows the work in place, never a frozen form", async () => {
    const host = await mount(jest.fn(), { mode: "ai", step: "board", detail: null });
    expect(buttons(host)).toEqual([]);
    expect(host.querySelector("textarea")).toBeNull();
    // Nothing to close while it builds: the box carries no close control.
    expect(host.querySelector("[data-building]")!.getAttribute("data-close")).toBe("hidden");
    const stages = Array.from(host.querySelectorAll("li")).map((li) => [li.textContent, li.dataset.state]);
    expect(stages).toEqual([
      ["Making the board", "current"],
      ["Starting the design agent", "upcoming"],
    ]);
    expect(host.querySelector("[data-shimmer]")!.textContent).toBe("Making the board…");
    const next = await mount(jest.fn(), { mode: "ai", step: "start" });
    expect(next.querySelector("[data-shimmer]")!.textContent).toBe("Starting the design agent…");
    expect(Array.from(next.querySelectorAll("li")).map((li) => li.dataset.state)).toEqual(["done", "current"]);
  });

  it("a double press on Create starts ONE board: the second click in the same tick does nothing", async () => {
    const onStart = jest.fn();
    const host = await mount(onStart);
    const create = buttons(host).find((b) => b.textContent === "Create")!;
    await act(async () => {
      create.click();
      create.click();
    });
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(create.disabled).toBe(true);
  });
});
