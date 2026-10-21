"use client";
// list-source: custom_fields — returned by rsx_list_scoped (lane7w5d_rsx); the chair applies it

// features/research/browse/listConfig.tsx
//
// /research/topics as a canonical entity list: scope tabs (Mine / My orgs with
// a per-organization narrow), search, sort and filter on every column, saved
// view preferences, one row menu for kebab / right-click / long-press, and a
// door on every topic name.
//
// Archive axis: `research.rs_topic` archives by stamping `deleted_at`
// (restorable, edges included), so the shell's Archived filter maps onto it
// through `rsx_list_scoped(p_archived)`; the row menu offers Archive / Restore.

import { Archive, ArchiveRestore } from "lucide-react";
import type { EntityBulkAction } from "@/lib/entity-list/selection";
import { runPerRow } from "@/lib/entity-list/standardBulkActions";
import { archiveTopic, restoreTopic } from "./actions";
import type { EntityListConfig } from "@/lib/entity-list/config";
import { RESEARCH_TOPIC_COLUMNS, formatAutonomy, formatTopicStatus } from "./columns";
import { organizationLabel, projectLabel, researchTopicListService } from "./service";
import { useTopicRowActions } from "./useTopicRowActions";
import {
  RESEARCH_TOPIC_LIST_SCOPES,
  TOPIC_STATUS_LABELS,
  labelFor,
  topicHref,
  type ResearchTopicListRow,
} from "./types";

/**
 * The row menu's Archive / Restore (`archiveTopic` / `restoreTopic`), many at a time. The ids
 * replace the built-in Move to Trash / Restore, so the topic's own writes (edges included) run.
 */
const TOPIC_BULK_ACTIONS: EntityBulkAction<ResearchTopicListRow>[] = [
  {
    id: "move-to-trash",
    label: "Archive",
    icon: Archive,
    variant: "destructive",
    confirm: (selection) => ({
      title: `Archive ${selection.count === 1 ? "this topic" : `${selection.count} topics`}?`,
      description:
        "Each topic leaves the list with its sources, analyses and documents. Nothing is lost: Restore in the Archived view brings it all back.",
      confirmLabel: "Archive",
      variant: "destructive",
    }),
    run: (selection) =>
      runPerRow(
        selection,
        async (id, row) => {
          if (row?.archived_at) throw new Error("already archived");
          await archiveTopic(id);
        },
        { done: "Archived", noun: "topic", labelOf: (row) => row.name, removesRows: true },
        (row) => row.id,
      ),
  },
  {
    id: "restore",
    label: "Restore",
    icon: ArchiveRestore,
    run: (selection) =>
      runPerRow(
        selection,
        async (id, row) => {
          if (row && !row.archived_at) throw new Error("not archived");
          await restoreTopic(id);
        },
        { done: "Restored", noun: "topic", labelOf: (row) => row.name, removesRows: true },
        (row) => row.id,
      ),
  },
];

export const RESEARCH_TOPIC_LIST_CONFIG: EntityListConfig<ResearchTopicListRow> = {
  surfaceKey: "research-topics",
  entityLabel: { singular: "topic", plural: "topics" },
  sourceFeature: "research",
  scopes: RESEARCH_TOPIC_LIST_SCOPES,
  // `research_topic` is registered `organization`: the list opens on the
  // organization's topics, not a literal "Mine".
  registryToken: "research_topic",
  service: researchTopicListService,
  columns: RESEARCH_TOPIC_COLUMNS,
  prefsVersion: 3,
  prefsDefaults: { sort: "updated_at", direction: "desc", pageSize: 50 },
  getRowId: (row) => row.id,
  getRowName: (row) => row.name,
  door: { token: "research_topic", hrefFor: (row) => topicHref(row.id) },
  getRowEntity: (row) => ({
    type: "research_topic",
    id: row.id,
    title: row.name,
  }),
  useRowActions: useTopicRowActions,
  bulkActions: TOPIC_BULK_ACTIONS,
  supportsArchived: true,
  searchPlaceholder: "Search topics and research questions",
  facetSections: [
    {
      facet: "status",
      filterId: "status",
      label: "Status",
      noneLabel: "Unknown",
      formatValue: formatTopicStatus,
    },
    {
      facet: "project",
      filterId: "project",
      label: "Project",
      noneLabel: "No project",
      formatValue: projectLabel,
    },
    {
      facet: "organization_name",
      filterId: "organization_name",
      label: "Organization",
      noneLabel: "No organization",
      formatValue: organizationLabel,
    },
    {
      facet: "autonomy_level",
      filterId: "autonomy_level",
      label: "Autonomy",
      noneLabel: "Unknown",
      formatValue: formatAutonomy,
    },
  ],
  noneLabels: {
    status: "Unknown",
    project: "No project",
    autonomy_level: "Unknown",
  },
  copy: {
    label: "Research topic",
    listLabel: "Research topics",
    location: "/research/topics",
    rowKind: "research-topic",
    listKind: "research-topic-list",
    rowDescription:
      "One research topic: its name, research question, status and project. Metadata only; no gathered sources or reports.",
    listDescription:
      "The research topics list as currently scoped, filtered and sorted. Metadata only.",
    humanRow: (row) =>
      `${row.name} — ${labelFor(TOPIC_STATUS_LABELS, row.status)}${
        row.project_name ? `, project ${row.project_name}` : ""
      }${row.description ? `\n${row.description}` : ""}`,
  },
  emptyState: {
    title: "No research topics",
    description:
      "A research topic is a question worth answering. It gathers sources, analyzes them and writes up what matters.",
  },
};
