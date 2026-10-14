/**
 * Deploy freshness on the attention dock: the item key is the database's item_key (so the
 * triage verdict lands on it), the watch going quiet is critical, a stale service carries
 * the reason the Manager gave as its fix line, and every row opens the fleet page.
 */

import { deployFreshnessItems, summarizeDeployFreshness, type DeployFreshnessRow } from "../sources/deploy-freshness";

const deps = { muteLocally: jest.fn(), unmuteLocally: jest.fn(), now: Date.parse("2026-10-13T23:00:00Z") };

function row(over: Partial<DeployFreshnessRow>): DeployFreshnessRow {
  return {
    item_key: "deploy-freshness:matrx-files",
    kind: "behind",
    severity: "warning",
    title: "Matrx Files service (files.matrxserver.com)",
    sentence: "Running 0.2.280 while 0.2.293 is released, behind since Oct 12 02:52 AM Pacific.",
    detail: "The last auto-deploy of 0.2.293 failed: RuntimeError: Files central authority refusal contract is unavailable",
    record_href: "https://manager.dev.codematrx.com/admin/fleet-health",
    last_seen_at: "2026-10-13T22:55:00Z",
    facts: { running: "0.2.280", latest: "0.2.293" },
    ...over,
  };
}

test("a stale service keeps the database key, its reason and a door to the fleet page", () => {
  const [item] = deployFreshnessItems([row({})], deps);
  expect(item.key).toBe("deploy-freshness:matrx-files");
  expect(item.sourceId).toBe("deploy-freshness");
  expect(item.state).toBe("behind its release");
  expect(item.fix).toMatch(/refusal contract is unavailable/);
  expect(item.doors[0].href).toBe("https://manager.dev.codematrx.com/admin/fleet-health");
  expect(item.mute?.scope).toBe("local");
});

test("the deploy watch going quiet is critical and says so", () => {
  const [item] = deployFreshnessItems(
    [row({ item_key: "deploy-freshness:watch", kind: "watch_silent", severity: "critical", title: "Deploy watch", last_seen_at: null })],
    deps,
  );
  expect(item.severity).toBe("critical");
  expect(item.state).toBe("never reported");
});

test("summary names one service or counts several, and is empty at zero", () => {
  const one = deployFreshnessItems([row({})], deps);
  expect(summarizeDeployFreshness(one)).toMatch(/is not running its latest release/);
  const two = deployFreshnessItems([row({}), row({ item_key: "deploy-freshness:scraper", title: "Scraper" })], deps);
  expect(summarizeDeployFreshness(two)).toBe("2 services are not running their latest release.");
  expect(summarizeDeployFreshness([])).toBeNull();
});
