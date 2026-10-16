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
jest.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("run=gone-run") }));
jest.mock("@/features/shell/components/header/templates/RecordPageHeader", () => ({ RecordPageHeader: () => null }));
jest.mock("@/lib/url-state/addressWithoutNavigating", () => ({ replaceAddressWithoutNavigating: jest.fn() }));
jest.mock("@/components/cost/useCostDisplay", () => ({ useSeesDollars: () => false }));
jest.mock("../hooks", () => ({
  useComparisonOrganizationId: () => "org-1",
  useComparisonKinds: () => ({
    isLoading: false, error: null, refetch: jest.fn(),
    data: [{ key: "companies_reviews", label: "Companies", status: "live", lookup_points: 0 }],
  }),
}));
jest.mock("../components/CompareInput", () => ({ CompareInput: () => <div data-testid="input-step">input</div> }));
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
