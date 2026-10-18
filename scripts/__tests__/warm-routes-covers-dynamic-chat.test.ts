/**
 * The release warm-up GETs the dynamic chat routes once each (review A1, 2026-10-18): the first
 * agent switch after a release paid a 3-6 s cold start on `/chat/a/[agentId]` because only static
 * top-level folders were warmed. Each warmed dynamic URL must resolve to a real route folder.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

describe("warm-routes", () => {
  it("warms /chat/a/<agent> and /chat/<conversation>, each backed by a real dynamic route", () => {
    const repo = join(__dirname, "..", "..");
    // The script is ESM; read its route list the way the release runs it (node), not through Jest.
    const routes: string[] = JSON.parse(
      execFileSync(
        process.execPath,
        ["--input-type=module", "-e", "import('./scripts/warm-routes.mjs').then((m) => console.log(JSON.stringify(m.coreRoutes())))"],
        { cwd: repo, encoding: "utf8" },
      ),
    );
    const agent = routes.find((r) => /^\/chat\/a\/[0-9a-f-]{36}$/.test(r));
    const convo = routes.find((r) => /^\/chat\/[0-9a-f-]{36}$/.test(r));
    expect(agent).toBeDefined();
    expect(convo).toBeDefined();
    const core = join(__dirname, "..", "..", "app", "(core)", "chat");
    expect(existsSync(join(core, "a", "[agentId]", "page.tsx"))).toBe(true);
    expect(existsSync(join(core, "[conversationId]", "page.tsx"))).toBe(true);
  });
});
