"use client";

// features/visual-map-lab/LabListPage.tsx — /visual-maps/lab/all: every sample on the canonical list shell.
// An in-memory list (the shell's memory service): samples come from three sources and each source that fails says so
// above the list while the others still show.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink } from "lucide-react";
import type { ItemMenuConfig } from "@ai-matrx/chat/ui/item-types";
import { EntityListPage, type EntityListSurface } from "@/lib/entity-list/components/EntityListPage";
import { EntitySourceFailures } from "@/lib/entity-list/components/EntitySourceFailures";
import { Muted, TextCell, type EntityColumnSpec } from "@/lib/entity-list/columns";
import type { EntityListConfig, EntityRowActionsResult } from "@/lib/entity-list/config";
import { createMemoryListService } from "@/lib/entity-list/memoryService";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { copyToClipboard } from "@/lib/clipboard/copy";
import { createVisualMapLabScope, VISUAL_MAP_LAB_SURFACE_NAME } from "@/features/surfaces/manifests/visual-map-lab.manifest";
import { loadLabRows, type LabLoadFailure } from "./service";
import type { LabListRow } from "./types";

export const labSampleHref = (id: string): string => `/visual-maps/lab/${encodeURIComponent(id)}`;

/** The fixed test subjects first, then workflows, then what people made. */
const KIND_ORDER = ["Test subject", "Workflow overview", "Repair round", "Shape inspection"];

type Spec = EntityColumnSpec<LabListRow>;

const COLUMNS: Spec[] = [
  {
    id: "title",
    label: "Sample",
    locked: true,
    column: { id: "title", header: "Sample", filter: "text", width: 320, cell: (row) => <span className="block truncate" title={row.title}>{row.title}</span> },
  },
  {
    id: "kind",
    label: "Kind",
    facet: "kind",
    column: { id: "kind", header: "Kind", filter: "select", width: 150, cell: (row) => <TextCell value={row.kind} muted /> },
  },
  {
    id: "type",
    label: "Diagram type",
    facet: "type",
    formatFacetValue: (v) => (v === "__none__" ? "Not a visual map" : v),
    column: { id: "type", header: "Diagram type", filter: "select", width: 130, cell: (row) => (row.type ? <TextCell value={row.type} /> : <Muted>None</Muted>) },
  },
  {
    id: "subject",
    label: "Subject",
    column: { id: "subject", header: "Subject", filter: "text", width: 260, cell: (row) => <span className="block truncate" title={row.subject}>{row.subject}</span> },
  },
  {
    id: "detail",
    label: "Detail",
    column: { id: "detail", header: "Detail", filter: "text", width: 150, cell: (row) => <TextCell value={row.detail} muted /> },
  },
  {
    id: "screenshot",
    label: "Screenshot",
    facet: "screenshot",
    column: { id: "screenshot", header: "Screenshot", filter: "select", width: 110, cell: (row) => <TextCell value={row.hasScreenshot ? "Stored" : "None"} muted /> },
  },
  {
    id: "created_at",
    label: "Saved",
    column: { id: "created_at", header: "Saved", width: 160, cell: (row) => (row.createdAt ? <TextCell value={new Date(row.createdAt).toLocaleString()} muted /> : <Muted>Fixed sample</Muted>) },
  },
];

function useRowActions(): EntityRowActionsResult<LabListRow> {
  const router = useRouter();
  return {
    actions: {
      menuFor: (row) => (): ItemMenuConfig => ({
        sections: [
          { id: "open", items: [{ id: "open", label: "Open sample", icon: ExternalLink, kind: "link", href: labSampleHref(row.id) }] },
          { id: "copy", items: [{ id: "copy-id", label: "Copy sample address", icon: Copy, onSelect: () => void copyToClipboard(row.id, "Copied sample address") }] },
        ],
      }),
      onOpenRow: (row) => router.push(labSampleHref(row.id)),
    },
  };
}

const SURFACE: EntityListSurface<LabListRow> = {
  surfaceName: VISUAL_MAP_LAB_SURFACE_NAME,
  getScope: (list) => createVisualMapLabScope({ lab_view: "list", ...(list.isLoading || list.error != null ? {} : { sample_count: list.total }) }),
};

function buildConfig(onFailures: (f: LabLoadFailure[]) => void): EntityListConfig<LabListRow> {
  return {
    surfaceKey: "visual-map-lab",
    entityLabel: { singular: "sample", plural: "samples" },
    sourceFeature: "agents-other",
    scopes: ["system"],
    service: createMemoryListService<LabListRow>({
      load: async () => {
        const { rows, failures } = await loadLabRows();
        onFailures(failures);
        return rows;
      },
      scope: "system",
      defaultSort: "kind",
      fields: {
        title: { value: (r) => r.title, search: true },
        kind: { value: (r) => r.kind, sortValue: (r) => KIND_ORDER.indexOf(r.kind), facet: true },
        type: { value: (r) => r.type, facet: true },
        subject: { value: (r) => r.subject, search: true },
        detail: { value: (r) => r.detail, search: true },
        screenshot: { value: (r) => (r.hasScreenshot ? "Stored" : "None"), facet: true },
        created_at: { value: (r) => r.createdAt ?? "" },
      },
    }),
    columns: COLUMNS,
    prefsVersion: 1,
    prefsDefaults: { sort: "kind", direction: "asc", pageSize: 100 },
    getRowId: (row) => row.id,
    getRowName: (row) => row.title,
    door: { hrefFor: (row) => labSampleHref(row.id) },
    urlState: true,
    supportsArchived: false,
    tableToolbar: { tableId: "visual-map-lab" },
    searchPlaceholder: "Search samples",
    useRowActions,
    facetSections: [],
    copy: {
      label: "Visual map sample",
      listLabel: "Visual map lab",
      location: "/visual-maps/lab/all",
      rowKind: "visual-map-sample",
      listKind: "visual-map-samples",
      humanRow: (row) => `${row.kind}: ${row.title} (${row.subject}${row.type ? `, ${row.type}` : ""})`,
    },
    emptyState: { title: "No samples", description: "" },
  };
}

export function LabListPage() {
  const [failures, setFailures] = useState<LabLoadFailure[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [config, setConfig] = useState(() => buildConfig(setFailures));
  const retry = () => {
    setFailures([]);
    setConfig(buildConfig(setFailures));
    setAttempt((n) => n + 1);
  };
  const notice = useMemo(
    () => (
      <EntitySourceFailures
        operation="Load samples"
        failures={failures.map((f) => ({ label: f.source, error: f.message }))}
        onRetry={retry}
        consequence="The list holds only the sources that answered."
      />
    ),
    [failures],
  );
  return (
    <>
      <RecordPageHeader level={{ name: "Visual map lab" }} />
      <EntityListPage key={attempt} config={config} defaultScope={{ kind: "system" }} scopeTabs={false} clearsShellHeader={false} notice={notice} surface={SURFACE} />
    </>
  );
}
