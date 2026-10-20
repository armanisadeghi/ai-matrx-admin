// features/spaces/data/install-host.ts — the install helpers every Spaces template shares: the
// gallery's host steps after custom.template_install (its assistant, extra agents, workflows), an
// upgrade's counts in words, and the organization a saved page is filed in. The tables themselves are
// installed by templates/use-pack.ts (`installTemplateTables`), the one door for every library pack.

import { storeDoors } from "@ai-matrx/records/core";
import type { TemplateDoorAnswer } from "@ai-matrx/records/templates";

import { addInstalledAgent, hostStepsPending, type Claim } from "@/features/make/gallery/installAgent";
import { templateAgentArchiver, templateAgentCopier, templateWorkflowCreator } from "@/features/templates/agentCopyHost";
import { templateKnob } from "@/features/templates/knobs";
import { setWorkflowFlag } from "@/features/workflow-runtime/browse/service";
import type { AppDispatch } from "@/lib/redux/store";
import { createClient } from "@/utils/supabase/client";

/** The gallery's host steps after template_install (its agent, extra agents, workflows), with the
 *  same ports the gallery's TemplatePreview builds. Throws, by name, when the assistant was not made. */
export async function runHostSteps(answer: TemplateDoorAnswer, orgId: string, dispatch: AppDispatch, what = "The template's assistant"): Promise<void> {
  if (!hostStepsPending(answer)) return;
  const supabase = createClient();
  const result = await addInstalledAgent(answer, orgId, {
    copier: templateAgentCopier(dispatch),
    extraCopier: templateAgentCopier(dispatch, { attachRecordsTool: false }),
    createWorkflow: templateWorkflowCreator(dispatch),
    archiveAgent: templateAgentArchiver(dispatch),
    archiveWorkflow: (workflowId) => setWorkflowFlag(workflowId, { is_archived: true }),
    claim: async (installId, kind, label, sourceId) => {
      const lease = await templateKnob("run_lease_seconds");
      const { data, error } = await storeDoors(supabase).templateInstallClaim({ organizationId: orgId, installId, kind, label, sourceId, leaseSeconds: lease });
      if (error) throw new Error(error.message);
      const claim = (data as unknown as { claim: Claim & { claimed_at?: string } }).claim;
      if (claim.state !== "held") return claim;
      const at = claim.claimed_at ? Date.parse(claim.claimed_at) + lease * 1000 : NaN;
      return { state: "held", retryAt: Number.isFinite(at) ? new Date(at).toISOString() : null };
    },
    note: async (installId, agentId, label, kind) => {
      const { data, error } = await storeDoors(supabase).templateInstallNote({ organizationId: orgId, installId, kind: kind ?? "agent", id: agentId, label });
      if (error) throw new Error(error.message);
      return data as TemplateDoorAnswer;
    },
  });
  if (!result.ok) throw new Error(`${what} was not made: ${result.why}`);
}

/**
 * TEMPLATE-INSTALL-3: tell the install the root page it made (`custom.template_install_note`, kind `page`), so Remove moves the page and its
 * sub-pages to Trash and Restore brings them back. Noting the same page twice is one record.
 */
export async function noteTemplatePage(orgId: string, installId: string, root: { id: string; title?: string | null }): Promise<void> {
  const { error } = await storeDoors(createClient()).templateInstallNote({ organizationId: orgId, installId, kind: "page", id: root.id, label: root.title || "Untitled" });
  if (error) throw new Error(`We couldn't record the template's page: ${error.message}`);
}

/** What an upgrade did, in words: "1 table, 1 field converted, 1 field retired, 1 view, 4 rows, 4 links". */
export function upgradeCountsText(counts: Record<string, number> | undefined): string {
  const words: Record<string, [string, string]> = {
    tables: ["table", "tables"],
    fields: ["field", "fields"],
    fields_converted: ["field converted", "fields converted"],
    fields_retired: ["field retired", "fields retired"],
    views: ["view", "views"],
    dashboards: ["dashboard", "dashboards"],
    rows: ["row", "rows"],
    links: ["link", "links"],
    targets_created: ["linked record made", "linked records made"],
  };
  // `kept` (steps already done) is not a change; the rest in the order Notion would read them.
  const parts = Object.keys(words)
    .map((k) => [k, counts?.[k] ?? 0] as const)
    .concat(Object.entries(counts ?? {}).filter(([k]) => !(k in words) && k !== "kept"))
    .filter(([, n]) => typeof n === "number" && n > 0)
    .map(([k, n]) => `${n} ${(words[k] ?? [k.replace(/_/g, " "), k.replace(/_/g, " ")])[n === 1 ? 0 : 1]}`);
  return parts.length ? parts.join(", ") : "nothing needed changing";
}

/** The organization a saved page is filed in — a template's tables are installed beside the page that
 *  shows them (the source picker's sample tables ask this). Null: no saved page. */
export async function pageOrganizationId(spaceId: string): Promise<string | null> {
  const { data, error } = await createClient().schema("content").from("document").select("organization_id").eq("id", spaceId).maybeSingle();
  if (error) throw new Error(`We couldn't read the page's organization: ${error.message}`);
  return data?.organization_id ?? null;
}
