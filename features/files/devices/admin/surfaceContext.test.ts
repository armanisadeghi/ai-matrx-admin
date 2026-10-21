import { fleetOverview, fleetSearchText } from "./surfaceContext";
import type { SyncAdminRow } from "./types";
it("includes loaded totals, safe mapping identity and declared clipping in the fleet overview", () => {
  const row: SyncAdminRow = {
    id: "mapping-1",
    user_id: "user-1",
    device_id: "device-1",
    organization_id: "org-1",
    direction: "two_way",
    desired_state: "active",
    state: "offline",
    state_changed_at: null,
    last_seen_at: null,
    last_synced_at: null,
    items_total: 3,
    bytes_total: 100,
    created_at: null,
  };
  const xml = fleetOverview(
    Array.from({ length: 20 }, (_, i) => ({ ...row, id: `mapping-${i}` })),
    { behind_count: 20 },
    123,
    { "over-quota": "", stopped: "", degraded: "offline", behind: "" },
  );
  expect(xml).toContain('loaded_mapping_count="20"');
  expect(xml).toContain('shown="12"');
  expect(xml).toContain('total="20"');
  expect(xml).toContain('degraded="offline"');
  expect(xml).not.toContain("local_path");
});
it("never coerces a structured fleet search", () => {
  expect(fleetSearchText("offline")).toBe("offline");
  expect(() => fleetSearchText({ search: "offline" })).toThrow(/plain text/);
});
