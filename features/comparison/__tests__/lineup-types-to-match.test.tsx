import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { ComparisonKindInfo, LookupMatch } from "../contract";
import { Lineup } from "../components/Lineup";
import { newRow, startRows, type CompareRow } from "../rows";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockResolveRow = jest.fn();
jest.mock("../discovery", () => ({ ...jest.requireActual("../discovery"), resolveRow: (...a: unknown[]) => mockResolveRow(...a) }));
jest.mock("../server", () => ({ lookupItems: jest.fn(), quoteComparison: jest.fn(async () => ({})) }));
jest.mock("@/components/official/ProInput", () => ({
  ProInput: ({ wrapperClassName: _w, ...p }: Record<string, unknown>) => <input {...(p as object)} />,
}));
jest.mock("../facet-choice", () => ({ useFacetKeys: () => [] }));

const match: LookupMatch = {
  item: { label: "Opti-Club", url: "https://maps/x" }, name: "Opti-Club", detail: "Pensacola", website: "opti-club.com",
  url: "https://maps/x", logo_url: null, rating: 4.8, reviews_count: 341,
} as LookupMatch;

const kind = { key: "local_business", label: "Local businesses" } as unknown as ComparisonKindInfo;

function Harness({ initial }: { initial?: CompareRow[] } = {}) {
  const [rows, setRows] = useState<CompareRow[]>(initial ?? startRows());
  return (
    <QueryClientProvider client={new QueryClient()}>
      <Lineup kind={kind} rows={rows} onRows={(f) => setRows(f)} near="" onNear={() => {}} organizationId="o"
        onCompare={() => {}} />
    </QueryClientProvider>
  );
}

function type(el: HTMLInputElement, value: string) {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  set.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("a card matches while the person is still typing", () => {
  beforeEach(() => { jest.useFakeTimers(); mockResolveRow.mockReset(); });
  afterEach(() => { jest.useRealTimers(); });

  it("matches ~400 ms after the last keystroke, with focus still in the last field", async () => {
    mockResolveRow.mockResolvedValue({ status: "found", match, category: "Eye care center", candidates: [], message: null });
    const host = document.createElement("div");
    document.body.appendChild(host);
    await act(async () => { createRoot(host).render(<Harness />); });
    const name = host.querySelector<HTMLInputElement>('input[aria-label="Business name 1"]')!;
    const city = host.querySelector<HTMLInputElement>('input[aria-label="City 1"]')!;
    city.focus();
    await act(async () => { type(name, "Opti-Club"); type(city, "Pensacola FL"); });
    await act(async () => { await jest.advanceTimersByTimeAsync(300); });
    expect(mockResolveRow).not.toHaveBeenCalled(); // still inside the pause
    await act(async () => { await jest.advanceTimersByTimeAsync(150); });
    expect(mockResolveRow).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain("Matched");
    expect(host.textContent).toContain("Opti-Club");
  });

  it("keeps typing from searching on every key, and a half-filled card does not search", async () => {
    mockResolveRow.mockResolvedValue({ status: "found", match, category: "", candidates: [], message: null });
    const host = document.createElement("div");
    document.body.appendChild(host);
    await act(async () => { createRoot(host).render(<Harness />); });
    const name = host.querySelector<HTMLInputElement>('input[aria-label="Business name 1"]')!;
    await act(async () => { type(name, "Opt"); });
    await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
    expect(mockResolveRow).not.toHaveBeenCalled(); // a place needs where it is, too
  });

  it("an unclear answer shows as soon as it lands, with no blur needed (the last card never waits for a click)", async () => {
    mockResolveRow.mockResolvedValue({ status: "not_found", match: null, category: "", candidates: [], message: "No match for Zed." });
    const host = document.createElement("div");
    document.body.appendChild(host);
    await act(async () => { createRoot(host).render(<Harness />); });
    const name = host.querySelector<HTMLInputElement>('input[aria-label="Business name 1"]')!;
    const city = host.querySelector<HTMLInputElement>('input[aria-label="City 1"]')!;
    await act(async () => { type(name, "Zed"); type(city, "Reno"); });
    await act(async () => { await jest.advanceTimersByTimeAsync(500); });
    expect(mockResolveRow).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain("No match for Zed.");
  });

  it("the second card matches on its own pause while the first is still answering, and the bar says it is matching", async () => {
    let release: (v: unknown) => void = () => {};
    mockResolveRow
      .mockImplementationOnce(() => new Promise((r) => { release = r; }))
      .mockResolvedValue({ status: "found", match, category: "", candidates: [], message: null });
    const host = document.createElement("div");
    document.body.appendChild(host);
    await act(async () => { createRoot(host).render(<Harness />); });
    const q = (l: string) => host.querySelector<HTMLInputElement>(`input[aria-label="${l}"]`)!;
    await act(async () => { type(q("Business name 1"), "Opti-Club"); type(q("City 1"), "Pensacola FL"); });
    await act(async () => { await jest.advanceTimersByTimeAsync(450); });
    expect(host.textContent).toContain("Matching"); // card 1 is in flight
    await act(async () => { type(q("Business name 2"), "Eye Care Center"); type(q("City 2"), "Pensacola FL"); });
    await act(async () => { await jest.advanceTimersByTimeAsync(450); });
    expect(mockResolveRow).toHaveBeenCalledTimes(2); // card 2 asked without any blur
    await act(async () => { release({ status: "found", match, category: "", candidates: [], message: null }); });
  });

  it("Compare answers a click while another card is still matching (live: a click did nothing for 25 s)", async () => {
    const onCompare = jest.fn();
    const found = (key: string) => newRow({ key, name: "Opti-Club", state: "found", match });
    const host = document.createElement("div");
    document.body.appendChild(host);
    function Two() {
      const [rows, setRows] = useState<CompareRow[]>([found("a"), found("b"), newRow({ key: "c", name: "Zed", state: "resolving" })]);
      return (
        <QueryClientProvider client={new QueryClient()}>
          <Lineup kind={kind} rows={rows} onRows={(f) => setRows(f)} near="" onNear={() => {}} organizationId="o"
            onCompare={onCompare} />
        </QueryClientProvider>
      );
    }
    await act(async () => { createRoot(host).render(<Two />); });
    await act(async () => { await jest.advanceTimersByTimeAsync(50); });
    const button = host.querySelector<HTMLButtonElement>("[data-compare-confirm-button]")!;
    expect(button.disabled).toBe(false);
    await act(async () => { button.click(); });
    expect(onCompare).toHaveBeenCalledTimes(1);
  });
});
