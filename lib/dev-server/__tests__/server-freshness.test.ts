/**
 * The stale-dev-server verdict (Arman, 2026-10-14): an install under a running server must read
 * as stale and name our packages that moved; an install that finished before boot must not.
 */

import { assessFreshness, diffPackages, parseBootPackages } from "../server-freshness";

const BOOT = 1_700_000_000_000;
const disk = (entries: Record<string, string>) => new Map(Object.entries(entries));

describe("assessFreshness", () => {
  it("names the package that moved under the running server", () => {
    const verdict = assessFreshness({
      bootedAtMs: BOOT,
      installedAtMs: BOOT + 60_000,
      bootPackages: "@ai-matrx/api@0.1.16 @ai-matrx/kit@0.45.0",
      diskPackages: disk({ "@ai-matrx/api": "0.1.17", "@ai-matrx/kit": "0.45.0" }),
    });
    expect(verdict.stale).toBe(true);
    expect(verdict.moved).toEqual([{ name: "@ai-matrx/api", booted: "0.1.16", onDisk: "0.1.17" }]);
  });

  it("is fresh when the install finished before boot and nothing moved", () => {
    const verdict = assessFreshness({
      bootedAtMs: BOOT,
      installedAtMs: BOOT - 30_000,
      bootPackages: "@ai-matrx/api@0.1.17",
      diskPackages: disk({ "@ai-matrx/api": "0.1.17" }),
    });
    expect(verdict.stale).toBe(false);
    expect(verdict.moved).toEqual([]);
  });

  it("an install after boot is stale even when none of OUR versions moved", () => {
    const verdict = assessFreshness({
      bootedAtMs: BOOT,
      installedAtMs: BOOT + 60_000,
      bootPackages: "@ai-matrx/api@0.1.17",
      diskPackages: disk({ "@ai-matrx/api": "0.1.17" }),
    });
    expect(verdict.stale).toBe(true);
  });

  it("without a boot list it still catches an install under the server", () => {
    const verdict = assessFreshness({ bootedAtMs: BOOT, installedAtMs: BOOT + 60_000, bootPackages: undefined, diskPackages: disk({}) });
    expect(verdict).toMatchObject({ stale: true, bootListKnown: false, moved: [] });
  });
});

describe("parseBootPackages / diffPackages", () => {
  it("splits scoped names on the LAST @ and reports added and removed packages", () => {
    const booted = parseBootPackages("@ai-matrx/api@0.1.16  @ai-matrx/old@1.0.0");
    expect(booted.get("@ai-matrx/api")).toBe("0.1.16");
    expect(diffPackages(booted, disk({ "@ai-matrx/api": "0.1.16", "@ai-matrx/new": "2.0.0" }))).toEqual([
      { name: "@ai-matrx/new", booted: null, onDisk: "2.0.0" },
      { name: "@ai-matrx/old", booted: "1.0.0", onDisk: null },
    ]);
  });
});
