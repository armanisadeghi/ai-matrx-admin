/**
 * What a schedule on a Matrx 2 computer DOES, read from the row itself: a `device_op` task keeps its
 * work in `sch_task.metadata.device_op` (`coding.start` with provider, cwd, prompt, account), never in
 * `sch_agent_task` — so a detail or edit screen that reads only the agent row shows an empty prompt
 * and "Platform default" for a schedule that is fully defined (the 2026-10-15 walk). Pure.
 */
export interface ComputerWorkHome {
  token: "project" | "task" | "war_room";
  id: string;
  label: string;
}

function homesOf(v: unknown): ComputerWorkHome[] {
  return Array.isArray(v)
    ? v.flatMap((h) => {
        const r = record(h);
        return r && (r.token === "project" || r.token === "task" || r.token === "war_room") && typeof r.id === "string"
          ? [{ token: r.token, id: r.id, label: typeof r.label === "string" ? r.label : r.id }]
          : [];
      })
    : [];
}

export interface ComputerCodingWork {
  op: string;
  provider: "claude" | "codex";
  folder: string;
  prompt: string;
  accountProfileId: string | null;
  /** Where each run's chat is filed (project, task, War Room): `device_op.homes`. */
  homes: ComputerWorkHome[];
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
    homes: homesOf(op.homes),
    raw: op,
  };
}

/** The `device_op` block to store for edited coding work, keeping what the form does not edit. Pure. */
export function deviceOpWith(
  current: ComputerCodingWork | null,
  edit: { provider: "claude" | "codex"; folder: string; prompt: string; accountProfileId: string | null; homes?: ComputerWorkHome[] },
): Record<string, unknown> {
  const base = current?.raw ?? { op: "coding.start", tool: "coding_sessions_drive" };
  const oldParams = record(base.params) ?? {};
  const params: Record<string, unknown> = { ...oldParams, provider: edit.provider, cwd: edit.folder, prompt: edit.prompt };
  delete params.client_request_id;
  if (edit.accountProfileId) params.account_profile_id = edit.accountProfileId;
  else delete params.account_profile_id;
  const out: Record<string, unknown> = { ...base, op: base.op ?? "coding.start", params };
  if (edit.homes) {
    if (edit.homes.length) out.homes = edit.homes;
    else delete out.homes;
  }
  return out;
}

/** How a home reads on the detail: the name the home chooser stored, never its id. Pure. */
export function homeLabel(h: ComputerWorkHome): string {
  return h.label && h.label !== h.id ? h.label : `A ${h.token.replace("_", " ")}`;
}

/**
 * What a schedule on a computer is, as one label (the list row): a coding session there, or an agent
 * bound to it. Null for a cloud schedule. Pure.
 */
export function computerScheduleLabel(
  task: { kind: string; targetDeviceId?: string | null; surfaces: readonly string[]; deviceOp?: ComputerCodingWork | null },
  computerName: string | null,
): string | null {
  const onComputer = task.targetDeviceId != null || (task.surfaces.length === 1 && task.surfaces[0] === "desktop");
  if (!onComputer) return null;
  const name = computerName ?? "your computer";
  return task.deviceOp || task.kind === "device_op" ? `Coding session on ${name}` : `Agent on ${name}`;
}
