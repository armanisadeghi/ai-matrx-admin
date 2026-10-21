import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Guard (phase 1b): the Studio's doer is the `agent_studio.do_the_job_together` mandate — it never
 * resolves to the default chat holder, General Chat, or an agent id. Shown red on the pre-1b page.
 */
const dir = join(__dirname, "..", "components");
const page = readFileSync(join(dir, "AgentStudioPage.tsx"), "utf8");
const run = readFileSync(join(dir, "StudioRun.tsx"), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("the Studio doer", () => {
  it("never resolves to the default new chat or General Chat", () => {
    for (const src of [strip(page), strip(run)]) {
      expect(src).not.toMatch(/DEFAULT_NEW_CHAT_MANDATE_KEY/);
      expect(src).not.toMatch(/chat\.default_new_chat/);
      expect(src).not.toMatch(/General Chat/);
    }
  });

  it("launches through the mandate, never by a doer agent id", () => {
    expect(strip(page)).toMatch(/STUDIO_ASSISTANT_MANDATE/);
    expect(readFileSync(join(__dirname, "..", "workspace-api.ts"), "utf8")).toMatch(/"agent_studio\.do_the_job_together"/);
    expect(strip(page)).not.toMatch(/launchAgent\(doerId/);
    // Lane 5A: the canvas hook launches it, under the page's own `launch.mandateKey`.
    expect(strip(page)).toMatch(/launch: \{ mandateKey: ASSISTANT_MANDATE/);
    expect(strip(run)).not.toMatch(/launchMandate\(|launchAgent\(/);
  });

  it("runs on its own surface before an agent exists, so the server hands the assistant its workspace tool", () => {
    // Found live 2026-10-17: the run went out as client.surface "matrx-user/canvas" (the route's guess) and the
    // assistant never got studio_workspace. A mounted SurfaceRuntimeProvider is what the launch adopts.
    // Lane 5A: ONE stable provider whose surfaceName is the Studio's until an agent exists.
    expect(strip(page)).toMatch(/surfaceName=\{agentId \? AGENT_BUILDER_CONTEXT_MENU_PROPS\.surfaceName : STUDIO_SURFACE_NAME\}/);
  });
});
