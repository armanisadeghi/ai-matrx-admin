/**
 * Compare in chat — the person's Confirm. The `compare` agent tool only finds and quotes; this is the
 * one door that starts the durable run it quoted (`POST /comparison/chat/start`). Idempotent on the
 * reserved run id, so a second click or a reload never starts a second paid run.
 */

import { postJson } from "@/lib/python-client";

import { ComparisonRefusal } from "./contract";

export async function startChatComparison(
  runId: string,
  request: unknown,
  opts: { organizationId: string; signal?: AbortSignal },
): Promise<void> {
  const organizationId = opts.organizationId?.trim();
  if (!organizationId) throw new ComparisonRefusal("organization_required", "This organization is not loaded yet.");
  try {
    await postJson<unknown>("/comparison/chat/start", { run_id: runId, request }, { organizationId, signal: opts.signal });
  } catch (err) {
    const e = err as { status?: number; userMessage?: string; message?: string; code?: string };
    if (typeof e?.status === "number") {
      throw new ComparisonRefusal(typeof e.code === "string" ? e.code : `http_${e.status}`,
        e.userMessage ?? e.message ?? "The comparison could not be started.");
    }
    throw err;
  }
}
