/**
 * A comparison address whose run is gone (expired, or not this person's) never crashes the page:
 * the server's 404 becomes one plain sentence, and the person can go back to a fresh input.
 */

import { act } from "react";
import { createRoot } from "react-dom/client";

jest.mock("@/lib/python-client", () => ({
  getJson: jest.fn(async () => { throw Object.assign(new Error("Not Found"), { status: 404 }); }),
  postJson: jest.fn(),
  requestRaw: jest.fn(),
}));
jest.mock("@ai-matrx/api", () => ({ parseMatrxNdjsonResponse: jest.fn() }));
// ShareButton goes through the one server client, which builds itself from the whole @ai-matrx/api at load;
// this page never shares, so the client is a stand-in (the mock above only offers the stream parser).
jest.mock("@/lib/api/server-api", () => ({ serverApi: { call: jest.fn() }, callOptionsFrom: jest.fn(() => ({})) }));
jest.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("run=gone-run") }));
jest.mock("@/features/shell/components/header/templates/RecordPageHeader", () => ({ RecordPageHeader: () => null }));
jest.mock("@/lib/url-state/addressWithoutNavigating", () => ({ replaceAddressWithoutNavigating: jest.fn() }));
jest.mock("@/components/cost/useCostDisplay", () => ({ useSeesDollars: () => false, useIsCostAdmin: () => false, useCostDisplay: () => ({ toPoints: (u: number | null | undefined) => (u == null ? null : u * 1000) }) }));
jest.mock("../hooks", () => ({
  useComparisonOrganizationId: () => "org-1",
  useComparisonKinds: () => ({
    isLoading: false, error: null, refetch: jest.fn(),
    data: [{ key: "companies_reviews", label: "Companies", status: "live", lookup_points: 0 }],
  }),
}));
jest.mock("../components/Lineup", () => ({ Lineup: () => <div data-testid="input-step">lineup</div>, RATING_SOURCE: {} }));
jest.mock("../components/AskBar", () => ({ AskBar: () => null }));
jest.mock("../components/RunProgress", () => ({ RunProgress: () => <div>running</div> }));

import { followRun } from "../server";
import { ComparePage } from "../ComparePage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("followRun on a run that is gone", () => {
  it("rejects with the plain not-open sentence, not a raw 404", async () => {
    await expect(followRun("gone-run", { organizationId: "org-1", signal: new AbortController().signal }))
      .rejects.toMatchObject({ code: "not_found", userMessage: "That comparison is not open to you." });
  });
});

describe("the page opened on a run that is gone", () => {
  it("shows the plain sentence, and New comparison goes back to the input", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => { root.render(<ComparePage />); });
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(host.textContent).toContain("That comparison is not open to you.");
    expect(host.textContent).not.toContain("404");
    const again = Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.includes("New comparison"));
    expect(again).toBeTruthy();
    await act(async () => { again!.click(); });
    expect(host.querySelector('[data-testid="input-step"]')).not.toBeNull();
    await act(async () => { root.unmount(); });
  });
});
