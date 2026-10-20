// features/make/gallery/installAgent.ts — the host's steps of a template install: agents and workflows.
//
// `custom.template_install` makes tables, views, forms and a dashboard, then answers an `agent`
// object ({copied:false}) because copying a platform agent is the host's step. This runs the
// copier as the signed-in person, then records the copy on the install through
// `custom.template_install_note` so the answer lists it (and Remove archives it).
//
// Kits → Template merge (2026-10-04): a template may also carry full merge-field bindings on its
// agent's variables, extra agents and workflows. The door's answer then has a `host` block (the
// plan's extras and the ids to resolve them: `tables.<token>`, `row.<token>.<row key>`). Each extra
// agent is copied and noted (kind 'agent'), each workflow created through aidream `POST /workflows`
// with `{{table:…}}` / `{{agent:…}}` resolved and noted (kind 'workflow'). A re-open resumes:
// what the install already lists (by its title) is never made twice.
//
// CLAIM, THEN CREATE (2026-10-05): every agent and workflow is first CLAIMED on the install
// (`custom.template_install_claim`, kind + title) and only then created, so a page closed between
// the create and the note leaves a claim, not an unrecorded copy. A re-open taking over a stale
// claim gets the orphans that run made: the first is finished and recorded, any others archived.
// A fresh claim held by another tab stops this run with a sentence — it never creates beside it.
//
// ONE RUN PER INSTALL, AND A HOLD IS WAITED OUT (READ-SPEED-ORG, 2026-10-19). The first Nonprofit install
// said "… is being made in another tab or window" when no other tab existed: two runs of the host steps for
// the SAME install were in flight in ONE tab (a remount re-ran the install while the first run's steps were
// still going — the stopped run's host calls are not cut off), so the second met the first's fresh claim.
// Now (1) a second call for an install whose host steps are already running in this tab joins that run
// instead of claiming beside it, and (2) a claim held elsewhere is waited out — re-asked until it is made
// (then used) or its lease runs out (then taken over) — and only a hold that outlives its lease is refused.

import type { TemplateDoorAnswer } from "@ai-matrx/records/templates";
import type { TemplateAgentBinding, TemplateAgentCopier } from "@/features/templates/agentCopy";
import { buildMergeFieldBinding, resolveIdPlaceholders, type MergeBindingResolver, type MergeFieldBinding } from "./mergeBinding";

export type InstallAnswer = TemplateDoorAnswer;

// The plan's host parts as the door answers them (@ai-matrx/records >= 0.70.0 templates/extras.ts:
// TemplatePlanBinding / TemplatePlanExtraAgent / TemplateWorkflow), read structurally from the
// answer so an older package or a template without them reads as "nothing to do".
export interface TemplatePlanBinding {
  semantic: "collection" | "reference" | "value";
  table: string;
  rowKey?: string;
  field?: string;
  transform?: { name: string; template?: string; join?: string; max?: number; header?: string };
  limit?: number;
  sort?: { field: string; dir: "asc" | "desc" };
  match?: Record<string, unknown>;
  missing?: string;
}
export interface TemplatePlanExtraAgent {
  key: string;
  platformAgent: { id: string; name: string };
  name: string;
  bindings: Array<{ variable: string; describes: string; binding: TemplatePlanBinding }>;
}
export interface TemplateWorkflow {
  key: string;
  name: string;
  description: string;
  definition: unknown;
}
type HostBlock = { extra_agents?: TemplatePlanExtraAgent[] | null; workflows?: TemplateWorkflow[] | null; ids?: Record<string, string> } | null;

type Made = { kind: string; id: string | null; title: string | null; ref?: string };

function madeOf(answer: InstallAnswer, kind: "agent" | "workflow"): Made[] {
  return ((answer.made ?? []) as Made[]).filter((m) => m.kind === kind && m.id);
}

function hostOf(answer: InstallAnswer) {
  const host = (answer["host"] ?? null) as HostBlock;
  return {
    extras: (host?.extra_agents ?? []) as TemplatePlanExtraAgent[],
    workflows: (host?.workflows ?? []) as TemplateWorkflow[],
    ids: (host?.ids ?? {}) as Record<string, string>,
  };
}

