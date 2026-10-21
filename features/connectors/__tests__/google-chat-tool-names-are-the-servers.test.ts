/**
 * THE NAMES GOOGLE'S CHAT SWITCH REMOVES ARE THE SERVER'S NAMES (defect K, round 2).
 *
 * The + menu switches Google off in a chat by putting `GOOGLE_CHAT_TOOL_NAMES` in the chat's removed
 * tools. A name the server renamed removes nothing, and the row keeps saying "off" while Google is
 * still in the chat — silently. This reads the SERVER SOURCE (the sibling aidream checkout) and fails
 * when a name is no longer declared there; `pnpm check:google-chat-tools` is the same question asked
 * of the live registry.
 *
 * Mutation: rename one of the three in `google-chat-connector.ts`, or in the server, and this goes RED.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GOOGLE_CHAT_TOOL_NAMES } from "../google-chat-connector";

const AIDREAM_ROOT = process.env.AIDREAM_DIR ?? join(process.cwd(), "..", "aidream");
const read = (...parts: string[]) => readFileSync(join(AIDREAM_ROOT, ...parts), "utf8");
const haveServer = existsSync(join(AIDREAM_ROOT, "aidream", "tools", "_generated_declarations.py"));
const serverIt = haveServer ? it : it.skip;

it("removes exactly the three names the server's Google tools go by", () => {
  expect([...GOOGLE_CHAT_TOOL_NAMES].sort()).toEqual(["bundle:list_google", "google_email_send", "google_workspace"]);
});

describe("the server still has each one", () => {
  serverIt("google_workspace is a declared server tool", () => {
    expect(read("aidream", "tools", "_generated_declarations.py")).toMatch(/_reg\(\s*"google_workspace",/);
  });

  serverIt("google_workspace and google_email_send are the Google tools the workflow door exposes together", () => {
    const manifest = read("aidream", "services", "workflow_exposure", "manifest.py");
    expect(manifest).toMatch(/tool_names=\{[^}]*"google_email_send"[^}]*\}/);
    expect(manifest).toMatch(/tool_names=\{[^}]*"google_workspace"[^}]*\}/);
  });

  serverIt("google_email_send is a client tool the chat package names", () => {
    expect(read("apps", "shared", "chat", "src", "agents", "ui-first-tools", "tools", "names.ts")).toContain("google_email_send");
  });

  serverIt("bundle:list_google is a surface bundle the server merges into a chat", () => {
    expect(read("aidream", "services", "tooling", "tool_merge.py")).toContain("bundle:list_google");
  });
});
