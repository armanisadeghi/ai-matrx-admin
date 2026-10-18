// features/exports/browse/itemQuery.ts
//
// THE ONE TRANSLATION between the entity-list vocabulary (a filter bag keyed by
// COLUMN ID, plus a search string) and the `/media/libraries/{id}/items` query
// parameters.
//
// 🚨 WHY IT IS ITS OWN FILE. The list reads a page with it, and the bulk
// "send to a Rulebook" verb sends the SAME narrowing to the server as a
// `filter` object instead of 50,000 ids. If those two mappings were written
// twice, the confirmation could say "12,433 items" and the server could act on
// a different 12,433. One function, both callers.

import type { EntityFilters, EntityFilterValue } from "@/lib/entity-list/types";
import type { EntityBulkFilter } from "@/lib/entity-list/selection";
import type { ExportItemFilter, ExportItemOrder } from "../types";

/** Column ids that are also the server's `order` values, 1:1 and on purpose. */
export const EXPORT_ITEM_ORDERS: ExportItemOrder[] = [
  "occurred_at",
  "char_count",
  "word_count",
  "title",
  "attachment_count",
];

export const DEFAULT_EXPORT_ITEM_ORDER: ExportItemOrder = "occurred_at";

/** A stale stored sort must never break the page — fall back, never throw. */
export function toItemOrder(sort: string): ExportItemOrder {
  return EXPORT_ITEM_ORDERS.includes(sort as ExportItemOrder)
    ? (sort as ExportItemOrder)
    : DEFAULT_EXPORT_ITEM_ORDER;
}

/** Length buckets, in characters — "longest first" deserves a filter to match. */
export const LENGTH_FILTER_OPTIONS = [
  { value: "lt200", label: "Under 200 characters" },
  { value: "200-1k", label: "200 – 1,000" },
  { value: "1k-5k", label: "1,000 – 5,000" },
  { value: "gt5k", label: "Over 5,000" },
];

const LENGTH_BOUNDS: Record<string, { min?: number; max?: number }> = {
  lt200: { max: 199 },
  "200-1k": { min: 200, max: 1000 },
  "1k-5k": { min: 1000, max: 5000 },
  gt5k: { min: 5001 },
};

function selectedValues(value: EntityFilterValue | undefined): string[] {
  if (!value) return [];
  if (value.kind === "select") return value.values;
  if (value.kind === "text") return value.value ? [value.value] : [];
  return [];
}

function textValue(value: EntityFilterValue | undefined): string | undefined {
  if (!value) return undefined;
  if (value.kind === "text") return value.value.trim() || undefined;
  if (value.kind === "select") return value.values[0] || undefined;
  return undefined;
}

function booleanValue(value: EntityFilterValue | undefined): boolean | undefined {
  if (!value) return undefined;
  if (value.kind === "boolean") return value.value;
  // A boolean column filtered through the shared select popover arrives as
  // strings; read them rather than dropping the user's choice on the floor.
  if (value.kind === "select") {
    if (value.values.includes("true")) return true;
    if (value.values.includes("false")) return false;
  }
  return undefined;
}

/**
 * Filter bag + search → the items endpoint's query params.
 *
 * The date range arrives already resolved to instants by the table, so the page
 * read and the bulk verb that follows it carry the SAME bounds.
 */
export function toItemFilter(
  filters: EntityFilters,
  search: string,
): ExportItemFilter {
  const filter: ExportItemFilter = {};

  // A named preset answers the whole question. It carries filters the client
  // cannot express (a reply flag, a resolved set of threads) and it owns its own
  // sort, so it travels alone and the server resolves it. Returning early is
  // what stops a preset silently combining with a leftover tick and meaning
  // something other than its name.
  const preset = selectedValues(filters.preset);
  if (preset.length > 0) {
    filter.preset = preset[0];
    return filter;
  }

  const direction = selectedValues(filters.direction);
  if (direction.length > 0) filter.direction = direction.join(",");

  const kind = selectedValues(filters.kind);
  if (kind.length > 0) filter.kind = kind.join(",");

  const labels = selectedValues(filters.labels);
  if (labels.length > 0) filter.labels = labels.join(",");

  const author = textValue(filters.author);
  if (author) filter.author = author;

  const container = textValue(filters.container_label);
  if (container) filter.container_id = container;

  // The ATTACHMENT axis is one column with two server keys: it SORTS by
  // `attachment_count` and FILTERS by `has_attachment`. One column on screen,
  // because "sort by how many" and "only the ones with any" are the same
  // question to the person asking it.
  const hasAttachment = booleanValue(filters.attachment_count);
  if (hasAttachment !== undefined) filter.has_attachment = hasAttachment;

  // The table's date range (bounds already resolved): since inclusive, until exclusive. The server's
  // `occurred_before` is inclusive, so the exclusive bound goes over as one millisecond earlier.
  const occurred = filters.occurred_at;
  if (occurred?.kind === "date") {
    if (occurred.since) filter.occurred_after = occurred.since;
    if (occurred.until) {
      filter.occurred_before = new Date(new Date(occurred.until).getTime() - 1).toISOString();
    }
  }

  const lengthBucket = textValue(filters.char_count);
  const bounds = lengthBucket ? LENGTH_BOUNDS[lengthBucket] : undefined;
  if (bounds?.min !== undefined) filter.min_chars = bounds.min;
  if (bounds?.max !== undefined) filter.max_chars = bounds.max;

  const q = search.trim();
  if (q) filter.q = q;

  return filter;
}

/**
 * The bulk descriptor → the same filter object. `EntityBulkFilter` is the
 * query with the page dropped, which is exactly what a bulk verb wants.
 */
export function toItemFilterFromBulk(
  bulk: EntityBulkFilter,
): ExportItemFilter {
  return toItemFilter(bulk.filters, bulk.search);
}

/** A person-readable restatement of a filter, for a confirmation sentence. */
export function describeItemFilter(filter: ExportItemFilter): string {
  const parts: string[] = [];
  if (filter.direction) {
    const words = filter.direction
      .split(",")
      .map((d) =>
        d === "outbound" ? "sent by you" : d === "inbound" ? "received" : d,
      );
    parts.push(words.join(" or "));
  }
  if (filter.kind) parts.push(`of type ${filter.kind.split(",").join(" or ")}`);
  if (filter.labels) parts.push(`labelled ${filter.labels.split(",").join(" or ")}`);
  if (filter.author) parts.push(`from ${filter.author}`);
  if (filter.container_id) parts.push("in one thread or channel");
  if (filter.has_attachment === true) parts.push("with an attachment");
  if (filter.has_attachment === false) parts.push("with no attachment");
  if (filter.min_chars !== undefined) parts.push(`at least ${filter.min_chars.toLocaleString()} characters`);
  if (filter.max_chars !== undefined) parts.push(`at most ${filter.max_chars.toLocaleString()} characters`);
  if (filter.occurred_after || filter.occurred_before) parts.push("within the chosen dates");
  if (filter.q) parts.push(`matching "${filter.q}"`);
  return parts.length > 0 ? parts.join(", ") : "with no filter applied";
}
