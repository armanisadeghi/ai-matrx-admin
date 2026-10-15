/**
 * The retired /settings/* addresses only redirect on a FULL page load; a client-side <Link> or
 * router.push to one does nothing. Every in-app link points at the real /user-settings page.
 */
import { execSync } from "node:child_process";

const RETIRED =
  /["'`]\/settings(\?tab=|\/(profile|voice|integrations|google-workspace|sandbox|sandbox-storage|organizations|feedback|extension|access-requests|preferences)\b)/;

describe("in-app links to retired settings addresses", () => {
  it("none of the app's source names one", () => {
    const out = execSync(
      `grep -rnE "\\"/settings(\\?tab=|/(profile|voice|integrations|google-workspace|sandbox|sandbox-storage|organizations|feedback|extension|access-requests|preferences))" app features components lib hooks utils providers --include=*.ts --include=*.tsx || true`,
      { cwd: process.cwd(), encoding: "utf8" },
    );
    const hits = out
      .split("\n")
      .filter(Boolean)
      .filter((l) => !/__tests__|\.test\.|legacySettingsRedirects|page-cleanup-rows|\/marketing\/|websites\/\[siteId\]/.test(l))
      .filter((l) => RETIRED.test(l.replace(/^[^:]+:\d+:/, "")))
      .filter((l) => !/^\S+:\d+:\s*(\/\/|\*|\/\*)/.test(l));
    expect(hits).toEqual([]);
  });
});
