/**
 * A signed-out person opening an Anyone link to a workbook sees the workbook BY NAME with its sheet
 * content - not a card titled "Workbook". Proven failing first: with no workbook lens the generic
 * floor renders the type label and none of the cells.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { resolveShareLens } from "../registry";
import type { ResolvedShareToken } from "@/utils/permissions/shareLinks";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function render(result: ResolvedShareToken): string {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const Lens = resolveShareLens(result.resourceType);
  act(() => root.render(<>{Lens({ result, token: "t" })}</>));
  const text = host.textContent ?? "";
  act(() => root.unmount());
  host.remove();
  return text;
}

const snapshot = {
  sheetOrder: ["s1"],
  sheets: { s1: { name: "Revenue", cellData: { 0: { 0: { v: "Region" }, 1: { v: "Q3" } }, 1: { 0: { v: "West" }, 1: { v: 42 } } } } },
};

describe("workbook share lens", () => {
  it("shows the workbook name and its cells", () => {
    const text = render({
      success: true,
      resourceType: "workbook",
      displayLabel: "Workbook",
      resource: { workbook_name: "Sweep review copy", description: "d" },
      children: { kind: "workbook_snapshot", snapshot },
    });
    expect(text).toContain("Sweep review copy");
    expect(text).toContain("Revenue");
    expect(text).toContain("West");
    expect(text).toContain("42");
  });

  it("says when the content is too large instead of showing a blank", () => {
    const text = render({
      success: true,
      resourceType: "workbook",
      resource: { workbook_name: "Big one" },
      children: { kind: "workbook_snapshot", too_large: true },
    });
    expect(text).toContain("Big one");
    expect(text).toMatch(/too large/);
  });
});
