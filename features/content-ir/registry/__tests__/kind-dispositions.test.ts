/**
 * KINDS-GLUE wave 1b — a kind is never born in the browser without saying what its output is.
 *
 * 1. The browser consumes the published disposition artifact; Aidream package
 *    CI verifies that artifact against matrx-graph's Python tuple, and this
 *    suite verifies it against the registry backstop trigger.
 * 2. The census, by construction: every file in this repo that inserts or upserts into
 *    `content_ir.kind_definition` runs `kindDispositionRefusal` — a new creation path is caught
 *    the day it is written.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { KIND_DISPOSITIONS as PUBLISHED_KIND_DISPOSITIONS } from "@ai-matrx/content-ir/registry";

import {
  KIND_DISPOSITIONS,
  kindDispositionRefusal,
} from "../kind-dispositions";

const REPO = join(__dirname, "..", "..", "..", "..");
const BACKSTOP = join(
  REPO,
  "migrations",
  "campaign",
  "kindsglue_c_the_registry_refuses_a_kind_that_does_not_say_what_it_is.sql",
);

describe("the disposition set is ONE list", () => {
  it("uses the package artifact verified against the SDK's KIND_DISPOSITIONS", () => {
    expect(KIND_DISPOSITIONS).toBe(PUBLISHED_KIND_DISPOSITIONS);
  });

  it("equals the registry backstop trigger's set", () => {
    const sql = readFileSync(BACKSTOP, "utf8");
    const body = sql.slice(sql.indexOf("create or replace function"));
    const sets = [...body.matchAll(/in \(('record'[^)]*)\)/g)].map((m) =>
      [...m[1]!.matchAll(/'([A-Za-z_]+)'/g)].map((w) => w[1]),
    );
    expect(sets.length).toBeGreaterThan(0);
    for (const db of sets) expect(db).toEqual([...KIND_DISPOSITIONS]);
  });

  it("refuses a missing or unknown disposition in a plain sentence", () => {
    expect(kindDispositionRefusal("rate_card", undefined)).toMatch(
      /"rate_card" does not say what its output is/,
    );
    expect(kindDispositionRefusal("rate_card", "table")).toMatch(/not one of/);
    for (const d of KIND_DISPOSITIONS) {
      expect(kindDispositionRefusal("rate_card", d)).toBeNull();
    }
  });
});

const SCAN = ["app", "features", "lib", "components", "packages", "scripts", "utils", "hooks"];
const SKIP = new Set(["node_modules", ".next", "dist", "__tests__", "generated"]);

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) sourceFiles(path, out);
    else if (/\.(ts|tsx|mjs)$/.test(name) && !/\.(test|spec)\.[jt]sx?$/.test(name))
      out.push(path);
  }
  return out;
}

/** A write into kind_definition: `.from("kind_definition")` followed by `.insert(`/`.upsert(`. */
const KIND_DEFINITION_WRITE =
  /\.from\(\s*["']kind_definition["']\s*\)\s*\.(insert|upsert)\(/;

describe("every browser path that creates a kind runs the disposition refusal", () => {
  const writers = SCAN.flatMap((root) => {
    try {
      return sourceFiles(join(REPO, root));
    } catch {
      return [];
    }
  })
    .map((path) => ({ path, text: readFileSync(path, "utf8") }))
    .filter(({ text }) => KIND_DEFINITION_WRITE.test(text));

  it("finds the known creation paths (a scan that finds nothing proves nothing)", () => {
    const files = writers.map((w) => relative(REPO, w.path));
    expect(files).toEqual(
      expect.arrayContaining([
        "features/agents/components/schema-proposal/create-shape.ts",
      ]),
    );
  });

  it.each(writers.map((w) => [relative(REPO, w.path), w.text] as const))(
    "%s",
    (_path, text) => {
      expect(text).toMatch(/kindDispositionRefusal\(/);
    },
  );
});
