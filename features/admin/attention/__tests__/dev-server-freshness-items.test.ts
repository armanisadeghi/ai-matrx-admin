/**
 * The dev-server row (Arman, 2026-10-14): absent while the server is fresh, a plain sentence
 * naming the package while stale, critical once the watchdog failed to restart it — and on the
 * triaged card even though the database has never heard of it.
 */

import { buildAttentionNotice } from "../build-notice";
import { parseTriage } from "../triage";
import { devServerFreshnessItems, STUCK_AFTER_MS } from "../sources/dev-server-freshness";
import type { AttentionSourceState } from "../types";
import type { DevServerFreshness } from "@/lib/dev-server/server-freshness";

const INSTALLED = "2026-10-14T17:40:00.000Z";
const at = (ms: number) => new Date(INSTALLED).getTime() + ms;
const deps = { muteLocally: () => {}, unmuteLocally: () => {} };

const stale: DevServerFreshness = {
  stale: true,
  bootedAt: "2026-10-14T17:00:00.000Z",
  installedAt: INSTALLED,
  moved: [{ name: "@ai-matrx/api", booted: "0.1.16", onDisk: "0.1.17" }],
  bootListKnown: true,
};

function sourceOf(items: ReturnType<typeof devServerFreshnessItems>): AttentionSourceState {
  return {
    id: "dev-server-freshness",
    label: "Dev server",
    items,
    status: "ok",
    error: null,
    loud: false,
    machineLocal: true,
    summarize: () => "stale",
    review: null,
    refetch: () => {},
  };
}

describe("devServerFreshnessItems", () => {
  it("is absent while the server is fresh or unreadable", () => {
    expect(devServerFreshnessItems({ ...stale, stale: false, moved: [] }, deps)).toEqual([]);
    expect(devServerFreshnessItems(null, deps)).toEqual([]);
  });

  it("names the package in one sentence and is a warning while the restart is pending", () => {
    const [row] = devServerFreshnessItems(stale, { ...deps, now: at(30_000) });
    expect(row.severity).toBe("warning");
    expect(row.sentence).toContain("@ai-matrx/api 0.1.16 after 0.1.17 was installed");
    expect(row.fix).toContain("restarts by itself");
  });

  it("turns critical once the watchdog should have restarted it", () => {
    const [row] = devServerFreshnessItems(stale, { ...deps, now: at(STUCK_AFTER_MS + 1) });
    expect(row.severity).toBe("critical");
  });

  it("reaches the triaged card with no database verdict, ahead of triaged items", () => {
    const items = devServerFreshnessItems(stale, { ...deps, now: at(1_000) });
    const triage = parseTriage({ budget: 5, items: [] });
    const notice = buildAttentionNotice([sourceOf(items)], {}, at(1_000), triage);
    expect(notice?.sections.flatMap((s) => s.items).map((i) => i.title)).toEqual(["Local dev server"]);
  });

  it("FAILING BASELINE: the same row without machineLocal is dropped by triage", () => {
    const items = devServerFreshnessItems(stale, { ...deps, now: at(1_000) });
    const triage = parseTriage({ budget: 5, items: [] });
    expect(buildAttentionNotice([{ ...sourceOf(items), machineLocal: false }], {}, at(1_000), triage)).toBeNull();
  });
});
