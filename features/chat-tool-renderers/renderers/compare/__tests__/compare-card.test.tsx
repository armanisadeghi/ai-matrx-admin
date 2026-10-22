/**
 * The `compare` chat card: the agent only finds and quotes, so a paid run starts ONLY from the
 * person's Confirm click; a reload follows the reserved run id; the finished card is compact.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const followRun = jest.fn();
const startChatComparison = jest.fn();

const quoteComparison = jest.fn(async () => ({ kind: "companies_reviews", kind_label: "Companies", item_count: 2,
  records_per_item: 10, total_records: 20, points_per_record: 3, total_points: 60, usd_per_record: null, total_usd: null,
  usd_per_record_display: null, total_usd_display: null, records_by_item: [10, 10], note: "" }));
jest.mock("@/features/comparison/server", () => ({
  followRun: (...a: unknown[]) => followRun(...a),
  quoteComparison: (...a: unknown[]) => (quoteComparison as (...x: unknown[]) => unknown)(...a),
  lookupItems: jest.fn(),
}));
jest.mock("@/components/official/ProInput", () => ({
  ProInput: ({ wrapperClassName: _w, ...p }: Record<string, unknown>) => <input {...(p as object)} />,
}));
jest.mock("@/features/comparison/hooks", () => ({
  useComparisonKinds: () => ({ isError: false, data: [
    { key: "companies_reviews", label: "Companies", status: "live", lookup_points: 0, facets: [] },
    { key: "local_business", label: "Local businesses", status: "live", lookup_points: 0, facets: [] },
  ] }),
}));
jest.mock("@/features/comparison/chat", () => ({ startChatComparison: (...a: unknown[]) => startChatComparison(...a) }));
jest.mock("@/components/cost/useCostDisplay", () => ({ useSeesDollars: () => false, useIsCostAdmin: () => false, useCostDisplay: () => ({ toPoints: (u: number | null | undefined) => (u == null ? null : u * 1000) }) }));
jest.mock("@/features/organizations/useOrganizationRequired", () => ({
  useOrganizationRequired: () => ({ organizationId: "org-1" }),
}));

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ComparisonRefusal, type ComparisonResult } from "@/features/comparison/contract";
import { CompareInline } from "../CompareInline";
import { parseCompare } from "../parseCompare";
import { comparePhaseLabels, compareInlineVisibility, setCompareRunPhase } from "../runStatus";

const REQUEST = { kind: "companies_reviews", items: [{ label: "Acme" }, { label: "Globex" }] };
const awaiting = {
  status: "awaiting_confirmation", kind: "companies_reviews", run_id: "11111111-1111-1111-1111-111111111111",
  request: REQUEST, lookup_points: 14,
  quote: { kind: "companies_reviews", kind_label: "Companies", item_count: 2, records_per_item: 10, total_records: 20,
    points_per_record: 3, total_points: 60 },
  found: [
    { typed: "acme", status: "found", name: "Acme", detail: "acme.com", website: "acme.com", rating: 4.2 },
    { typed: "globex", status: "found", name: "Globex", detail: "globex.com", website: "globex.com", rating: 3.1 },
  ],
  message: "Found 2 of 2.",
};
const entry = (result: unknown) => ({ callId: "c1", toolName: "compare", status: "completed", arguments: {}, result, events: [] }) as never;

function value(display: string, best: boolean) { return { value: Number.parseFloat(display), display, is_best: best, basis: "" }; }
const RESULT: ComparisonResult = {
  kind: "companies_reviews", kind_label: "Companies", status: "live", primary_field: "rating", notices: [],
  fields: [{ key: "rating", label: "Overall rating", type: "rating", direction: "higher_better", is_primary: true, help: "" }],
  items: [
    { item_id: "a", name: "Acme", rank: 1, website: "acme.com", logo_url: null, values: { rating: value("4.2", true) } },
    { item_id: "g", name: "Globex", rank: 2, website: "globex.com", logo_url: null, values: { rating: value("3.1", false) } },
  ] as never,
  total_records_billed: 20, total_cost_usd: 0.01, total_cost_display: "$0.01", total_points: 60, generated_at: null,
};

async function mount(result: unknown) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<QueryClientProvider client={new QueryClient()}>
      <CompareInline entry={entry(result)} expanded onToggleExpanded={() => {}} {...({} as object)} />
    </QueryClientProvider>);
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
  return host;
}
const confirmButton = (h: HTMLElement) => h.querySelector<HTMLButtonElement>("[data-compare-confirm-button]");

beforeEach(() => { followRun.mockReset(); startChatComparison.mockReset(); });

describe("parseCompare", () => {
  it("reads the quote, found list, reserved run id and the exact request", () => {
    const d = parseCompare(entry(awaiting));
    expect(d?.status).toBe("awaiting_confirmation");
    expect(d?.runId).toBe(awaiting.run_id);
    expect(d?.quote?.total_points).toBe(60);
    expect(d?.found.map((f) => f.name)).toEqual(["Acme", "Globex"]);
    expect(d?.request).toEqual(REQUEST);
  });
  it("is null while the call has no result", () => {
    expect(parseCompare(entry(null))).toBeNull();
  });
});

describe("no paid run before Confirm", () => {
  it("an unconfirmed card shows the lineup with Compare (the cost behind a door), and starts nothing on its own", async () => {
    followRun.mockRejectedValue(new ComparisonRefusal("not_found", "none"));
    const host = await mount(awaiting);
    expect(confirmButton(host)).not.toBeNull();
    expect(host.textContent).toContain("Acme");
    expect(host.textContent).not.toMatch(/60 points/);   // the quote prints only behind the Cost door
    expect(startChatComparison).not.toHaveBeenCalled();
  });

  it("the click starts exactly the quoted request under the reserved id, then follows it", async () => {
    followRun.mockRejectedValueOnce(new ComparisonRefusal("not_found", "none")).mockReturnValue(new Promise(() => {}));
    startChatComparison.mockResolvedValue(undefined);
    const host = await mount(awaiting);
    await act(async () => { confirmButton(host)?.click(); });
    expect(startChatComparison).toHaveBeenCalledTimes(1);
    expect(startChatComparison).toHaveBeenCalledWith(awaiting.run_id, REQUEST, { organizationId: "org-1" });
    expect(followRun).toHaveBeenCalledTimes(2); // the first look, then following the started run
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(host.querySelector("[data-compare-progress]")).not.toBeNull();
    expect(confirmButton(host)).toBeNull();
  });
});

describe("a concept search", () => {
  it("says how the list was found, still behind Confirm", async () => {
    followRun.mockRejectedValue(new ComparisonRefusal("not_found", "none"));
    const host = await mount({ ...awaiting, how_found: "Top results from a map search for bike shops near Bend.", guessed: false });
    expect(host.querySelector("[data-compare-how]")?.textContent).toContain("map search");
    expect(confirmButton(host)).not.toBeNull();
    expect(startChatComparison).not.toHaveBeenCalled();
  });
});

describe("a reload", () => {
  it("follows a run that already exists (no Confirm, no second start) and settles into the compact result", async () => {
    followRun.mockResolvedValue(RESULT);
    const host = await mount(awaiting);
    expect(startChatComparison).not.toHaveBeenCalled();
    expect(confirmButton(host)).toBeNull();
    const result = host.querySelector("[data-compare-result]");
    expect(result?.textContent).toContain("Acme");
    expect(result?.textContent).toContain("4.2");
    const open = host.querySelector<HTMLAnchorElement>("[data-compare-open]");
    expect(open?.getAttribute("href")).toBe(`/compare?run=${awaiting.run_id}`);
    expect(open?.getAttribute("target")).toBe("_blank");
  });

  it("a finished run where nothing could be read names each item and why, never only 'Nothing to compare yet'", async () => {
    followRun.mockResolvedValue({ ...RESULT, items: RESULT.items.map((i) => ({ ...i, values: {}, error: "We could not read a listing for it." })) });
    const host = await mount(awaiting);
    const unread = host.querySelector("[data-compare-unread]");
    expect(unread?.textContent).toContain("Acme");
    expect(unread?.textContent).toContain("We could not read a listing for it.");
  });

  it("a failed run says why, in the server's words", async () => {
    followRun.mockRejectedValue(new ComparisonRefusal("usage_limit", "Your points are used up."));
    const host = await mount(awaiting);
    expect(host.textContent).toContain("Your points are used up.");
    expect(confirmButton(host)).toBeNull();
  });
});

describe("results that are not a confirmable quote", () => {
  it("needs_clarification shows the note and never a Confirm or a run lookup", async () => {
    const host = await mount({ status: "needs_clarification", found: [
      { typed: "zzz", status: "not_found", message: "We could not find zzz." }], message: "Ask the person to clarify." });
    expect(confirmButton(host)).toBeNull();
    expect(host.textContent).toContain("We could not find zzz.");
    expect(followRun).not.toHaveBeenCalled();
  });
});

describe("the card owns picking (live checks 2026-10-19)", () => {
  it("a miss shows its nearest real matches; picking one enables Compare with exactly the confirmed cards", async () => {
    followRun.mockRejectedValueOnce(new ComparisonRefusal("not_found", "none")).mockReturnValue(new Promise(() => {}));
    startChatComparison.mockResolvedValue(undefined);
    const store = (n: string) => ({ label: n, url: `https://www.google.com/maps/place/data=!4m2!3m1!1s0x${n}:0x1` });
    const host = await mount({
      status: "awaiting_confirmation", kind: "local_business", run_id: awaiting.run_id, request: null, message: "Matched 1 of 2.",
      found: [
        { typed: "Riddle's Jewelry", city: "Fargo ND", status: "found", name: "Riddle's Jewelry", detail: "4055 13th Ave S",
          category: "Jewelry store", item: store("a") },
        { typed: "Sarah O. Jewelry", city: "Denver CO", status: "choose", candidates: [
          { name: "Sarah O. Jewelry", detail: "Cherry Creek", category: "Jewelry store", item: store("b") }] },
      ],
    });
    expect(host.textContent).toContain("Riddle's Jewelry");
    expect(host.textContent).toContain("Cherry Creek");
    expect(confirmButton(host)?.disabled).toBe(true);
    const pick = Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.includes("Cherry Creek"));
    await act(async () => { pick!.click(); });
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(confirmButton(host)?.disabled).toBe(false);
    await act(async () => { confirmButton(host)?.click(); });
    expect(startChatComparison).toHaveBeenCalledWith(awaiting.run_id,
      { kind: "local_business", items: [store("a"), store("b")] }, { organizationId: "org-1" });
  });
});

describe("the row and the card follow the run", () => {
  it("the card opens pinned while it needs the person; other results fold", () => {
    expect(compareInlineVisibility(entry(awaiting))?.visibility).toBe("pinned");
    expect(compareInlineVisibility(entry({ status: "needs_items", message: "x" }))).toBeNull();
  });
  it("the row label goes Ready to confirm -> Comparing -> Comparison done / failed with the run", () => {
    const label = () => comparePhaseLabels(entry(awaiting))?.complete;
    setCompareRunPhase(awaiting.run_id, "confirm");
    expect(label()).toBe("Ready to confirm");
    setCompareRunPhase(awaiting.run_id, "running");
    expect(label()).toBe("Comparing");
    setCompareRunPhase(awaiting.run_id, "done");
    expect(label()).toBe("Comparison done");
    setCompareRunPhase(awaiting.run_id, "failed");
    expect(label()).toBe("Comparison failed");
    setCompareRunPhase(awaiting.run_id, "confirm");
    expect(label()).toBe("Ready to confirm");
  });
  it("the header title names the stage once the run exists", async () => {
    followRun.mockImplementation((_id: string, o: { onRunState: (s: unknown) => void }) => {
      o.onRunState({ items: [], created_at: null });
      return new Promise(() => {});
    });
    const host = await mount(awaiting);
    expect(host.textContent).toContain("Comparing");
  });
});