/**
 * The platform agent an answer's `agent` names. Every template door answers its agent in ONE shape
 * (`{name, copied, platform_agent, bindings:[{variable, tableToken, table_id}]}`, the store's one
 * helper since 2026-10-06). A template may name none: null, and the caller says so.
 */
function platformAgentOf(agent: object): { id: string; name: string } | null {
  return (agent as { platform_agent?: { id: string; name: string } | null }).platform_agent ?? null;
}

/** True when the install answered an agent the host still has to copy. */
export function agentStillToCopy(answer: InstallAnswer): boolean {
  if (!answer.agent || answer.agent.copied) return false;
  // An agent already recorded on the install (a re-open) is never copied twice.
  return !madeOf(answer, "agent").length;
}

/** True when any host step (the agent, an extra agent, a workflow) is still to be made. */
export function hostStepsPending(answer: InstallAnswer): boolean {
  if (agentStillToCopy(answer)) return true;
  const { extras, workflows } = hostOf(answer);
  const agents = new Set(madeOf(answer, "agent").map((m) => m.title));
  const flows = new Set(madeOf(answer, "workflow").map((m) => m.title));
  return extras.some((a) => !agents.has(a.name)) || workflows.some((w) => !flows.has(w.name));
}

/** The ids the install made, as the shared binding builder reads them. */
export function installResolver(answer: InstallAnswer): MergeBindingResolver {
  const { ids } = hostOf(answer);
  const made = (answer.made ?? []) as Made[];
  return {
    tableId: (token) => ids[`tables.${token}`] ?? made.find((m) => m.kind === "table" && m.ref === `tables.${token}`)?.id ?? null,
    recordId: (token, row) => (typeof row === "string" ? ids[`row.${token}.${row}`] : null),
  };
}

/** A plan binding (template-local handles) → the installed merge-field binding. */
export function installedBinding(b: TemplatePlanBinding, resolver: MergeBindingResolver): MergeFieldBinding {
  return buildMergeFieldBinding(
    {
      semantic_type: b.semantic,
      ...(b.field ? { field_key: b.field } : {}),
      ...(b.transform ? { transform: b.transform } : {}),
      ...(b.limit !== undefined ? { limit: b.limit } : {}),
      ...(b.sort ? { sort: b.sort } : {}),
      ...(b.match ? { match: b.match } : {}),
      ...(b.missing ? { missing: b.missing } : {}),
    },
    b.table,
    b.rowKey,
    resolver,
  );
}

export interface AddAgentPorts {
  copier: TemplateAgentCopier;
  /** The copier for extra agents (kits never gave them the records tool). Default: `copier`. */
  extraCopier?: TemplateAgentCopier;
  /** `custom.template_install_note`: records a copy (or, with kind 'workflow', a workflow) and answers the install again. */
  note: (installId: string, id: string, label: string, kind?: "workflow") => Promise<InstallAnswer>;
  /** Archives an agent an interrupted run made twice. */
  archiveAgent?: (agentId: string) => Promise<void>;
  /**
   * `custom.template_install_claim`: claims (kind, title) on the install BEFORE it is created.
   * Answers `made` (already recorded: its id), `held` (another tab is making it) or `claimed`
   * (go ahead; `orphans` = what an interrupted run made and never recorded).
   */
  claim: (installId: string, kind: "agent" | "workflow", label: string, sourceId: string | null) => Promise<Claim>;
  /** Archives a workflow an interrupted run made twice. */
  archiveWorkflow?: (workflowId: string) => Promise<void>;
  /** aidream `POST /workflows` in `organizationId`, as the person. Returns the workflow's id. */
  createWorkflow?: (organizationId: string, workflow: { name: string; description: string; definition: unknown }) => Promise<string>;
  /**
   * True when the recorded copy's variables carry what the template binds. A copy an earlier run made and recorded, then failed to
   * connect, is not a finished assistant: it is finished again, never taken as done. Absent: a recorded copy is trusted.
   */
  agentFinished?: (agentId: string, bindings: TemplateAgentBinding[]) => Promise<boolean>;
  /** Waits `ms` before a held claim is asked again. Default: a timer. */
  wait?: (ms: number) => Promise<void>;
}

