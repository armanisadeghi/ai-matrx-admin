"use client";

// features/ai-work/conversations/useConversationRowActions.tsx
//
// The behavior half of /work/conversations, bridged to the entity-list shell.
//
// There is exactly ONE conversation action list in this repo
// (`buildConversationMenu`), consumed identically by the chat sidebar, /code
// history, the agent-run sidebars and the floating windows. This surface
// consumes that same builder — three divergent hard-coded action lists for one
// entity is the defect the entity-list doctrine exists to kill.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AssociationPicker, useAssociationsStore } from "@ai-matrx/associations/react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { buildConversationMenu } from "@ai-matrx/chat/agents/components/conversation-actions/conversationActionRegistry";
import { toast } from "@/lib/toast";
import { setConversationFavorite } from "@ai-matrx/chat/agents/redux/conversation-list/conversation-row-actions.thunks";
import { useAssociations } from "@/features/scopes/hooks/useAssociations";
import type {
  EntityListController,
  EntityRowActionsResult,
} from "@/lib/entity-list/config";
import { isCodePluginSourceApp } from "@/features/ai-work/lib/providerSource";
import type { ConversationBrowseRow } from "./types";
import { applyAudience } from "./types";
import { onBulkProjectAsked } from "./conversationBulkActions";
import { conversationTitleText } from "@/features/content-ir/surfaces/kind-text-label";

/**
 * Where a conversation NATURALLY opens.
 *
 * An agentless provider mirror cannot run, so runnable chat is not its home;
 * an AI Matrx conversation's home is chat. The provenance view at
 * /work/conversations/[id] serves BOTH and is reachable from the row menu, so
 * neither kind is a dead end.
 */
export function conversationHomeHref(row: ConversationBrowseRow): string {
  return isCodePluginSourceApp(row.source_app)
    ? `/work/conversations/${row.id}`
    : `/chat/${row.id}`;
}

export function conversationProvenanceHref(row: ConversationBrowseRow): string {
  return `/work/conversations/${row.id}`;
}

export function useConversationRowActions(
  list: EntityListController<ConversationBrowseRow>,
): EntityRowActionsResult<ConversationBrowseRow> {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [projectPickerRow, setProjectPickerRow] =
    useState<ConversationBrowseRow | null>(null);
  // "Add to project…" on a SELECTION (conversationBulkActions.ts) opens the SAME picker for every ticked row.
  const associations = useAssociationsStore();
  const [bulkProjectRows, setBulkProjectRows] = useState<ConversationBrowseRow[] | null>(null);
  useEffect(() => onBulkProjectAsked(setBulkProjectRows), []);
  const projectRelationships = useAssociations({
    type: "conversation",
    id: projectPickerRow?.id ?? null,
  });
  const attachedProjectIds = new Set(
    projectRelationships.edges
      .filter(
        (edge) =>
          edge.direction === "outgoing" && edge.otherType === "project",
      )
      .map((edge) => edge.otherId),
  );

  // No manual memoization — the React Compiler owns it (CLAUDE.md).
  const menuFor = (row: ConversationBrowseRow) => () =>
    buildConversationMenu({
      conversationId: row.id,
      title: row.title,
      isFavorite: row.is_favorite,
      isArchived: row.is_archived,
      excludeFromKg: false,
      href: conversationHomeHref(row),
      showRename: false,
      showFavorite: row.is_owner,
      // A provider binding survives the conversation, so deleting the
      // conversation would leave the coding session pointing at nothing.
      showDelete: !row.provider,
      source: {
        app: row.source_app,
        feature: row.source_feature,
        originClass: row.origin_class,
        // Row-level pruning writes the SAME filter bag the header and the
        // audience control write — one vocabulary, three entry points.
        onShowOnly: row.source_app
          ? () =>
              list.setFilters({
                ...list.query.filters,
                source_app: { kind: "select", values: [row.source_app] },
              })
          : undefined,
        // "Hide" returns to the honest default — the person's own chats —
        // which is the one bucket where a machine row can never appear.
        onHide: () => list.setFilters(applyAudience(list.query.filters, "chat")),
      },
      onAddToProject: () => setProjectPickerRow(row),
      onMutationSuccess: list.refresh,
      dispatch,
    });

  return {
    actions: {
      menuFor,
      onOpenRow: (row) => router.push(conversationHomeHref(row)),
      onToggleFavorite: (row) => {
        // Pending, never optimistic (GATES-TAIL-2): the star moves once the store agreed. The
        // old optimistic local patch was never reverted, so a refused pin kept its star.
        const next = !row.is_favorite;
        void dispatch(
          setConversationFavorite({ conversationId: row.id, isFavorite: next }),
        ).then((result) => {
          if (setConversationFavorite.rejected.match(result)) {
            toast.error(result.payload?.message ?? "Could not change this conversation's pin. Try again.");
            return;
          }
          list.patchRow(row.id, { is_favorite: next });
        });
      },
    },
    modals: (
      <>
      <AssociationPicker
        open={bulkProjectRows !== null}
        onOpenChange={(open) => {
          if (!open) setBulkProjectRows(null);
        }}
        token="project"
        containerLabel={`${bulkProjectRows?.length ?? 0} conversations`}
        orgId={
          bulkProjectRows && new Set(bulkProjectRows.map((r) => r.organization_id)).size === 1
            ? (bulkProjectRows[0]?.organization_id ?? null)
            : null
        }
        attachedIds={new Set<string>()}
        onAttach={async (projectId) => {
          const rows = bulkProjectRows ?? [];
          const refused: string[] = [];
          for (const row of rows) {
            const added = await associations.add({
              sourceType: "conversation",
              sourceId: row.id,
              targetType: "project",
              targetId: projectId,
              ...(row.organization_id ? { orgId: row.organization_id } : {}),
            });
            if (!added.ok) refused.push(`${conversationTitleText(row.title?.trim() || null) || "Untitled conversation"}: ${added.error ?? "refused"}`);
          }
          if (refused.length > 0) {
            toast.error(`${refused.length} of ${rows.length} not added. ${refused.slice(0, 3).join("; ")}`);
            return { ok: false, error: `${refused.length} not added` };
          }
          toast.success(`Added ${rows.length} ${rows.length === 1 ? "conversation" : "conversations"} to the project`);
          list.refresh();
          return { ok: true };
        }}
        onDetach={async () => ({ ok: true })}
      />
      <AssociationPicker
        open={projectPickerRow !== null}
        onOpenChange={(open) => {
          if (!open) setProjectPickerRow(null);
        }}
        token="project"
        containerLabel={
          conversationTitleText(projectPickerRow?.title?.trim() || null) || "Untitled conversation"
        }
        orgId={projectPickerRow?.organization_id ?? null}
        attachedIds={attachedProjectIds}
        onAttach={async (projectId) => {
          if (!projectPickerRow) {
            return { ok: false, error: "No conversation selected" };
          }
          return projectRelationships.add({
            targetType: "project",
            targetId: projectId,
            orgId: projectPickerRow.organization_id,
          });
        }}
        onDetach={(projectId) =>
          projectRelationships.remove({
            targetType: "project",
            targetId: projectId,
          })
        }
      />
      </>
    ),
  };
}
