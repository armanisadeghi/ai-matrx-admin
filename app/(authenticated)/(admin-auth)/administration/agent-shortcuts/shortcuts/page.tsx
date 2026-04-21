"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DuplicateShortcutModal,
  ShortcutForm,
  ShortcutList,
  useAgentShortcuts,
  type AgentShortcut,
  type AgentShortcutRecord,
} from "@/features/agent-shortcuts";

const SCOPE = "global" as const;

export default function AdminShortcutsPage() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const { categories } = useAgentShortcuts({ scope: SCOPE });

  const [createOpen, setCreateOpen] = useState(false);
  const [duplicateTarget, setDuplicateTarget] =
    useState<AgentShortcutRecord | null>(null);

  const handleEdit = (shortcut: AgentShortcutRecord) => {
    startTransition(() => {
      router.push(`/administration/agent-shortcuts/edit/${shortcut.id}`);
    });
  };

  const handleCreate = () => setCreateOpen(true);
  const handleDuplicate = (shortcut: AgentShortcutRecord) =>
    setDuplicateTarget(shortcut);

  const handleCreateSuccess = (id: string | null) => {
    setCreateOpen(false);
    if (id) {
      startTransition(() => {
        router.push(`/administration/agent-shortcuts/edit/${id}`);
      });
    }
  };

  const handleDuplicateSuccess = (newId: string) => {
    setDuplicateTarget(null);
    startTransition(() => {
      router.push(`/administration/agent-shortcuts/edit/${newId}`);
    });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-textured">
      <ShortcutList
        scope={SCOPE}
        onCreate={handleCreate}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
      />

      <ShortcutForm
        scope={SCOPE}
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={handleCreateSuccess}
        shortcut={null}
        categories={categories}
      />

      {duplicateTarget && (
        <DuplicateShortcutModal
          scope={SCOPE}
          isOpen={!!duplicateTarget}
          onClose={() => setDuplicateTarget(null)}
          onSuccess={handleDuplicateSuccess}
          shortcut={duplicateTarget as AgentShortcut}
          categories={categories}
        />
      )}
    </div>
  );
}