export type Claim =
  | { state: "made"; id: string }
  | { state: "held"; retryAt: string | null }
  | { state: "claimed"; orphans: string[] };

/** Another tab holds the claim; `retryAt` is when its hold runs out (null when unknown). */
export class HeldElsewhere extends Error {
  constructor(what: string, readonly retryAt: string | null) {
    super(`"${what}" is being made in another tab or window.`);
  }
}

/** How often a held claim is asked again, and how long past its lease it may stay held before the run gives up. */
const HELD_POLL_MS = 2_000;
const HELD_GRACE_MS = 5_000;
const HELD_UNKNOWN_MS = 200_000;

/**
 * Claims (kind, label), waiting out a hold: asked again every HELD_POLL_MS until it is made (that id is used) or
 * claimed (its lease ran out: taken over). Throws HeldElsewhere only when the hold outlives its lease.
 */
async function claimWaitingOutHolds(ports: AddAgentPorts, installId: string, kind: "agent" | "workflow", label: string, sourceId: string | null): Promise<Exclude<Claim, { state: "held" }>> {
  const wait = ports.wait ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let deadline: number | null = null;
  for (;;) {
    const claim = await ports.claim(installId, kind, label, sourceId);
    if (claim.state !== "held") return claim;
    const until = claim.retryAt ? Date.parse(claim.retryAt) + HELD_GRACE_MS : NaN;
    deadline ??= Number.isFinite(until) ? until : Date.now() + HELD_UNKNOWN_MS;
    if (Date.now() >= deadline) throw new HeldElsewhere(label, claim.retryAt);
    await wait(Math.max(0, Math.min(HELD_POLL_MS, deadline - Date.now())));
  }
}

export type AddAgentResult = { ok: true; answer: InstallAnswer } | { ok: false; why: string; answer: InstallAnswer; retryAt?: string | null };

async function copyAndNote(
  copier: TemplateAgentCopier,
  ports: AddAgentPorts,
  installId: string,
  organizationId: string,
  agent: { platformAgentId: string; platformAgent: string; name: string; bindings: TemplateAgentBinding[] },
): Promise<{ answer: InstallAnswer; agentId: string }> {
  const claim = await claimWaitingOutHolds(ports, installId, "agent", agent.name, agent.platformAgentId || null);
  if (claim.state === "made") return { agentId: claim.id, answer: await ports.note(installId, claim.id, agent.name) };
  const [adopt, ...extra] = claim.orphans;
  let created: string | null = adopt ?? null;
  try {
    // Copies an interrupted run made twice: archived, so exactly one stays.
    for (const id of extra) await ports.archiveAgent?.(id);
    const made = await copier({
      organizationId,
      ...agent,
      ...(adopt ? { existingAgentId: adopt } : {}),
      onCreated: (id) => {
        created = id;
      },
    });
    return { agentId: made.agentId, answer: await ports.note(installId, made.agentId, agent.name) };
  } catch (err) {
    // A half-made copy is still recorded, so Remove archives it.
    if (created) await ports.note(installId, created, agent.name).catch(() => undefined);
    throw err;
  }
}

/** The host steps running in this tab, by install: a second call for the same install joins the first. */
const running = new Map<string, Promise<AddAgentResult>>();

export async function addInstalledAgent(
  answer: InstallAnswer,
  organizationId: string,
  ports: AddAgentPorts,
): Promise<AddAgentResult> {
  const installId = answer.install_id;
  if (!installId) return { ok: true, answer };
  const already = running.get(installId);
  if (already) return already;
  const run = hostSteps(answer, installId, organizationId, ports).finally(() => running.delete(installId));
  running.set(installId, run);
  return run;
}

/** The template agent's bindings as the copier takes them: each variable with the table this install made for it. */
function agentBindingsOf(agent: NonNullable<InstallAnswer["agent"]>, resolver: MergeBindingResolver): TemplateAgentBinding[] {
  return (agent.bindings ?? []).map((b) => {
    const full = b["binding"] as TemplatePlanBinding | undefined;
    return {
      variable: String(b["variable"] ?? ""),
      tableToken: String(b["tableToken"] ?? ""),
      tableId: String(b["table_id"] ?? ""),
      describes: String(b["describes"] ?? ""),
      ...(full ? { binding: installedBinding(full, resolver) } : {}),
    };
  });
}

