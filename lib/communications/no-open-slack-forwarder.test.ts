/**
 * ADV-3 C3: no route forwards a caller's Slack token to a caller-chosen Slack method. `app/api/slack-proxy` (and before
 * it `app/api/slack/proxy`) did exactly that — `https://slack.com/api/${endpoint}` with the body's token, no sign-in —
 * and nothing called either. Slack reads and writes go through the server's own Slack integration with the person's
 * stored connection. This scans every tracked app/ and lib/ source for that open-forwarder shape.
 */
import { execFileSync } from "node:child_process";

test("no route forwards a caller-supplied endpoint to the Slack API", () => {
  let hits = "";
  try {
    hits = execFileSync("git", ["grep", "-nE", "slack\\.com/api/\\$\\{", "--", "app", "lib", "features", "utils", ":!*.test.ts"], {
      encoding: "utf8",
    });
  } catch (error) {
    // git grep exits 1 when nothing matches — the green case.
    if ((error as { status?: number }).status !== 1) throw error;
  }
  expect(hits.trim()).toBe("");
});
