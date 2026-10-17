// components/official/drill-explorer/drillPinned.ts — WHAT A DRILLED LEVEL SHOWS, SO IT IS RELEVANT THERE
// (lane DRILL-ROUND2; Arman: "a drill-down is a table about the value you clicked").
//
//   hidePinnedDistinct  inside a drilled value the Dimension is already pinned, so a distinct count of
//                       that Dimension ("People" inside one person) reads 1 on every row: dropped from
//                       what is shown (and asked), for every definition.
//   recordsForTrail     "See these records" at the end of a trail reads the columns the last pinned
//                       Dimension's level declares (`level.records`), else the definition's own.

import type { DrillDefinition } from "@ai-matrx/records";
import { parseDimensionRef, type MatrxDrillQuestion } from "@ai-matrx/design-system/data-table";

import { recordsColumnDimension } from "./recordsColumns";
import type { DrillRecordsDeclaration } from "./types";

/** The Dimension keys the trail has pinned to a value. */
export function pinnedDimensions(question: Pick<MatrxDrillQuestion, "where">): Set<string> {
  return new Set(question.where.map((w) => parseDimensionRef(w.dim).key));
}

/** The question without the distinct counts of Dimensions its trail already pins (never to an empty list). */
export function hidePinnedDistinct<Q extends Pick<MatrxDrillQuestion, "where" | "show">>(def: Pick<DrillDefinition, "dimensions" | "measures">, question: Q): Q {
  if (question.where.length === 0) return question;
  const pinned = pinnedDimensions(question);
  const hidden = new Set(
    def.measures.filter((m) => m.op === "count_distinct" && m.of && pinned.has(recordsColumnDimension(def, m.of) ?? m.of)).map((m) => m.key),
  );
  if (hidden.size === 0) return question;
  const show = question.show.filter((k) => !hidden.has(k));
  return show.length === 0 || show.length === question.show.length ? question : { ...question, show };
}

/** The records declaration for the trail's end: the last pinned Dimension's own `level.records`, else the definition's. */
export function recordsForTrail(
  def: Pick<DrillDefinition, "dimensions">,
  records: DrillRecordsDeclaration,
  question: Pick<MatrxDrillQuestion, "where">,
): DrillRecordsDeclaration {
  const last = question.where[question.where.length - 1];
  if (!last) return records;
  const declared = def.dimensions.find((d) => d.key === parseDimensionRef(last.dim).key)?.level?.records;
  const columns = (declared ?? []).filter((c) => records.columns.includes(c));
  return columns.length > 0 ? { ...records, columns } : records;
}
