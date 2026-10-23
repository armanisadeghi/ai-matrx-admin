"use client";

/**
 * InboxPage — /crm/inbox, the unified outreach inbox.
 *
 * A config on the ONE list shell (lib/entity-list), never a bespoke variant.
 * Everything visible is a view over crm.interaction; the doors out (the
 * contact, the campaign, the mailbox, the motivating record) are in the column
 * registry, and the reply action reuses the canonical send dialog.
 *
 * The agent surface is bound through the shell's own `surface` prop rather than
 * a hand-rolled provider: the shell already holds the rows, the scope, the
 * filters and the true total, so reading them from anywhere else would be a
 * second copy that can disagree with the screen.
 */

import { ListChecks } from "lucide-react";
import { EntityListPage } from "@/lib/entity-list/components/EntityListPage";
import type { ListPageAction } from "@/lib/entity-list/components/ListPageActions";
import { AssistStrip } from "@/features/assists/components/AssistStrip";
import {
  CRM_INBOX_SURFACE_NAME,
  createCrmInboxScope,
} from "@/features/surfaces/manifests/crm-inbox.manifest";
import { inboxListConfig } from "../listConfig";
import { INBOX_ASSIST_SURFACE } from "../constants";

/** The list's verbs, one list: the header draws them, the frame's "…" carries them. */
const INBOX_ACTIONS: ListPageAction[] = [
  { id: "chasebox", label: "Chasebox", icon: ListChecks, href: "/crm/chasebox" },
];

export function InboxPage() {
  return (
    <EntityListPage
      config={inboxListConfig}
      surface={{
        surfaceName: CRM_INBOX_SURFACE_NAME,
        getScope: (list) =>
          createCrmInboxScope({
            scope: list.query.scope.kind,
            search: list.query.search,
            active_filters: list.query.filters,
            total_replies: list.total,
            visible_replies: list.rows.map((row) => ({
              id: row.id,
              party_name: row.party_name,
              employer_name: row.employer_name,
              outreach_list_name: row.outreach_list_name,
              subject: row.subject,
              classification: row.classification,
              // The verdict AND what it was based on: a label with nothing
              // behind it is exactly what this surface must not hand an agent.
              evidence: row.evidence,
              member_status: row.member_status,
              handled: row.handled,
              occurred_at: row.occurred_at,
            })),
          }),
      }}
      notice={<AssistStrip surfaceName={INBOX_ASSIST_SURFACE} />}
      // The inbox answers "who replied"; the Chasebox answers "what needs me
      // now" across every queue, replies included. Each reaches the other.
      actions={INBOX_ACTIONS}
    />
  );
}
