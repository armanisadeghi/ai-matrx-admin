/**
 * Review 4, F5 (2026-10-19): the alarms page said "Your decision 25" with 4 red Criticals beside a dock card of
 * 5 — it read each alarm's STORED audience while the card applies its own routing. SUT: `audienceAsTheCardRoutes`
 * (the board's only audience reading). Fails before: the board read `audienceOf` (stored), so an alarm the card
 * routes to agents or to info stayed "Your decision".
 */
import { audienceAsTheCardRoutes, type CardRoute } from "./spendAlarms";

const routes = new Map<string, CardRoute>([
  ["spend-alarms:a", "agent_fix"],
  ["spend-alarms:b", "info_only"],
  ["spend-alarms:c", "over_budget"],
  ["spend-alarms:d", "owner_card"],
  ["spend-alarms:e", "muted"],
]);

describe("the alarms page routes each alarm the way the dock does", () => {
  it("follows the card's route over the stored audience", () => {
    expect(audienceAsTheCardRoutes({ id: "a", audience: "owner_decision" }, routes)).toBe("agent_fix");
    expect(audienceAsTheCardRoutes({ id: "b", audience: "owner_decision" }, routes)).toBe("info_only");
    expect(audienceAsTheCardRoutes({ id: "c", audience: "agent_fix" }, routes)).toBe("owner_decision");
    expect(audienceAsTheCardRoutes({ id: "d", audience: "info_only" }, routes)).toBe("owner_decision");
  });
  it("keeps the stored audience when the card did not read the alarm", () => {
    expect(audienceAsTheCardRoutes({ id: "e", audience: "agent_fix" }, routes)).toBe("agent_fix");
    expect(audienceAsTheCardRoutes({ id: "z", audience: "info_only" }, routes)).toBe("info_only");
    expect(audienceAsTheCardRoutes({ id: "z", audience: null }, null)).toBe("owner_decision");
  });
});
