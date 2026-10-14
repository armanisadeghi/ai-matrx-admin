"use client";

import { Building2, Power, PowerOff } from "lucide-react";
import type { EntityListConfig } from "@/lib/entity-list/config";
import { bulkCountLabel, type EntityBulkAction } from "@/lib/entity-list/selection";
import { runPerRow } from "@/lib/entity-list/standardBulkActions";
import { supabase } from "@/utils/supabase/client";
import { setShapeActivation } from "@/features/content-ir/studio/shape-authoring-service";
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

const shapeListBaseConfig: EntityListConfig<ShapeBrowseRow> = {
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

const SHAPE_NOUN = "shape";
const shapeId = (row: ShapeBrowseRow) => row.id;
const shapeLabel = (row: ShapeBrowseRow) => row.label;

/** Batch verbs every viewer gets; each row is decided by the database, refusals are named. */
const SHAPE_BULK_ACTIONS: EntityBulkAction<ShapeBrowseRow>[] = [
  {
    id: "activate",
    label: "Activate",
    icon: Power,
    run: (selection) =>
      runPerRow(
        selection,
        async (id) => {
          await setShapeActivation(supabase, id, true);
        },
        { done: "Activated", noun: SHAPE_NOUN, labelOf: shapeLabel },
        shapeId,
      ),
  },
  {
    id: "deactivate",
    label: "Deactivate",
    icon: PowerOff,
    confirm: (selection) => ({
      title: `Deactivate ${bulkCountLabel(selection.count, SHAPE_NOUN)}?`,
      description:
        "They fall back to the generic viewer and can't be bound to agents until activated again.",
      confirmLabel: "Deactivate",
    }),
    run: (selection) =>
      runPerRow(
        selection,
        async (id) => {
          await setShapeActivation(supabase, id, false);
        },
        { done: "Deactivated", noun: SHAPE_NOUN, labelOf: shapeLabel },
        shapeId,
      ),
  },
];

/** Super admins (`shape.promote-to-system`) also get Promote; one DB call for the whole selection. */
const PROMOTE_BULK_ACTION: EntityBulkAction<ShapeBrowseRow> = {
  id: "promote-to-system",
  label: "Promote to system",
  icon: Building2,
  confirm: (selection) => ({
    title: `Promote ${bulkCountLabel(selection.count, SHAPE_NOUN)} to Matrx System?`,
    description: PROMOTE_CONSEQUENCE,
    confirmLabel: "Promote to system",
  }),
  run: async (selection) => {
    const result = await promoteShapesToSystem(selection.ids);
    return { message: promotionSummary(result), refresh: true };
  },
};

export const shapeListConfig: EntityListConfig<ShapeBrowseRow> = {
  ...shapeListBaseConfig,
  bulkActions: SHAPE_BULK_ACTIONS,
};

export const shapeListConfigWithPromote: EntityListConfig<ShapeBrowseRow> = {
  ...shapeListBaseConfig,
  bulkActions: [...SHAPE_BULK_ACTIONS, PROMOTE_BULK_ACTION],
};
