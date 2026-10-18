/**
 * Which block text/rung/variant would run, from the server's own resolver (`GET /prompt-blocks/resolve`).
 * The client never re-implements the ladder or the conditions.
 */
import { callApi } from "@/lib/api/call-api";
import type { AppDispatch } from "@/lib/redux/store";
import type { PromptBlockReportEntry } from "./types";

export interface ResolvedBlocks {
  blocks: Record<string, string>;
  report: PromptBlockReportEntry[];
  /** Declared names with no row at any rung. */
  missing: string[];
}

export interface ResolveArgs {
  names: readonly string[];
  model: string;
  reasoning?: string | null;
  creator?: string | null;
  /** The agent (or version) whose blocks these are: the server reads its owning organization itself. */
  agentId?: string | null;
  agentIsVersion?: boolean;
}

export function resolveQueryPath(args: ResolveArgs): string {
  const q = new URLSearchParams();
  for (const n of args.names) q.append("names", n);
  q.set("model", args.model);
  if (args.reasoning) q.set("reasoning", args.reasoning);
  if (args.creator) q.set("creator", args.creator);
  if (args.agentId) {
    q.set("agent_id", args.agentId);
    if (args.agentIsVersion) q.set("agent_is_version", "true");
  }
  return `/prompt-blocks/resolve?${q.toString()}`;
}

/** Server refusal names the missing blocks (422 `prompt_block_missing`); the resolve call reports them as absent from `report`. */
export async function resolveBlocks(
  dispatch: AppDispatch,
  args: ResolveArgs,
): Promise<ResolvedBlocks> {
  if (args.names.length === 0) return { blocks: {}, report: [], missing: [] };
  const result = await dispatch(
    callApi({
      path: resolveQueryPath(args) as never,
      method: "GET",
      expectedErrorStatuses: [400, 404, 422],
    } as never),
  );
  if (result.error) {
    const text = JSON.stringify(result.error);
    const missing = args.names.filter((n) => text.includes(n));
    if (missing.length > 0) return { blocks: {}, report: [], missing };
    throw new Error("Could not check which block runs");
  }
  const data = (result.data ?? {}) as { blocks?: Record<string, string>; report?: PromptBlockReportEntry[] };
  const report = data.report ?? [];
  const found = new Set(report.map((r) => r.name));
  return { blocks: data.blocks ?? {}, report, missing: args.names.filter((n) => !found.has(n) && !(n in (data.blocks ?? {}))) };
}
