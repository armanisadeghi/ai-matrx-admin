/**
 * Tool health on the attention dock: one item per switched-off source, keyed by the database's
 * item_key (so the triage verdict lands on it), critical when the whole Tool is off or an account
 * was refused, and every row opens the Tool control screen.
 */

import { summarizeToolHealth, toolHealthItems, toolHealthRecordHref, proposalDecisionPlan, type ToolHealthRow } from "../sources/tool-health";

const deps = { muteLocally: jest.fn(), unmuteLocally: jest.fn(), now: Date.parse("2026-10-16T23:00:00Z") };

function row(over: Partial<ToolHealthRow>): ToolHealthRow {
  return {
    item_key: "tool-health:e1",
    kind: "source_off",
    severity: "warning",
    title: "Domain Authority",
    sentence: "Moz switched itself off for Domain Authority after 5 unexpected errors in a row.",
    detail: "It stays off until a check passes.",
    record_href: "/administration/agents/tool-control?tool=t1",
    last_seen_at: "2026-10-16T22:55:00Z",
    facts: {},
    ...over,
  };
}

test("a switched-off source keeps the database key, its reason and a door to Tool control", () => {
  const [item] = toolHealthItems([row({})], deps);
  expect(item.key).toBe("tool-health:e1");
  expect(item.sourceId).toBe("tool-health");
  expect(item.id).toBe("e1");
  expect(item.state).toBe("one source switched off");
  expect(item.fix).toMatch(/stays off until a check passes/);
  expect(item.doors[0].href).toBe("/administration/agents/tool-control?tool=t1");
  expect(item.mute?.scope).toBe("local");
});

test("a Tool with no working source, and an account refusal, are critical and say so", () => {
  const off = toolHealthItems([row({ kind: "tool_off", severity: "critical" })], deps)[0];
  expect(off.severity).toBe("critical");
  expect(off.state).toBe("off — no working source");
  const account = toolHealthItems([row({ kind: "account_off", severity: "critical" })], deps)[0];
  expect(account.state).toBe("account switched off");
});

test("summary names one Tool or counts several, and is empty at zero", () => {
  expect(summarizeToolHealth(toolHealthItems([row({})], deps))).toBe("Domain Authority: one source switched off.");
  expect(summarizeToolHealth(toolHealthItems([row({}), row({ item_key: "tool-health:e2" })], deps))).toBe("2 Tool sources are switched off.");
  expect(summarizeToolHealth([])).toBeNull();
});

test("upkeep findings (a price that may have changed, sources to review) ride the same source with their own words", () => {
  const [price] = toolHealthItems([row({ kind: "price_drift", severity: "warning", title: "Tool prices", record_href: "/administration/agents/tool-control/alerts/e1" })], deps);
  expect(price.state).toBe("price may have changed");
  expect(price.severity).toBe("warning");
  const [review] = toolHealthItems([row({ kind: "import_candidate", severity: "info", title: "New Tool sources" })], deps);
  expect(review.state).toBe("sources to review");
  expect(review.severity).toBe("info");
});

/**
 * DOOR LAW GUARD (Arman 2026-10-10, "every alarm is a record page"): no tool-health item, whatever kind and
 * whatever the database sent, links to the bare Tool control landing page. Three owner decisions once all
 * pointed at it. Fails if a kind falls back to the list; passes when each opens its own record.
 */
test("no tool-health kind ever links to the bare Tool control landing page", () => {
  const kinds = ["source_off", "tool_off", "account_off", "breaker_failed", "price_drift", "import_candidate"];
  const bare = ["/administration/agents/tool-control", "/administration/agents/tool-control/", null as unknown as string];
  const hrefs = new Set<string>();
  for (const kind of kinds) {
    for (const record_href of bare) {
      const [item] = toolHealthItems([row({ kind, item_key: `tool-health:${kind}-id`, record_href })], deps);
      const href = item.doors[0].href;
      expect(href).not.toBe("/administration/agents/tool-control");
      expect(href).toBe(`/administration/agents/tool-control/alerts/${kind}-id`);
      hrefs.add(href);
    }
  }
  expect(hrefs.size).toBe(kinds.length);
});

test("a Tool alarm that names its tool keeps its own Tool link", () => {
  expect(toolHealthRecordHref(row({}))).toBe("/administration/agents/tool-control?tool=t1");
});

test("a price proposal can be approved or declined and names the consequence; sources to review can only be dismissed; other kinds have no decision", () => {
  const price = proposalDecisionPlan({ kind: "price_drift", facts: { proposal: { price_ref: "tavily_search_usd", current: "0.008", value: "0.016" } } })!;
  expect(price.canApprove).toBe(true);
  expect(price.approveConsequence).toMatch(/tavily_search_usd from \$0\.008 to \$0\.016/);
  expect(price.declineConsequence).toMatch(/Keeps the current price/);
  const review = proposalDecisionPlan({ kind: "import_candidate", facts: { proposal: { total: 16 } } })!;
  expect(review.canApprove).toBe(false);
  expect(review.declineLabel).toBe("Dismiss");
  expect(proposalDecisionPlan({ kind: "source_off", facts: {} })).toBeNull();
});
