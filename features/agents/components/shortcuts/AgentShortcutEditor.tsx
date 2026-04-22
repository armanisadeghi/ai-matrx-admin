"use client";

/**
 * AgentShortcutEditor
 *
 * Standalone (non-modal) shortcut editor used at
 * `/agents/[id]/shortcuts/new` and `/agents/[id]/shortcuts/[shortcutId]`.
 *
 * Wraps the shared `ShortcutForm` in `variant="inline"` so the same 600+ line
 * form is reused across the modal and the full-page route.
 *
 * - `shortcutId === "new"` → create mode, scope defaults to `"user"` with the
 *   agent id pre-filled.
 * - Any other id → edit mode. If the shortcut isn't resolvable (wrong scope,
 *   missing RLS, etc.) an error card is shown with a link back to the list.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAgentShortcuts } from "@/features/agent-shortcuts";
import { ShortcutForm } from "@/features/agent-shortcuts/components/ShortcutForm";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectShortcutById } from "@/features/agents/redux/agent-shortcuts/selectors";
import type { AgentShortcut } from "@/features/agents/redux/agent-shortcuts/types";
import type { AgentScope } from "@/features/agent-shortcuts/constants";
import type { ShortcutFormData } from "@/features/agent-shortcuts/types";

interface AgentShortcutEditorProps {
  agentId: string;
  agentName: string;
  /** Either a real shortcut UUID, or the literal string `"new"` for creation. */
  shortcutId: string;
}

export function AgentShortcutEditor({
  agentId,
  agentName,
  shortcutId,
}: AgentShortcutEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isCreate = shortcutId === "new";

  // We pre-hydrate both scopes so the page works whether the shortcut is
  // user-owned or global. When creating we default to `"user"`; when editing
  // we resolve the scope from the shortcut itself.
  const userQuery = useAgentShortcuts({ scope: "user" });
  const globalQuery = useAgentShortcuts({ scope: "global" });

  const loadedShortcut = useAppSelector((state) =>
    isCreate ? null : selectShortcutById(state, shortcutId),
  );

  const isLoading = userQuery.isLoading || globalQuery.isLoading;
  const fetchError = userQuery.error || globalQuery.error;

  // Resolve the scope to feed `useAgentShortcutCrud`. Creating → user;
  // editing → inferred from the shortcut's ownership columns.
  const { scope, scopeId, categories } = useMemo(() => {
    if (isCreate) {
      return {
        scope: "user" as AgentScope,
        scopeId: undefined as string | undefined,
        categories: userQuery.categories,
      };
    }

    if (!loadedShortcut) {
      return {
        scope: "user" as AgentScope,
        scopeId: undefined,
        categories: userQuery.categories,
      };
    }

    if (loadedShortcut.taskId) {
      return {
        scope: "task" as AgentScope,
        scopeId: loadedShortcut.taskId,
        categories: [],
      };
    }
    if (loadedShortcut.projectId) {
      return {
        scope: "project" as AgentScope,
        scopeId: loadedShortcut.projectId,
        categories: [],
      };
    }
    if (loadedShortcut.organizationId) {
      return {
        scope: "organization" as AgentScope,
        scopeId: loadedShortcut.organizationId,
        categories: [],
      };
    }
    if (loadedShortcut.userId) {
      return {
        scope: "user" as AgentScope,
        scopeId: undefined,
        categories: userQuery.categories,
      };
    }
    return {
      scope: "global" as AgentScope,
      scopeId: undefined,
      categories: globalQuery.categories,
    };
  }, [isCreate, loadedShortcut, userQuery.categories, globalQuery.categories]);

  const goToList = () => {
    startTransition(() => {
      router.push(`/agents/${agentId}/shortcuts`);
    });
  };

  const handleClose = () => {
    goToList();
  };

  const handleSuccess = (nextId: string | null) => {
    if (nextId === null) {
      // Deleted — return to the list.
      goToList();
      return;
    }
    if (isCreate) {
      // Just created → replace the `new` URL with the real id so refresh works.
      startTransition(() => {
        router.replace(`/agents/${agentId}/shortcuts/${nextId}`);
      });
      return;
    }
    if (nextId !== shortcutId) {
      startTransition(() => {
        router.replace(`/agents/${agentId}/shortcuts/${nextId}`);
      });
    }
  };

  // ── Create-mode initial values — pin the shortcut to this agent ────────
  const initialValues: Partial<ShortcutFormData> | undefined = isCreate
    ? { agentId, useLatest: true }
    : undefined;

  // ── Loading + error states ─────────────────────────────────────────────
  if (!isCreate && isLoading && !loadedShortcut) {
    return (
      <EditorShell agentId={agentId} heading={agentName} subHeading="Loading…">
        <Card className="mx-auto mt-6 w-full max-w-md">
          <CardContent className="p-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading shortcut…
          </CardContent>
        </Card>
      </EditorShell>
    );
  }

  if (!isCreate && !loadedShortcut) {
    return (
      <EditorShell
        agentId={agentId}
        heading={agentName}
        subHeading="Shortcut not found"
      >
        <Card className="mx-auto mt-6 w-full max-w-md border-destructive/30">
          <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
            <div className="p-3 bg-destructive/10 rounded-full">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground mb-1">
                Shortcut not found
              </h2>
              <p className="text-xs text-muted-foreground">
                This shortcut doesn&apos;t exist, or isn&apos;t visible to you.
                {fetchError ? ` (${fetchError})` : null}
              </p>
            </div>
            <Link href={`/agents/${agentId}/shortcuts`}>
              <Button size="sm" variant="outline">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back to shortcuts
              </Button>
            </Link>
          </CardContent>
        </Card>
      </EditorShell>
    );
  }

  const heading = isCreate
    ? `New shortcut for ${agentName}`
    : loadedShortcut?.label || "Edit shortcut";
  const subHeading = isCreate
    ? `Creating under ${scope} scope`
    : `Editing ${scope} shortcut`;

  return (
    <EditorShell
      agentId={agentId}
      heading={heading}
      subHeading={subHeading}
      isPending={isPending}
    >
      <ShortcutForm
        variant="inline"
        scope={scope}
        scopeId={scopeId}
        onClose={handleClose}
        onSuccess={handleSuccess}
        shortcut={(loadedShortcut as AgentShortcut | null) ?? null}
        categories={categories}
        initialValues={initialValues}
      />
    </EditorShell>
  );
}

// ─── Local shell wrapper ───────────────────────────────────────────────────

function EditorShell({
  agentId,
  heading,
  subHeading,
  isPending,
  children,
}: {
  agentId: string;
  heading: string;
  subHeading?: string;
  isPending?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="shrink-0 flex items-center gap-2 px-4 sm:px-6 h-11 border-b border-border bg-card">
        <Link
          href={`/agents/${agentId}/shortcuts`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <ArrowLeft className="h-4 w-4 mr-1.5" />
          )}
          Back to shortcuts
        </Link>
        <div className="w-px h-4 bg-border/60" />
        <div className="min-w-0 flex-1 truncate">
          <span className="text-sm font-medium text-foreground truncate">
            {heading}
          </span>
          {subHeading && (
            <span className="ml-2 text-xs text-muted-foreground truncate">
              {subHeading}
            </span>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
