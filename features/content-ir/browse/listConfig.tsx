"use client";

import { Building2 } from "lucide-react";
import type { EntityListConfig } from "@/lib/entity-list/config";
import { bulkCountLabel } from "@/lib/entity-list/selection";
import {
  promoteShapesToSystem,
  promotionSummary,
} from "@/features/content-ir/studio/promote-to-system";
import { PROMOTE_CONSEQUENCE } from "@/features/content-ir/studio/usePromoteShapeToSystem";
import { formatRelativeTime } from "@ai-matrx/kit/format";
import { shapeDetailHref } from "@/features/content-ir/studio/constants";
import { SHAPE_COLUMNS } from "./columns";
import {
  fetchShapeFacets,
  fetchShapePage,
  fetchShapeScopeCounts,
} from "./service";
import { SHAPE_LIST_SCOPES, type ShapeBrowseRow } from "./types";
import { useShapeRowActions } from "./useShapeRowActions";
import { humanizeIdentifier } from "@ai-matrx/kit/text-case";

export const shapeListConfig: EntityListConfig<ShapeBrowseRow> = {
  surfaceKey: "shapes-browse",
  // DD-137c / §3.3: where this list OPENS comes from platform.entity_types, never a literal.
  registryToken: "content_ir_kind",
  entityLabel: { singular: "shape", plural: "shapes" },
  sourceFeature: "udt",
  scopes: SHAPE_LIST_SCOPES,
  service: {
    fetchPage: fetchShapePage,
    fetchCounts: fetchShapeScopeCounts,
    fetchFacets: fetchShapeFacets,
  },
  columns: SHAPE_COLUMNS,
  prefsVersion: 1,
  prefsDefaults: { sort: "updated", direction: "desc", pageSize: 25 },
  getRowId: (row) => row.id,
  getRowName: (row) => row.label,
  door: {
    token: "content_ir_kind",
    hrefFor: (row) => shapeDetailHref(row.kind),
  },
  getRowEntity: (row) => ({
    type: "content_ir_kind",
    id: row.id,
    title: row.label,
  }),
  useRowActions: useShapeRowActions,
  supportsArchived: false,
  urlState: true,
  facetSections: [
    {
      facet: "origin",
      filterId: "origin",
      label: "Origin",
      noneLabel: "Unknown origin",
      formatValue: humanizeIdentifier,
    },
    {
      facet: "status",
      filterId: "status",
      label: "Status",
      noneLabel: "Unknown status",
      formatValue: humanizeIdentifier,
    },
    {
      facet: "component",
      filterId: "component",
      label: "Renderer",
      noneLabel: "Unknown renderer",
      formatValue: (value) =>
        value === "custom" ? "Custom renderer" : "Generic renderer",
    },
    {
      facet: "family",
      filterId: "family",
      label: "Family",
      noneLabel: "No family",
      formatValue: humanizeIdentifier,
    },
    {
      facet: "authoring_owner",
      filterId: "authoring_owner",
      label: "Schema owner",
      noneLabel: "Unknown owner",
      formatValue: (value) => (value === "ts" ? "Web" : "Python"),
    },
    {
      facet: "visibility",
      filterId: "visibility",
      label: "Visibility",
      noneLabel: "No visibility",
      formatValue: humanizeIdentifier,
    },
    {
      facet: "access_level",
      filterId: "access_level",
      label: "Access",
      noneLabel: "No access level",
      formatValue: humanizeIdentifier,
    },
  ],
  noneLabels: {
    family: "No family",
    organization_name: "No organization",
    owner_email: "System",
  },
  copy: {
    label: "Shape",
    listLabel: "Shapes",
    location: "/shapes/all",
    rowKind: "content-ir-kind",
    listKind: "content-ir-kind-list",
    humanRow: (row) =>
      `${row.label} (${row.kind}) — ${row.is_active ? "active" : "inactive"}, updated ${formatRelativeTime(row.updated_at)}`,
  },
  emptyState: {
    title: "No shapes here",
    description:
      "Nothing matches this scope yet. Create a shape, or switch to the public library.",
  },
};

/**
 * The same list with the super-admin batch action: tick shapes, promote them
 * all into Matrx System in one database call. Offered only to a person who
 * holds the `shape.promote-to-system` admin feature (ShapeBrowsePage picks);
 * system shapes carry no checkbox.
 */
export const shapeListConfigWithPromote: EntityListConfig<ShapeBrowseRow> = {
  ...shapeListConfig,
  bulkSelection: {
    isRowSelectable: (row) => row.origin !== "system",
  },
  bulkActions: [
    {
      id: "promote-to-system",
      label: "Promote to system",
      icon: Building2,
      confirm: (selection) => ({
        title: `Promote ${bulkCountLabel(selection.count, "shape")} to Matrx System?`,
        description: PROMOTE_CONSEQUENCE,
        confirmLabel: "Promote to system",
      }),
      run: async (selection) => {
        const result = await promoteShapesToSystem(selection.ids);
        return { message: promotionSummary(result), refresh: true };
      },
    },
  ],
};
