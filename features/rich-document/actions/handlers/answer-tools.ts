// features/rich-document/actions/handlers/answer-tools.ts
//
// RC-B9 — acting on AI answers, registered in the ONE action registry:
//
//   (pin-message and regenerate-response moved into @ai-matrx/chat, message-actions W1a;
//    code-block-open-in-editor moved there in W3c)
//
//   code block (source "raw" + metadata.codeBlock — see ../../code-block/)
//     code-block-apply-to-file    Replace the open editor tab (only when one exists)
//     code-block-run              Run in the conversation's bound sandbox (only when bound)
//     code-block-chart            Chart a CSV / TSV block
//
// Every action is ABSENT where it cannot work (visible → false) — never dead.

import { FileInput } from "lucide-react";
import { toast } from "@/lib/toast";
import { registerActionIfAbsent } from "./register-if-absent";
import type { RichDocumentActionContext } from "@ai-matrx/rich-content/rich-document/types";
import { readCodeBlockFacts, type CodeBlockFacts } from "../../code-block/code-block-context";

// ─── Code block actions ─────────────────────────────────────────────────────

function codeFacts(ctx: RichDocumentActionContext): CodeBlockFacts | null {
  return readCodeBlockFacts(ctx.metadata);
}

type CodeTabsShape = {
  codeTabs?: {
    activeId: string | null;
    byId: Record<string, { id: string; name: string; content: string; readOnly?: boolean; kind?: string }>;
  };
};

function activeEditableTab(ctx: RichDocumentActionContext) {
  // Every code block evaluates this row, on any host — the package's compact snippet once handed
  // rows `getState: () => undefined`. No store, or no /code workspace in it, means no target file.
  const tabs = (ctx.getState() as unknown as CodeTabsShape | undefined)?.codeTabs;
  const tab = tabs?.activeId ? tabs.byId[tabs.activeId] : null;
  if (!tab || tab.readOnly) return null;
  if (tab.kind && tab.kind !== "editor") return null;
  return tab;
}

registerActionIfAbsent({
  id: "code-block-apply-to-file",
  label: (ctx) => `Apply to ${activeEditableTab(ctx)?.name ?? "open file"}`,
  icon: FileInput,
  iconColor: "text-emerald-600 dark:text-emerald-400",
  category: "edit",
  supportedSources: ["raw"],
  renderSlot: "overflow",
  order: 1,
  // Only where a target file exists: an editable tab open in the /code
  // workspace (page or window). Elsewhere the action is absent.
  visible: (ctx) => Boolean(codeFacts(ctx)?.code.trim()) && activeEditableTab(ctx) !== null,
  run: async (ctx) => {
    const facts = codeFacts(ctx);
    const tab = activeEditableTab(ctx);
    if (!facts || !tab) return;
    const { confirm } = await import("@/components/dialogs/confirm/ConfirmDialogHost");
    const ok = await confirm({
      title: `Replace ${tab.name} with this code?`,
      description:
        "The open file's editor content is replaced with this block. Nothing is saved until you save the file, and Undo in the toast restores it.",
      confirmLabel: "Apply",
    });
    if (!ok) return;
    const { updateTabContent } = await import("@/features/code/redux/tabsSlice");
    const before = tab.content;
    ctx.dispatch(updateTabContent({ id: tab.id, content: facts.code, source: "ai" }));
    toast.success(`Applied to ${tab.name}`, {
      description: "Unsaved — save the file to keep it.",
      action: {
        label: "Undo",
        onClick: () => ctx.dispatch(updateTabContent({ id: tab.id, content: before, source: "ai-undo" })),
      },
    });
  },
});

