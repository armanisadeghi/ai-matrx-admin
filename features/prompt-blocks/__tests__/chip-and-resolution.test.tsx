import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { HighlightedText } from "@/features/agents/components/variables-management/HighlightedText";
import { winningRowId } from "../blocksCache";
import { SYSTEM_ORG_ID } from "../lanes";
import { blockLevelLabel } from "@/features/agents/components/model-view/modelViewLogic";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLElement;
beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
});
afterEach(() => host.remove());

function render(node: React.ReactElement) {
  act(() => createRoot(host).render(node));
}
const screen = {
  getByTestId: (id: string) => {
    const el = host.querySelector(`[data-testid="${id}"]`);
    if (!el) throw new Error(`no ${id}`);
    return el as HTMLElement;
  },
  queryByTestId: (id: string) => host.querySelector(`[data-testid="${id}"]`),
  getByText: (re: RegExp) => ({ textContent: host.textContent?.match(re) ? "x" : null }),
};
const fireEvent = { click: (el: HTMLElement) => act(() => void el.dispatchEvent(new MouseEvent("click", { bubbles: true }))) };

const row = (id: string, organization_id: string, visibility: string, created_by: string | null, name = "rules") =>
  ({ id, name, organization_id, visibility, created_by }) as never;

describe("block chips in the prompt", () => {
  const open = jest.fn();
  const blocks = { declared: new Set(["rules", "gone"]), missing: new Set(["gone"]), onOpen: open };

  it("draws declared, missing and undeclared tokens apart, leaves variables and escaped examples alone", () => {
    render(<HighlightedText text="A {{<rules>}} B {{<gone>}} C {{<stray>}} D {{topic}} E {{!<keep>}}" validVariables={["topic"]} blocks={blocks} />);
    expect(screen.getByTestId("prompt-block-chip-rules").getAttribute("data-state")).toBe("ok");
    expect(screen.getByTestId("prompt-block-chip-gone").getAttribute("data-state")).toBe("missing");
    expect(screen.getByTestId("prompt-block-chip-gone").textContent).toMatch(/Missing/);
    expect(screen.getByTestId("prompt-block-chip-stray").getAttribute("data-state")).toBe("undeclared");
    expect(screen.queryByTestId("prompt-block-chip-keep")).toBeNull();
    expect(host.textContent).toContain("{{!<keep>}}");
  });

  it("clicking a chip opens its panel target", () => {
    render(<HighlightedText text="{{<rules>}}" blocks={blocks} />);
    fireEvent.click(screen.getByTestId("prompt-block-chip-rules"));
    expect(open).toHaveBeenCalledWith("rules", expect.anything());
  });

  it("without block support the token stays plain text", () => {
    render(<HighlightedText text="x {{<rules>}} y" />);
    expect(screen.queryByTestId("prompt-block-chip-rules")).toBeNull();
  });
});

describe("which block wins (the ladder the picker and panel show)", () => {
  const rows = [
    row("sys", SYSTEM_ORG_ID, "internal", null),
    row("org", "o1", "internal", "u2"),
    row("mine", "o1", "personal", "u1"),
  ];
  it("personal beats organization beats system", () => {
    expect(winningRowId(rows, "rules", "u1", SYSTEM_ORG_ID, "o1")).toBe("mine");
    expect(winningRowId(rows, "rules", "u9", SYSTEM_ORG_ID, "o1")).toBe("org");
    expect(winningRowId([rows[0]], "rules", "u9", SYSTEM_ORG_ID, "o1")).toBe("sys");
    expect(winningRowId(rows, "other", "u1", SYSTEM_ORG_ID, "o1")).toBeNull();
  });
  it("another organization's block never wins for this run", () => {
    expect(winningRowId([rows[1], rows[0]], "rules", "u9", SYSTEM_ORG_ID, "o2")).toBe("sys");
  });
  it("Model view names the level", () => {
    expect(blockLevelLabel("personal")).toBe("Mine");
    expect(blockLevelLabel("system")).toBe("System");
    expect(blockLevelLabel("weird")).toBe("weird");
  });
});
