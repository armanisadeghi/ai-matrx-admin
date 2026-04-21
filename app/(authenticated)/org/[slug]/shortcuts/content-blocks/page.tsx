"use client";

import React, { useState } from "react";
import {
  ContentBlockForm,
  ContentBlockList,
  useAgentShortcuts,
  type AgentContentBlock,
} from "@/features/agent-shortcuts";
import { useOrgShortcutsContext } from "../OrgShortcutsContext";

const SCOPE = "organization" as const;

export default function OrgContentBlocksPage() {
  const { organizationId, canWrite } = useOrgShortcutsContext();
  const { categories } = useAgentShortcuts({
    scope: SCOPE,
    scopeId: organizationId,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<AgentContentBlock | null>(
    null,
  );

  const handleCreate = canWrite
    ? () => {
        setEditingBlock(null);
        setFormOpen(true);
      }
    : undefined;

  const handleEdit = canWrite
    ? (block: AgentContentBlock) => {
        setEditingBlock(block);
        setFormOpen(true);
      }
    : undefined;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-textured">
      <ContentBlockList
        scope={SCOPE}
        scopeId={organizationId}
        onCreate={handleCreate}
        onEdit={handleEdit}
        readonly={!canWrite}
      />

      {canWrite && (
        <ContentBlockForm
          scope={SCOPE}
          scopeId={organizationId}
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          onSuccess={() => setFormOpen(false)}
          contentBlock={editingBlock}
          categories={categories}
        />
      )}
    </div>
  );
}
