"use client";
import React from "react";
import type { JsonValue } from "@/types/json";
import type { PathArray } from "./types";
import { getArrayLabelKeys, getDataAtPath } from "./json-utils";

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
      <select
        value={value}
        onChange={(e) =>
          onArrayLabelKeyChange(target.rowIndex, e.target.value || undefined)
        }
        className="text-xs px-2 py-1 rounded border max-w-[10rem] bg-textured border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:border-gray-400 dark:hover:border-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
      >
        <option value="">Index</option>
        {target.keys.map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>
    </label>
  );
};

export default ArrayLabelBySelect;
