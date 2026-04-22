"use client";

import React, { useState } from "react";
import {
  ContentBlockForm,
  ContentBlockList,
  useAgentShortcuts,
  type AgentContentBlock,
} from "@/features/agent-shortcuts";

const SCOPE = "global" as const;

export default function AdminContentBlocksPage() {
  const { categories } = useAgentShortcuts({ scope: SCOPE });

  const [formOpen, setFormOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<AgentContentBlock | null>(
    null,
  );

  const handleCreate = () => {
    setEditingBlock(null);
    setFormOpen(true);
  };

  const handleEdit = (block: AgentContentBlock) => {
    setEditingBlock(block);
    setFormOpen(true);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-textured">
      <ContentBlockList
        scope={SCOPE}
        onCreate={handleCreate}
        onEdit={handleEdit}
      />

      <ContentBlockForm
        scope={SCOPE}
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => setFormOpen(false)}
        contentBlock={editingBlock}
        categories={categories}
      />
    </div>
  );
}
