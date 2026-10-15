/**
 * What a schedule on a Matrx 2 computer DOES, read from the row itself: a `device_op` task keeps its
 * work in `sch_task.metadata.device_op` (`coding.start` with provider, cwd, prompt, account), never in
 * `sch_agent_task` — so a detail or edit screen that reads only the agent row shows an empty prompt
 * and "Platform default" for a schedule that is fully defined (the 2026-10-15 walk). Pure.
 */
export interface ComputerCodingWork {
  op: string;
  provider: "claude" | "codex";
  folder: string;
  prompt: string;
  accountProfileId: string | null;
  /** Everything else the row carries (tool, homes…), kept on save. */
  raw: Record<string, unknown>;
}

function record(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

export function computerWorkOf(metadata: unknown): ComputerCodingWork | null {
  const op = record(record(metadata)?.device_op);
  if (!op || typeof op.op !== "string") return null;
  const params = record(op.params) ?? {};
  return {
    op: op.op,
    provider: params.provider === "codex" ? "codex" : "claude",
    folder: typeof params.cwd === "string" ? params.cwd : "",
    prompt: typeof params.prompt === "string" ? params.prompt : "",
    accountProfileId: typeof params.account_profile_id === "string" ? params.account_profile_id : null,
    raw: op,
  };
}

/** The `device_op` block to store for edited coding work, keeping what the form does not edit. Pure. */
export function deviceOpWith(
  current: ComputerCodingWork | null,
  edit: { provider: "claude" | "codex"; folder: string; prompt: string; accountProfileId: string | null },
): Record<string, unknown> {
  const base = current?.raw ?? { op: "coding.start", tool: "coding_sessions_drive" };
  const oldParams = record(base.params) ?? {};
  const params: Record<string, unknown> = { ...oldParams, provider: edit.provider, cwd: edit.folder, prompt: edit.prompt };
  delete params.client_request_id;
  if (edit.accountProfileId) params.account_profile_id = edit.accountProfileId;
  else delete params.account_profile_id;
  return { ...base, op: base.op ?? "coding.start", params };
}
