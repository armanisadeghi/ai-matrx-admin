// features/rich-document/code-block/code-run.ts
//
// "Run" for a code block rides the platform's EXISTING execution path — the
// conversation's bound sandbox and `/api/sandbox/<id>/exec` (the same route
// the /code terminal's SandboxProcessAdapter uses). No binding, or a language
// with no interpreter there → the action is absent, never dead.
//
// The code travels as STDIN to a fixed interpreter command, never spliced
// into the command line, so nothing in the code can escape the shell.

import type { ProcessResult } from "@/features/code/types";

// The interpreter table and the runnable-sandbox rule are the chat package's (the "Run in
// sandbox" row lives there); this module is this app's run through the sandbox exec route.
import { runCommandFor } from "@ai-matrx/chat/agents/components/messages-display/rich-document/actions/code-run";
export { runCommandFor, runnableSandboxId } from "@ai-matrx/chat/agents/components/messages-display/rich-document/actions/code-run";

export interface CodeRunResult extends ProcessResult {
  command: string;
  durationMs: number;
}

/** Execute the code in the bound sandbox. Throws with the server's reason. */
export async function runCodeInSandbox(args: {
  sandboxId: string;
  language: string;
  code: string;
  timeoutSec?: number;
}): Promise<CodeRunResult> {
  const command = runCommandFor(args.language);
  if (!command) throw new Error(`No interpreter for ${args.language}`);
  const { SandboxProcessAdapter } = await import(
    "@/features/code/adapters/SandboxProcessAdapter"
  );
  const adapter = new SandboxProcessAdapter(args.sandboxId);
  const started = performance.now();
  const result = await adapter.exec(command, {
    stdin: args.code,
    timeoutSec: args.timeoutSec ?? 60,
  });
  return { ...result, command, durationMs: Math.round(performance.now() - started) };
}
