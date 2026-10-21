// features/message-templates/utils/templateBulkActions.ts
//
// The bulk twins of the template action drawer (TemplateActionDrawer): View,
// Edit and Duplicate open one template (single); Delete is "Move to Trash"
// (archiveTemplate, which sets deleted_at). Only the owner's templates can be
// trashed — a selected public template of someone else is skipped and named.

import { Copy, Eye, Pencil, Trash2 } from "lucide-react";

import { bulkActionsFromRowVerbs } from "@/lib/entity-list/rowVerbs";
import type { MessageTemplateDB } from "@/features/message-templates/types/message-templates-db";
import { archiveTemplate } from "@/features/message-templates/services/message-templates-service";

const TEMPLATE_VERBS = [
  { id: "view", label: "View", icon: Eye },
  { id: "edit", label: "Edit", icon: Pencil },
  { id: "duplicate", label: "Duplicate", icon: Copy },
  { id: "delete", label: "Move to Trash", icon: Trash2, danger: true },
] as const;

export function buildTemplateBulkActions(currentUserId: string | null | undefined) {
  return bulkActionsFromRowVerbs<
    (typeof TEMPLATE_VERBS)[number],
    MessageTemplateDB
  >(
    TEMPLATE_VERBS,
    {
      view: { noBulk: "view" },
      edit: { noBulk: "edit" },
      duplicate: { noBulk: "single" },
      delete: {
        done: "Moved to Trash",
        removesRows: true,
        confirm: (targets) => ({
          title: `Move ${targets.ids.length} ${targets.ids.length === 1 ? "template" : "templates"} to Trash?`,
          description: "You can restore them from Trash.",
          confirmLabel: "Move to Trash",
        }),
        runOne: (id) => archiveTemplate(id),
      },
    },
    {
      noun: "template",
      getRowId: (t) => t.id,
      getRowName: (t) => t.label || "Untitled",
      blocked: (verb, t) =>
        verb.id === "delete" && t.created_by !== currentUserId
          ? "Not your template"
          : null,
    },
  );
}
