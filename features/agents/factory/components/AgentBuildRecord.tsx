"use client";

/**
 * A kept agent's build record and first-runs status, where the person works on the agent (the Studio's
 * Versions tab). Until 2026-10-21 both lived only on the admin build page; the Studio showed nothing.
 * One read of `agent.definition.metadata` (`agent_factory_build`, `agent_factory_first_runs`) under the
 * reader's RLS. An agent with no build record renders nothing; a failed read says so.
 */

import { useEffect, useState } from "react";
import { ErrorNotice, RecordId } from "@ai-matrx/design-system";
import { Badge, PropertyRow } from "@ai-matrx/design-system/controls";
import { humanizeIdentifier } from "@ai-matrx/kit/text-case";
import { createClient } from "@/utils/supabase/client";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdmin } from "@/lib/redux/selectors/userSelectors";
import { noticeTabHref } from "@/lib/notice-open/openFromNotice";
import { FACTORY_BASE_PATH } from "./FactoryBuildsPage";
import { buildPageHref, buildRecordOf, type AgentBuildRecordView } from "../build-record";

export function AgentBuildRecord({ agentId }: { agentId: string }) {
  // Admin POWER is true only inside the admin section; on the Studio (a member's page) everyone gets their own page.
  const isAdmin = useAppSelector(selectIsAdmin);
  const [state, setState] = useState<{ id: string; record: AgentBuildRecordView | null; error: unknown } | null>(null);
  useEffect(() => {
    let live = true;
    void createClient()
      .schema("agent")
      .from("definition")
      .select("metadata")
      .eq("id", agentId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!live) return;
        setState({ id: agentId, record: error ? null : buildRecordOf(data?.metadata), error });
      });
    return () => {
      live = false;
    };
  }, [agentId]);
  if (!state || state.id !== agentId) return null;
  if (state.error) {
    return <ErrorNotice size="inline" title="The build record did not load" error={state.error} operation="Load build record" />;
  }
  const record = state.record;
  if (!record) return null;
  return (
    <div className="flex flex-col gap-2" data-testid="studio-build-record">
      <PropertyRow
        label="Build"
        value={<Badge tone={record.outcomeTone}>{humanizeIdentifier(record.outcome) || record.outcome}</Badge>}
        meta={
          record.buildId ? (
            <RecordId value={record.buildId} label="Build" href={noticeTabHref(buildPageHref(record.buildId, isAdmin, FACTORY_BASE_PATH))} />
          ) : null
        }
      />
      {record.firstRuns ? (
        <PropertyRow
          label="First runs"
          value={<Badge tone={record.firstRuns.tone}>{record.firstRuns.text}</Badge>}
        />
      ) : null}
    </div>
  );
}
