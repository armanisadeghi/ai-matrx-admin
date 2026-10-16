import type { EndpointRow, EntryRow, ProviderRow, ScorecardRow, StripRow } from "../types";
import { historyLine, mergeHistory, reasonWords, rollupTools, speedLabel, stateWords, stripCells, successLabel } from "../words";

const card = (over: Partial<ScorecardRow>): ScorecardRow => ({
  endpoint_id: "e1", window_days: 7, samples: 20, decided: 19, hits: 15, unexpected_errors: 1, hit_rate: 0.79,
  unexpected_error_rate: 0.05, p50_ms: 800, p95_ms: 2000, last_success_at: "2026-10-16T22:00:00Z", last_error_at: null,
  consecutive_unexpected: 0, ...over,
});

test("the success rate always carries its sample size, and a quiet source says so", () => {
  expect(successLabel(card({}))).toBe("95% · 20 calls");
  expect(successLabel(card({ samples: 1, decided: 1 }))).toBe("100% · 1 call");
  expect(successLabel(undefined)).toBe("No calls yet");
  expect(successLabel(card({ samples: 0, decided: 0 }))).toBe("No calls yet");
});

test("speed reads in ms under a second and seconds above", () => {
  expect(speedLabel(320)).toBe("320ms");
  expect(speedLabel(1500)).toBe("1.5s");
  expect(speedLabel(null)).toBe("—");
});

test("a switched-off source and an admin's pause are different words and tones", () => {
  expect(stateWords("auto_off")).toEqual({ label: "Switched off", tone: "danger" });
  expect(stateWords("paused")).toEqual({ label: "Paused", tone: "muted" });
  expect(stateWords("live").tone).toBe("success");
});

test("the reason a guard acted is said with its numbers", () => {
  expect(reasonWords({ at: "t", from: "live", to: "auto_off", reason: "consecutive_unexpected", snapshot: { consecutive: 5 } })).toBe("5 unexpected errors in a row");
  expect(reasonWords({ at: "t", from: "live", to: "auto_off", reason: "window_error_pct", snapshot: { pct: 60, samples: 10 } })).toBe("60% of the last 10 calls failed");
});

const entry: EntryRow = { tool_id: "t1", job_key: "k", job_family: "seo", display_name: "Domain Authority", state: "live", metadata: { control_log: [{ at: "2026-10-16T20:00:00Z", from: "off", to: "live", actor: "system", reason: "derived" }] } };
const eps: EndpointRow[] = [
  { id: "e1", tool_id: "t1", provider_slug: "moz", via: "direct", vendor_op: "x", state: "live", verified_at: null, last_probe: null, metadata: { control_log: [{ at: "2026-10-16T21:00:00Z", from: "live", to: "auto_off", actor: "system", reason: "consecutive_unexpected", snapshot: { consecutive: 5 } }] } },
  { id: "e2", tool_id: "t1", provider_slug: "treg_x", via: "treg", vendor_op: "y", state: "auto_off", verified_at: null, last_probe: null, metadata: null },
  { id: "e3", tool_id: "t1", provider_slug: "old", via: "direct", vendor_op: "z", state: "retired", verified_at: null, last_probe: null, metadata: null },
];
const provs: ProviderRow[] = [{ slug: "moz", admin_name: "Moz", state: "live", direct_account: true, metadata: null }];

test("a Tool row sums its live sources' 7-day numbers and ignores retired ones", () => {
  const [row] = rollupTools([entry], eps, [card({ endpoint_id: "e1" }), card({ endpoint_id: "e2", samples: 10, decided: 5, p50_ms: 400 })]);
  expect(row.sources).toBe(2);
  expect(row.sourcesOn).toBe(1);
  expect(row.samples).toBe(30);
  expect(row.decided).toBe(24);
  expect(row.p50_ms).toBe(400);
});

test("the strip is 48 hourly cells: answered, some failed, mostly failed, quiet", () => {
  const now = Date.parse("2026-10-16T23:30:00Z");
  const rows: StripRow[] = [
    { endpoint_id: "e1", bucket_start: "2026-10-16T23:00:00Z", hits: 5, misses: 0, unexpected_errors: 0 },
    { endpoint_id: "e1", bucket_start: "2026-10-16T22:00:00Z", hits: 4, misses: 0, unexpected_errors: 1 },
    { endpoint_id: "e1", bucket_start: "2026-10-16T21:00:00Z", hits: 1, misses: 0, unexpected_errors: 4 },
  ];
  const cells = stripCells(rows, now);
  expect(cells).toHaveLength(48);
  expect(cells.at(-1)?.kind).toBe("ok");
  expect(cells.at(-2)?.kind).toBe("some");
  expect(cells.at(-3)?.kind).toBe("bad");
  expect(cells.at(-4)?.kind).toBe("none");
});

test("history merges the Tool, its sources and accounts, newest first, naming who acted", () => {
  const lines = mergeHistory(entry, eps, provs);
  expect(lines[0].at).toBe("2026-10-16T21:00:00Z");
  expect(lines[0].subject).toBe("Moz");
  expect(lines[0].line).toBe("The guard: switched off — 5 unexpected errors in a row");
  expect(lines).toHaveLength(2);
});


test("a check's history line says whether it changed anything", () => {
  expect(historyLine({ at: "t", from: "verifying", to: "auto_off", actor: "admin", reason: "verification_failed" })).toBe("An admin ran a check — it did not pass, stays off");
  expect(historyLine({ at: "t", from: "verifying", to: "live", actor: "upkeep", reason: "verification_passed" })).toBe("Upkeep ran a check — it passed, now on");
  expect(historyLine({ at: "t", from: "live", to: "paused", actor: "admin", reason: "manual", note: "vendor maintenance" })).toBe("An admin: paused — By hand: vendor maintenance");
});
