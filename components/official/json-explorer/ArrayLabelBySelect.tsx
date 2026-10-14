"use client";
import React from "react";
import type { JsonValue } from "@/types/json";
import type { PathArray } from "./types";
import { getArrayLabelKeys, getDataAtPath } from "./json-utils";
import { Select } from "@ai-matrx/design-system/controls";
/** The data each nav row lists (the value its options index into). */
export const getRowData = (
  originalData: JsonValue | null | undefined,
  currentPath: PathArray,
  idx: number,
): JsonValue | null =>
  getDataAtPath(
    originalData,
    currentPath.slice(0, idx).map(([, key]) => key),
  );

/** The deepest nav row that lists an array of objects — the one "List by" controls. */
export const findLabelableRow = (
  originalData: JsonValue | null | undefined,
  currentPath: PathArray,
): { rowIndex: number; keys: string[] } | null => {
  for (let idx = currentPath.length - 1; idx >= 0; idx--) {
    const keys = getArrayLabelKeys(getRowData(originalData, currentPath, idx));
    if (keys.length > 0) return { rowIndex: currentPath[idx][0], keys };
  }
  return null;
};

interface ArrayLabelBySelectProps {
  originalData: JsonValue | null | undefined;
  currentPath: PathArray;
  arrayLabelKeys?: Record<number, string>;
  onArrayLabelKeyChange?: (rowIndex: number, labelKey: string | undefined) => void;
}

/** Sits at the far right of the nav; never shifts the path selects. */
const ArrayLabelBySelect: React.FC<ArrayLabelBySelectProps> = ({
  originalData,
  currentPath,
  arrayLabelKeys,
  onArrayLabelKeyChange,
}) => {
  if (!onArrayLabelKeyChange) return null;
  const target = findLabelableRow(originalData, currentPath);
  if (!target) return null;
  const selected = arrayLabelKeys?.[target.rowIndex];
  const value = selected && target.keys.includes(selected) ? selected : "";

  return (
    <label className="ml-auto flex items-center gap-1 flex-shrink-0 text-xs text-muted-foreground">
      List by
      <Select
        value={value}
        onValueChange={(v) =>
          onArrayLabelKeyChange(target.rowIndex, v || undefined)
        }
        aria-label="List by"
        className="max-w-[10rem]"
        options={[
          { value: "", label: "Index" },
          ...target.keys.map((key) => ({ value: key, label: key })),
        ]}
      />
    </label>
  );
};

export default ArrayLabelBySelect;
