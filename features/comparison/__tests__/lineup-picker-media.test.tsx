import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { ComparisonKindInfo, LookupMatch } from "../contract";
import { Lineup } from "../components/Lineup";
import { newRow, startRows, type CompareRow } from "../rows";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("../server", () => ({ lookupItems: jest.fn(), quoteComparison: jest.fn(async () => ({})) }));
jest.mock("@/components/official/ProInput", () => ({
  ProInput: ({ wrapperClassName: _w, ...p }: Record<string, unknown>) => <input {...(p as object)} />,
}));
jest.mock("../facet-choice", () => ({ useFacetKeys: () => [] }));

const match = {
  item: { label: "Opti-Club", url: "https://maps/x" }, name: "Opti-Club", detail: "Pensacola", website: "opti-club.com",
  url: "https://maps/x", logo_url: null, rating: 4.8, reviews_count: 341,
} as LookupMatch;
const kind = { key: "local_business", label: "Local businesses" } as unknown as ComparisonKindInfo;

function Harness({ initial }: { initial: CompareRow[] }) {
  const [rows, setRows] = useState<CompareRow[]>(initial);
  return (
    <QueryClientProvider client={new QueryClient()}>
      <Lineup kind={kind} rows={rows} onRows={(f) => setRows(f)} near="" onNear={() => {}} organizationId="o"
        onCompare={() => {}} />
    </QueryClientProvider>
  );
}

describe("the pick list and the add tile (owner, 2026-10-22: the images need to be bigger)", () => {
  it("each candidate row is one button with a 48px picture and a star + number rating", async () => {
    const choose = newRow({ name: "Opti", city: "Pensacola", state: "choose", candidates: [{ match, category: "Eye care center" }], message: null });
    const host = document.createElement("div");
    document.body.appendChild(host);
    await act(async () => { createRoot(host).render(<Harness initial={[choose, newRow()]} />); });
    const row = host.querySelector<HTMLElement>("[data-media-option]")!;
    expect(row).not.toBeNull();
    expect(row.tagName).toBe("BUTTON");
    const pic = row.querySelector<HTMLElement>("[data-media-option-media]")!;
    expect(pic.style.width).toBe("48px");
    expect(pic.querySelector<HTMLElement>("span[style*='width: 48px']")).not.toBeNull(); // the picture itself, not 20px
    expect(row.querySelector("svg")).not.toBeNull(); // the star icon
    expect(row.textContent).toContain("4.8");
    expect(row.textContent).not.toContain("★");
  });

  it("the whole dashed add tile is one button that adds a card", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    await act(async () => { createRoot(host).render(<Harness initial={startRows()} />); });
    const tile = host.querySelector<HTMLButtonElement>("[data-add-tile]")!;
    expect(tile.tagName).toBe("BUTTON");
    expect(tile.className).toContain("border-dashed");
    const before = host.querySelectorAll("ol > li").length;
    await act(async () => { tile.click(); });
    expect(host.querySelectorAll("ol > li").length).toBe(before + 1);
  });
});
