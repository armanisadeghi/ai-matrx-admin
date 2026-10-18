// "AI requests" per person means ONE thing on every admin user screen: the usage explorer's `requests`
// (runtime._ai_usage_hourly). The roster once counted runtime.global_request spine rows (~25x larger for the
// heaviest user) under the same label as the user page's KPI. This fails if either source drifts.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../../../../..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

/** The newest migration (by file name) that (re)defines `fn`. */
function latestDefinition(fn: string): string {
  const dir = join(ROOT, "migrations");
  const re = new RegExp(`create\\s+or\\s+replace\\s+function\\s+${fn.replace(".", "\\.")}\\s*\\(`, "i");
  const hits = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .filter((f) => re.test(readFileSync(join(dir, f), "utf8")))
    .sort();
  const last = hits[hits.length - 1];
  if (!last) throw new Error(`no migration defines ${fn}`);
  return readFileSync(join(dir, last), "utf8");
}

describe("AI requests has one label and one definition", () => {
  it("both screens take the label from the same constant", () => {
    expect(read("features/admin/users/components/AccountsTableClient.tsx")).toContain("header: AI_REQUESTS_LABEL");
    expect(read("features/admin/users/record/UserOverviewTab.tsx")).toContain("${AI_REQUESTS_LABEL}");
    expect(read("features/admin/users/components/AccountsTableClient.tsx")).not.toMatch(/header:\s*"AI requests"/);
  });

  it("the roster's ai_requests sums the usage rollup, not spine rows", () => {
    const sql = latestDefinition("users.admin_account_facts");
    expect(sql).toMatch(/sum\(h\.requests\)[\s\S]*from runtime\._ai_usage_hourly h/i);
    // the first select of `req` must not be the source of the returned request counts
    expect(sql).toMatch(/coalesce\(hr\.n, 0\)/);
    expect(sql).not.toMatch(/coalesce\(r\.n, 0\)/);
  });

  it("the user page's KPI sums the same rollup column", () => {
    const sql = latestDefinition("admin.user_overview");
    expect(sql).toMatch(/sum\(h\.requests\)[\s\S]*from runtime\._ai_usage_hourly h/i);
  });

  it("the Acquisition table does not call spine run counts 'Requests'", () => {
    const src = read("features/admin/users/components/UserAcquisitionTableClient.tsx");
    expect(src).toContain("header: AGENT_RUNS_LABEL");
    expect(src).not.toMatch(/header:\s*"Requests"/);
  });
});
