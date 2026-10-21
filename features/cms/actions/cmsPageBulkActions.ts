// features/cms/actions/cmsPageBulkActions.ts
//
// The bulk twins of the CMS page menu (buildCmsPageMenu). Every menu id is
// declared here with its bulk decision, so a new menu verb without one is a
// type error. Publish and Move to Trash call the same service doors the row
// menu uses (CmsPageService.publishDraft / deletePage); the server's refusal
// (e.g. a writing-check block on publish) is skipped and named per page.

import {
  ExternalLink,
  Eye,
  FilePenLine,
  Gauge,
  Map,
  Pencil,
  Rocket,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { bulkActionsFromRowVerbs } from "@/lib/entity-list/rowVerbs";
import { CmsPageService } from "@/features/cms/services/cmsService";
import type { ClientPageSummary } from "@/features/cms/types";

const CMS_PAGE_VERBS = [
  { id: "build-edit-ai", label: "Edit with AI", icon: FilePenLine },
  { id: "review-ai", label: "Review before publish", icon: ShieldCheck },
  { id: "edit", label: "Open editor", icon: Pencil },
  { id: "edit-new-tab", label: "Open editor in new tab", icon: ExternalLink },
  { id: "preview", label: "Preview page", icon: Eye },
  { id: "live", label: "Open live page", icon: ExternalLink },
  { id: "plan", label: "Open content plan", icon: Map },
  { id: "measure", label: "Open measurement", icon: Gauge },
  { id: "publish-draft", label: "Publish pending draft", icon: Rocket },
  { id: "delete", label: "Move to Trash", icon: Trash2, danger: true },
] as const;

type CmsPageVerb = (typeof CMS_PAGE_VERBS)[number];

export const CMS_PAGE_BULK_ACTIONS = bulkActionsFromRowVerbs<
  CmsPageVerb,
  ClientPageSummary
>(
  CMS_PAGE_VERBS,
  {
    "build-edit-ai": { noBulk: "single" },
    "review-ai": { noBulk: "single" },
    edit: { noBulk: "open" },
    "edit-new-tab": { noBulk: "open" },
    preview: { noBulk: "open" },
    live: { noBulk: "open" },
    plan: { noBulk: "open" },
    measure: { noBulk: "open" },
    "publish-draft": {
      label: "Publish drafts",
      done: "Published",
      confirm: (targets) => ({
        title: `Publish ${targets.ids.length} pending ${targets.ids.length === 1 ? "draft" : "drafts"}?`,
        description:
          "The saved draft of each page goes to the live website. A page the writing check blocks is skipped and named.",
        confirmLabel: "Publish",
      }),
      runOne: async (id) => {
        await CmsPageService.publishDraft(id);
      },
    },
    delete: {
      label: "Move to Trash",
      done: "Moved to Trash",
      removesRows: true,
      confirm: (targets) => ({
        title: `Move ${targets.ids.length} ${targets.ids.length === 1 ? "page" : "pages"} to Trash?`,
        description:
          "Each page and its sub-pages go offline. You can restore them later.",
        confirmLabel: "Move to Trash",
      }),
      runOne: (id) => CmsPageService.deletePage(id),
    },
  },
  {
    noun: "page",
    getRowId: (page) => page.id,
    getRowName: (page) => page.title,
    blocked: (verb, page) =>
      verb.id === "publish-draft" && !page.has_draft
        ? "No saved draft to publish"
        : null,
  },
);
