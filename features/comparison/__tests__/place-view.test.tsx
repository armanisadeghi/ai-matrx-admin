import { act } from "react";
import { createRoot } from "react-dom/client";

import { parseResult, type ComparisonResult } from "../contract";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/components/agent-copy/CopyButtons", () => ({ CopyButtons: () => null }));
jest.mock("next/image", () => ({ __esModule: true, default: () => null }));

import { ComparisonView } from "../components/ComparisonView";
import { comparisonMarkdown } from "../copy";

const F = (key: string, label: string, type: string, extra = {}) =>
  ({ key, label, type, direction: "none", is_primary: false, help: "", ...extra });
const V = (value: unknown, display = "x") => ({ value, display, is_best: false, basis: "on the listing" });
const none = V(null, "—");
const week = { Friday: "9 am–6 pm", Thursday: "9 am–6 pm", Sunday: "Closed" };
const review = { rating: 5, text: "Spotless and friendly", date: "2026-07-25", by: "Jo" };

const item = (id: string, name: string, rank: number, extra: Record<string, unknown>) => ({
  item_id: id, name, rank,
  values: {
    rating: { value: 4.9 - rank / 10, display: String(4.9 - rank / 10), is_best: rank === 1, basis: "" },
    ...extra,
  },
});
const fields = [
  F("rating", "Rating", "rating", { is_primary: true, direction: "higher_better" }),
  F("open_hours", "Hours", "hours"), F("review_distribution", "Star ratings", "distribution"),
  F("contact", "Contact", "contact"), F("listing_status", "Listing", "status"),
  F("attributes", "Attributes", "tags"), F("review_samples", "Reviews", "reviews"),
];

const rich = (n: string, over: Record<string, unknown> = {}) => ({
  open_hours: V({ days: week, timezone: "America/Los_Angeles" }, "Friday: 9 am–6 pm"),
  review_distribution: V({ "1": 2, "2": 0, "3": 1, "4": 5, "5": 92 }, "5★ 92"),
  contact: V({ phone: "+1 818-783-3600", website: "https://bluespa.com/", booking: "https://book.example/x" }, "phone"),
  listing_status: V({ closed: "temporarily", claimed: true }, "Closed temporarily · Claimed"),
  attributes: V(["Wheelchair-accessible entrance", n], "list"),
  review_samples: V({ top: [review], snippets: ["Nice place"] }, "1 reviews, 1 snippets"),
  ...over,
});

const result = parseResult({
  kind: "local_business", kind_label: "Medspa", primary_field: "rating", fields,
  items: [item("a", "Alpha Medspa", 1, rich("Parking")), item("b", "Beta Clinic", 2, rich("Valet"))],
}) as ComparisonResult;

async function render(r: ComparisonResult) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  await act(async () => { createRoot(host).render(<ComparisonView result={r} />); });
  return host;
}

describe("a place comparison shows the stored facts side by side", () => {
  beforeEach(() => { jest.useFakeTimers({ now: new Date(Date.UTC(2026, 9, 23, 17, 0)) }); }); // Friday 10:00 in Los Angeles
  afterEach(() => { jest.useRealTimers(); document.body.innerHTML = ""; });

  it("renders the star bar, hours today with status, contact, listing flags, attributes and reviews", async () => {
    const host = await render(result);
    const text = host.textContent ?? "";
    expect(host.querySelectorAll('[role="img"]').length).toBe(2);                 // one stacked star bar per contender
    expect(text).toContain("Today 9 am–6 pm");                                    // the business's own Friday
    expect(text).toContain("Open now");
    expect(host.querySelector('a[href="tel:+18187833600"]')).not.toBeNull();       // phone is a tel: link
    const out = [...host.querySelectorAll("a")].filter((a) => a.getAttribute("href")?.startsWith("http"));
    expect(out.some((a) => a.textContent === "Book online")).toBe(true);
    expect(text).toContain("Claimed");
    expect(text).toContain("Temporarily closed");                                  // flag over the photo and in the Listing card
    expect(host.querySelector('[aria-label="Attributes"]')).not.toBeNull();        // the yes/no grid
    expect(text).toContain("Wheelchair-accessible entrance");
    expect(text).toContain("Reviews");                                             // the disclosure on each card
    expect(text).not.toContain("1 reviews, 1 snippets");                           // never the plain display fallback
  });

  it("a row with only one contender's value is not shown, and never as a plain details line", async () => {
    const one = parseResult({
      kind: "local_business", kind_label: "Medspa", primary_field: "rating", fields,
      items: [item("a", "Alpha Medspa", 1, rich("Parking")), item("b", "Beta Clinic", 2, rich("Valet", { contact: none, attributes: none }))],
    }) as ComparisonResult;
    const host = await render(one);
    expect(host.querySelector('[aria-label="Contact"]')).toBeNull();
    expect(host.querySelector('[aria-label="Attributes"]')).toBeNull();
    expect(host.textContent).not.toContain("+1 818-783-3600");
  });

  it("copied markdown carries the review text, not a count", () => {
    expect(comparisonMarkdown(result, "a")).toContain("Spotless and friendly");
    expect(comparisonMarkdown(result)).toContain("Spotless and friendly");
  });
});
