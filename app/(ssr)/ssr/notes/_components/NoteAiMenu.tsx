"use client";

// NoteAiMenu — Lazy-loaded AI actions submenu for notes.
// Fast path: reads pre-hydrated rows from Redux contextMenuCache (populated by SSR RPC).
// Fallback: fetches from context_menu_unified_view directly if Redux cache is empty.
// Executes prompts via /api/prompts/test (streaming, no Redux needed).
// Maps note content + selection to prompt variables via scope_mappings.

import { useEffect, useState, useCallback, useRef } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { buildCategoryHierarchy } from "@/features/prompt-builtins/utils/menuHierarchy";
import { getIconComponent } from "@/components/official/IconResolver";
import type { CategoryGroup, ShortcutItem } from "@/features/prompt-builtins/types/menu";
import { useAppSelector } from "@/lib/redux/hooks";
import type { ContextMenuCacheState } from "@/lib/redux/slices/contextMenuCacheSlice";

interface NoteAiMenuProps {
  noteId: string;
  /** Full note content for the "content" scope */
  noteContent: string;
  /** Currently selected text (if any) for the "selection" scope */
  selectedText?: string;
  /** Called with the AI result text (for replace/insert operations) */
  onResult?: (result: string, action: "replace" | "insert") => void;
  onClose: () => void;
}

