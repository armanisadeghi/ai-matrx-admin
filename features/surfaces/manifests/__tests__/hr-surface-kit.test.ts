/**
 * The HR page surfaces share ONE helper (`hr-surface-kit.ts`; the hr-a kit and the hr-b
 * `_hr-page-values.ts` were merged in surface declarations W2-B, 2026-10-22). Fails when a second
 * HR helper module comes back, or when a helper default drifts (every HR manifest is built on them).
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  HR_MODULE_PARENT,
  compact,
  hrLoadStatus,
  hrPageSurface,
  hrTarget,
  hrTypicalCharCount,
  hrValue,
} from "../hr-surface-kit";

const DIR = path.join(__dirname, "..");

describe("one HR surface helper", () => {
  it("every HR page manifest imports its helpers from ./hr-surface-kit and no other HR helper module exists", () => {
    const files = readdirSync(DIR);
    const helperModules = files.filter((f) => /^_?hr-.*\.ts$/.test(f) && !f.endsWith(".manifest.ts"));
    expect(helperModules).toEqual(["hr-surface-kit.ts"]);
    const offenders: string[] = [];
    for (const f of files.filter((f) => /^hr-.*\.manifest\.ts$/.test(f))) {
      const src = readFileSync(path.join(DIR, f), "utf8");
      for (const m of src.matchAll(/from "\.\/(_?hr-[^"]+)"/g)) {
        if (m[1] !== "hr-surface-kit" && !m[1].endsWith(".manifest")) offenders.push(`${f} -> ${m[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("hrValue", () => {
  it("defaults to not always available and sizes by type", () => {
    expect(hrTypicalCharCount("number")).toBe(4);
    expect(hrTypicalCharCount("boolean")).toBe(5);
    expect(hrTypicalCharCount("array")).toBe(600);
    expect(hrTypicalCharCount("string")).toBe(40);
    expect(hrValue("n", "N", "boolean", "g", 3, "d")).toEqual({
      name: "n",
      label: "N",
      description: "d",
      valueType: "boolean",
      alwaysAvailable: false,
      typicalCharCount: 5,
      group: "g",
      sortOrder: 3,
    });
  });

  it("lets the caller override any default", () => {
    const v = hrValue("n", "N", "string", "g", 1, "d", { alwaysAvailable: true, typicalCharCount: 9 });
    expect(v.alwaysAvailable).toBe(true);
    expect(v.typicalCharCount).toBe(9);
  });
});

describe("hrTarget and hrPageSurface", () => {
  it("every target asks the person first", () => {
    const t = hrTarget("t", "T", { valueType: "string", mode: "draft", updatesValue: "v", group: "g", sortOrder: 1 }, "d");
    expect(t.applyPolicy).toBe("ask");
    expect(t.description).toBe("d");
  });

  it("the shell parents to the HR module unless the page names another parent", () => {
    const base = { surfaceName: "matrx-user/x", label: "X", description: "x", readinessNote: "n", values: [] };
    const m = hrPageSurface(base);
    expect(m.client).toBe("matrx-user");
    expect(m.executionMode).toBe("python-stream");
    expect(m.inheritsFrom).toBe(HR_MODULE_PARENT);
    expect(m.readiness).toBe("partial");
    expect(hrPageSurface({ ...base, inheritsFrom: "matrx-user/hr-employee" }).inheritsFrom).toBe("matrx-user/hr-employee");
  });
});

describe("runtime helpers", () => {
  it("hrLoadStatus: no access beats failed beats loading", () => {
    expect(hrLoadStatus({ loading: true, denied: true, failed: true })).toBe("no_access");
    expect(hrLoadStatus({ loading: true, failed: true })).toBe("failed");
    expect(hrLoadStatus({ loading: true })).toBe("loading");
    expect(hrLoadStatus({ loading: false })).toBe("loaded");
  });

  it("compact drops null, undefined and empty strings only", () => {
    expect(compact({ a: null, b: undefined, c: "", d: 0, e: false, f: "x" })).toEqual({ d: 0, e: false, f: "x" });
  });
});
