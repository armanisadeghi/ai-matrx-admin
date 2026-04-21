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
import { useOrgShortcutsContext } from "../OrgShortcutsContext";

const SCOPE = "organization" as const;

export default function OrgShortcutsListPage() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const { slug, organizationId, canWrite } = useOrgShortcutsContext();
  const { categories } = useAgentShortcuts({
    scope: SCOPE,
    scopeId: organizationId,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [duplicateTarget, setDuplicateTarget] =
    useState<AgentShortcutRecord | null>(null);

  const handleEdit = (shortcut: AgentShortcutRecord) => {
    startTransition(() => {
      router.push(`/org/${slug}/shortcuts/edit/${shortcut.id}`);
    });
  };

  const handleCreate = canWrite ? () => setCreateOpen(true) : undefined;
  const handleDuplicate = canWrite
    ? (shortcut: AgentShortcutRecord) => setDuplicateTarget(shortcut)
    : undefined;

  const handleCreateSuccess = (id: string | null) => {
    setCreateOpen(false);
    if (id) {
      startTransition(() => {
        router.push(`/org/${slug}/shortcuts/edit/${id}`);
      });
    }
  };

  const handleDuplicateSuccess = (newId: string) => {
    setDuplicateTarget(null);
    startTransition(() => {
      router.push(`/org/${slug}/shortcuts/edit/${newId}`);
    });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-textured">
      <ShortcutList
        scope={SCOPE}
        scopeId={organizationId}
        onCreate={handleCreate}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        readonly={!canWrite}
      />

      {canWrite && (
        <ShortcutForm
          scope={SCOPE}
          scopeId={organizationId}
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          onSuccess={handleCreateSuccess}
          shortcut={null}
          categories={categories}
        />
      )}

      {canWrite && duplicateTarget && (
        <DuplicateShortcutModal
          scope={SCOPE}
          scopeId={organizationId}
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