async function hostSteps(answer: InstallAnswer, installId: string, organizationId: string, ports: AddAgentPorts): Promise<AddAgentResult> {
  let current = answer;
  try {
    const resolver = installResolver(answer);
    const agentIds: Record<string, string> = {};

    // 1 — the template's agent.
    const agent = answer.agent;
    if (agent && agentStillToCopy(current)) {
      const platform = platformAgentOf(agent);
      if (!platform) throw new Error(`The template's assistant "${agent.name}" does not say which assistant to copy.`);
      const done = await copyAndNote(ports.copier, ports, installId, organizationId, {
        platformAgent: platform.name,
        platformAgentId: platform.id,
        name: agent.name,
        bindings: agentBindingsOf(agent, resolver),
      });
      current = done.answer;
      agentIds["agent"] = done.agentId;
    } else if (agent) {
      const prior = madeOf(current, "agent").find((m) => m.title === agent.name) ?? madeOf(current, "agent")[0];
      if (prior?.id) {
        agentIds["agent"] = prior.id;
        const platform = platformAgentOf(agent);
        const bindings = agentBindingsOf(agent, resolver);
        if (platform && ports.agentFinished && !(await ports.agentFinished(prior.id, bindings))) {
          // Recorded, never connected: connect it now (it is already on the install, so no second claim or note).
          await ports.copier({
            organizationId,
            platformAgent: platform.name,
            platformAgentId: platform.id,
            name: agent.name,
            bindings,
            existingAgentId: prior.id,
            onCreated: () => undefined,
          });
        }
      }
    }

    // 2 — extra agents, each bound through the same builder.
    const { extras, workflows, ids } = hostOf(answer);
    for (const extra of extras) {
      const prior = madeOf(current, "agent").find((m) => m.title === extra.name);
      if (prior?.id) {
        agentIds[extra.key] = prior.id;
        continue;
      }
      const done = await copyAndNote(ports.extraCopier ?? ports.copier, ports, installId, organizationId, {
        platformAgent: extra.platformAgent.name,
        platformAgentId: extra.platformAgent.id,
        name: extra.name,
        bindings: extra.bindings.map((b) => {
          const binding = installedBinding(b.binding, resolver);
          return { variable: b.variable, tableToken: b.binding.table, tableId: binding.table_id, describes: b.describes, binding };
        }),
      });
      current = done.answer;
      agentIds[extra.key] = done.agentId;
    }

    // 3 — workflows, placeholders resolved to what this install made.
    if (workflows.length) {
      const tables = Object.fromEntries(Object.entries(ids).filter(([k]) => k.startsWith("tables.")).map(([k, v]) => [k.slice(7), v]));
      for (const wf of workflows) {
        if (madeOf(current, "workflow").some((m) => m.title === wf.name)) continue;
        if (!ports.createWorkflow) throw new Error(`The workflow "${wf.name}" could not be made: this screen cannot create workflows.`);
        const claim = await claimWaitingOutHolds(ports, installId, "workflow", wf.name, null);
        let workflowId: string;
        if (claim.state === "made") workflowId = claim.id;
        else if (claim.orphans.length) {
          const [adopt, ...extra] = claim.orphans as [string, ...string[]];
          for (const id of extra) await ports.archiveWorkflow?.(id);
          workflowId = adopt;
        } else {
          const definition = resolveIdPlaceholders(wf.definition, { table: tables, agent: agentIds });
          workflowId = await ports.createWorkflow(organizationId, { name: wf.name, description: wf.description, definition });
        }
        current = await ports.note(installId, workflowId, wf.name, "workflow");
      }
    }
    return { ok: true, answer: current };
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    return { ok: false, why, answer: current, ...(err instanceof HeldElsewhere ? { retryAt: err.retryAt } : {}) };
  }
}

/** The copied agents an uninstall left for the host to archive. */
export function agentsLeftBy(answer: InstallAnswer): string[] {
  return ((answer.left ?? []) as Array<{ kind?: string; id?: string | null }>)
    .filter((l) => l.kind === "agent" && l.id)
    .map((l) => l.id as string);
}