export default function NoteAiMenu({
  noteId,
  noteContent,
  selectedText,
  onResult,
  onClose,
}: NoteAiMenuProps) {
  // Read from Redux contextMenuCache — pre-populated by get_ssr_shell_data() RPC
  // Cast through unknown: contextMenuCache is lite-store-only, not in full RootState type
  const cachedRows = useAppSelector(
    (state) => (state as unknown as { contextMenuCache: ContextMenuCacheState }).contextMenuCache?.rows ?? []
  );
  const isReduxHydrated = useAppSelector(
    (state) => (state as unknown as { contextMenuCache: ContextMenuCacheState }).contextMenuCache?.hydrated ?? false
  );

  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [streamResult, setStreamResult] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  // ── Build hierarchy from Redux cache or fetch from Supabase ──────────
  useEffect(() => {
    console.log("[NoteAiMenu] Init: hydrated =", isReduxHydrated, ", cachedRows =", cachedRows.length);

    // Fast path: rows already hydrated from SSR RPC — build hierarchy immediately
    if (isReduxHydrated && cachedRows.length > 0) {
      const aiRows = cachedRows.filter((r) => r.placement_type === "ai-action");
      console.log("[NoteAiMenu] Fast path: aiRows =", aiRows.length);
      const built = aiRows.flatMap((row) =>
        buildCategoryHierarchy(
          row.categories_flat as Parameters<typeof buildCategoryHierarchy>[0],
          "note-editor"
        )
      );
      console.log("[NoteAiMenu] Fast path built groups:", built.length, built);
      setGroups(built);
      setLoading(false);
      return;
    }

    // Fallback: fetch from Supabase (public routes or cache miss)
    (async () => {
      console.log("[NoteAiMenu] Fallback: fetching from context_menu_unified_view...");
      try {
        const { data, error } = await supabase
          .from("context_menu_unified_view")
          .select("placement_type, categories_flat")
          .in("placement_type", ["ai-action"]);

        console.log("[NoteAiMenu] Supabase result:", data?.length ?? 0, "rows, error:", error);

        if (error || !data) {
          console.error("[NoteAiMenu] Failed to load AI actions:", error);
          setLoading(false);
          return;
        }

        const built = (data as { placement_type: string; categories_flat: unknown[] }[])
          .flatMap((row) =>
            buildCategoryHierarchy(
              row.categories_flat as Parameters<typeof buildCategoryHierarchy>[0],
              "note-editor"
            )
          );

        console.log("[NoteAiMenu] Supabase built groups:", built.length, built);
        setGroups(built);
      } catch (err) {
        console.error("[NoteAiMenu] Failed to load AI actions:", err);
      } finally {
        setLoading(false);
      }
    })();
  // Re-run if Redux hydration completes after initial render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReduxHydrated]);

  // ── Execute an AI action via /api/prompts/test ─────────────────────
  const executeAction = useCallback(
    async (item: ShortcutItem) => {
      if (!item.prompt_builtin?.messages) return;

      // Abort any prior execution
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setExecuting(item.id);
      setStreamResult("");

      // Map scopes to variables using scope_mappings
      const variables: Record<string, string> = {};
      const mappings = item.scope_mappings ?? {};

      // Standard scope mappings: selection → selected text, content → full note
      if (mappings.selection && selectedText) {
        variables[mappings.selection] = selectedText;
      }
      if (mappings.content) {
        variables[mappings.content] = noteContent;
      }
      // If no scope_mappings defined, use conventional names
      if (!mappings.selection && !mappings.content) {
        if (selectedText) variables.selection = selectedText;
        variables.content = noteContent;
      }

      try {
        const model = item.prompt_builtin.settings?.model_id ?? "gpt-4o";
        const response = await fetch("/api/prompts/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: item.prompt_builtin.messages,
            model,
            variables,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          console.error("AI execution failed:", response.status);
          setExecuting(null);
          return;
        }

        // Stream the response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

          for (const line of lines) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.done) break;
              if (json.content) {
                accumulated += json.content;
                setStreamResult(accumulated);
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }

        // Deliver result to parent
        if (accumulated && onResult) {
          // If there was selected text, offer to replace it; otherwise insert after
          onResult(accumulated, selectedText ? "replace" : "insert");
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("AI execution error:", err);
        }
      } finally {
        setExecuting(null);
        abortRef.current = null;
      }
    },
    [noteContent, selectedText, onResult],
  );

  // Cleanup abort on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // ── Render streaming result panel ──────────────────────────────────
  if (executing || streamResult) {
    return (
      <div className="py-1 max-w-[300px]">
        <div className="px-2.5 py-1 text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-purple-500" />
          {executing ? "Processing..." : "Result"}
        </div>
        <div className="px-2.5 py-1.5 text-xs text-foreground leading-relaxed max-h-48 overflow-y-auto scrollbar-thin-auto whitespace-pre-wrap">
          {streamResult || (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Generating...
            </span>
          )}
        </div>
        {!executing && streamResult && (
          <div className="flex gap-1 px-2.5 pt-1 pb-0.5">
            <button
              className="px-2 py-0.5 text-[0.625rem] font-medium rounded bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition-colors"
              onClick={() => {
                onResult?.(streamResult, selectedText ? "replace" : "insert");
                onClose();
              }}
            >
              {selectedText ? "Replace" : "Insert"}
            </button>
            <button
              className="px-2 py-0.5 text-[0.625rem] font-medium rounded text-muted-foreground cursor-pointer hover:bg-accent transition-colors"
              onClick={() => {
                navigator.clipboard.writeText(streamResult);
                onClose();
              }}
            >
              Copy
            </button>
            <button
              className="px-2 py-0.5 text-[0.625rem] font-medium rounded text-muted-foreground cursor-pointer hover:bg-accent transition-colors"
              onClick={() => {
                setStreamResult("");
                setExecuting(null);
              }}
            >
              Back
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Render loading state ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="py-2 px-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading AI actions...
      </div>
    );
  }

  // ── Render menu items from database ─────────────────────────────────
  const allItems = groups.flatMap((g) => collectShortcuts(g));
  if (!loading) {
    console.log("[NoteAiMenu] Render:", { groupsCount: groups.length, itemsCount: allItems.length, groups });
  }

  if (allItems.length === 0) {
    return (
      <div className="py-1">
        <div className="px-2.5 py-1 text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          AI Actions
        </div>
        <div className="px-2.5 py-2 text-xs text-muted-foreground italic">
          No AI actions available
        </div>
      </div>
    );
  }

  return (
    <div className="py-0.5">
      {groups.map((group) => (
        <div key={group.category.id}>
          <div className="px-2.5 py-1 text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <GroupIcon iconName={group.category.icon_name} />
            {group.category.label}
          </div>
          {group.items
            .filter((item): item is ShortcutItem => item.type === "prompt_shortcut")
            .map((item) => {
              const Icon = item.icon_name
                ? getIconComponent(item.icon_name, "Sparkles")
                : Sparkles;
              return (
                <button
                  key={item.id}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-foreground rounded-md cursor-pointer transition-colors hover:bg-accent [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:text-muted-foreground"
                  onClick={() => executeAction(item)}
                >
                  <Icon />
                  {item.label}
                </button>
              );
            })}
          {/* Render nested children recursively */}
          {group.children?.map((child) => (
            <NestedGroup
              key={child.category.id}
              group={child}
              depth={1}
              onExecute={executeAction}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Helper: render a group icon ──────────────────────────────────────
function GroupIcon({ iconName }: { iconName: string | null }) {
  if (!iconName) return <Sparkles className="w-3 h-3" />;
  const Icon = getIconComponent(iconName, "Sparkles");
  return <Icon className="w-3 h-3" />;
}

// ── Helper: nested category group ────────────────────────────────────
function NestedGroup({
  group,
  depth,
  onExecute,
}: {
  group: CategoryGroup;
  depth: number;
  onExecute: (item: ShortcutItem) => void;
}) {
  const shortcuts = group.items.filter(
    (item): item is ShortcutItem => item.type === "prompt_shortcut",
  );
  if (shortcuts.length === 0 && (!group.children || group.children.length === 0)) {
    return null;
  }

  return (
    <div style={{ paddingLeft: `${depth * 8}px` }}>
      <div className="px-2.5 py-0.5 text-[0.5625rem] font-semibold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1">
        <GroupIcon iconName={group.category.icon_name} />
        {group.category.label}
      </div>
      {shortcuts.map((item) => {
        const Icon = item.icon_name
          ? getIconComponent(item.icon_name, "Sparkles")
          : Sparkles;
        return (
          <button
            key={item.id}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-foreground rounded-md cursor-pointer transition-colors hover:bg-accent [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:text-muted-foreground"
            onClick={() => onExecute(item)}
          >
            <Icon />
            {item.label}
          </button>
        );
      })}
      {group.children?.map((child) => (
        <NestedGroup
          key={child.category.id}
          group={child}
          depth={depth + 1}
          onExecute={onExecute}
        />
      ))}
    </div>
  );
}

// ── Helper: collect all shortcuts from hierarchy ─────────────────────
function collectShortcuts(group: CategoryGroup): ShortcutItem[] {
  const shortcuts = group.items.filter(
    (item): item is ShortcutItem => item.type === "prompt_shortcut",
  );
  const childShortcuts = group.children?.flatMap(collectShortcuts) ?? [];
  return [...shortcuts, ...childShortcuts];
}
