import { act } from "react";
import { createRoot } from "react-dom/client";

import { parsePublicComparison, parsePublicPolicy } from "../public/contract";
import { fetchedOn } from "../public/format";
import { CompareHero, compareDestination } from "../public/CompareHero";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

async function mount(runRequiresAccount: boolean) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => { root.render(<CompareHero runRequiresAccount={runRequiresAccount} />); });
  return host;
}

async function type(host: HTMLElement, value: string) {
  const box = host.querySelector("textarea") as HTMLTextAreaElement;
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  await act(async () => { set.call(box, value); box.dispatchEvent(new Event("input", { bubbles: true })); });
}

async function submit(host: HTMLElement) {
  const form = host.querySelector("form") as HTMLFormElement;
  await act(async () => { form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
}

const wire = {
  slug: "acme-vs-globex-k3f9a2x",
  title: "Acme vs Globex: Company reviews compared",
  description: "Acme leads on overall rating (4.6).",
  kind: "companies_reviews",
  kind_label: "Company reviews",
  fetched_at: "2026-10-16T12:00:00+00:00",
  shared_at: "2026-10-16T13:00:00+00:00",
  result: {
    kind: "companies_reviews", kind_label: "Company reviews", primary_field: "rating",
    fields: [{ key: "rating", label: "Overall rating", type: "rating", direction: "higher_better", is_primary: true, help: "" }],
    items: [{ item_id: "item-1", name: "Acme", rank: 1, values: { rating: { value: 4.6, display: "4.6", is_best: true, basis: "" } } }],
  },
  refresh_items: [{ label: "Acme", url: "https://example.com/acme" }, { label: "Globex" }],
  policy: { view_requires_account: false, run_requires_account: true, refresh_requires_account: true, indexable: true },
};

describe("public comparison payload", () => {
  it("parses what the page renders, with the typed refresh inputs and the policy", () => {
    const p = parsePublicComparison(wire)!;
    expect(p.title).toBe(wire.title);
    expect(p.result.items[0].name).toBe("Acme");
    expect(p.refreshItems.map((i) => i.label)).toEqual(["Acme", "Globex"]);
    expect(p.policy).toEqual({ viewRequiresAccount: false, runRequiresAccount: true, refreshRequiresAccount: true, indexable: true, guestFreeRuns: null });
  });

  it("is null for an answer with no result or no slug (the page then 404s, never half-renders)", () => {
    expect(parsePublicComparison({ ...wire, result: null })).toBeNull();
    expect(parsePublicComparison({ ...wire, slug: "" })).toBeNull();
    expect(parsePublicComparison(null)).toBeNull();
  });

  it("defaults the policy to the owner's: view open, run needs an account, indexable", () => {
    expect(parsePublicPolicy({})).toEqual({ viewRequiresAccount: false, runRequiresAccount: true, refreshRequiresAccount: true, indexable: true, guestFreeRuns: null });
  });

  it("stamps when the facts were fetched, in a fixed zone", () => {
    expect(fetchedOn("2026-10-16T12:00:00+00:00")).toBe("Oct 16, 2026");
    expect(fetchedOn(null)).toBe("");
    expect(fetchedOn("nonsense")).toBe("");
  });
});

describe("the public hero hands the input to sign-up and keeps it", () => {
  beforeEach(() => { push.mockClear(); document.body.innerHTML = ""; });

  it("builds the /compare destination with the typed text, encoded", () => {
    expect(compareDestination("  Acme vs Globex & co ")).toBe("/compare?q=Acme%20vs%20Globex%20%26%20co");
    expect(compareDestination("   ")).toBe("/compare");
  });

  it("with the account knob on, submit goes to sign-up with the destination riding along", async () => {
    const host = await mount(true);
    await type(host, "Acme vs Globex");
    await submit(host);
    expect(push).toHaveBeenCalledWith(`/sign-up?redirectTo=${encodeURIComponent("/compare?q=Acme%20vs%20Globex")}`);
  });

  it("with the knob off, submit goes straight to /compare", async () => {
    const host = await mount(false);
    await type(host, "Acme vs Globex");
    await submit(host);
    expect(push).toHaveBeenCalledWith("/compare?q=Acme%20vs%20Globex");
  });

  it("does nothing on an empty box", async () => {
    const host = await mount(true);
    await submit(host);
    expect(push).not.toHaveBeenCalled();
  });
});

describe("the landing says what a visitor gets before the click", () => {
  it("reads the free-run count but the hero never prints it", () => {
    expect(parsePublicPolicy({ guest_free_runs: 3 }).guestFreeRuns).toBe(3);
    expect(parsePublicPolicy({ guest_free_runs: 0 }).guestFreeRuns).toBeNull();
    const { heroNote } = jest.requireActual("../public/CompareHero") as typeof import("../public/CompareHero");
    expect(heroNote(true)).toBe("A free account runs it");
    expect(heroNote(false)).toBeNull();   // never an allowance count on a public hero
  });
});
