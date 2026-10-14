"use client";
import React from "react";
import { NavigationRowsProps } from "./types";
import { getArrayItemLabel, getKeysAtPath } from "./json-utils";
import ArrayLabelBySelect, { getRowData } from "./ArrayLabelBySelect";
import { Select } from "@ai-matrx/design-system/controls";
const NavigationSelects: React.FC<NavigationRowsProps> = ({
  originalData,
  currentPath,
  onKeySelect,
  isPathHidden,
  arrayLabelKeys,
  onArrayLabelKeyChange,
}) => {
  if (!originalData) return null;

  // Create array of selects to render
  const selectsToRender: React.ReactElement[] = [];

  // Add actual navigation selects
  currentPath.forEach(([rowIndex, selectedKey], idx) => {
    // Calculate the path up to this row for getting available keys
    const pathToHere = currentPath.slice(0, idx).map(([_, key]) => key);
    const keysForThisRow = getKeysAtPath(originalData, pathToHere);
    const labelKey = arrayLabelKeys?.[rowIndex];
    const rowData = labelKey ? getRowData(originalData, currentPath, idx) : null;

    // Create the path for the currently selected option
    const selectedPath = currentPath
      .slice(0, idx)
      .concat([[rowIndex, selectedKey]]);
    const isHidden = isPathHidden && isPathHidden(selectedPath);

    selectsToRender.push(
      <div
        key={`select-${rowIndex}`}
        data-json-key={selectedKey}
        title={isHidden ? "This path is hidden" : ""}
        className={`min-w-0 flex-shrink ${labelKey ? "max-w-[20rem]" : ""}`}
      >
        <Select
          value={selectedKey}
          onValueChange={(v) => onKeySelect(rowIndex, v)}
          aria-label="Key"
          className="w-full"
          options={keysForThisRow.map((key) => {
            // Check if this option would create a hidden path
            const optionPath = currentPath
              .slice(0, idx)
              .concat([[rowIndex, key]]);
            const optionIsHidden = isPathHidden && isPathHidden(optionPath);
            return {
              value: key,
              label: getArrayItemLabel(rowData, key, labelKey),
              meta: optionIsHidden ? "hidden" : undefined,
            };
          })}
        />
      </div>,
    );
  });

  // Add placeholder selects to minimize UI shifts (up to 3 selects total)
  const placeholdersNeeded = Math.max(0, 3 - selectsToRender.length);
  for (let i = 0; i < placeholdersNeeded; i++) {
    selectsToRender.push(
      <div key={`placeholder-${i}`} className="h-7 invisible flex-shrink-0">
        {/* Invisible placeholder with same height as a select */}
      </div>,
    );
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <div className="flex gap-1 items-center flex-wrap">
        {selectsToRender}
        <ArrayLabelBySelect
          originalData={originalData}
          currentPath={currentPath}
          arrayLabelKeys={arrayLabelKeys}
          onArrayLabelKeyChange={onArrayLabelKeyChange}
        />
      </div>
    </div>
  );
};

export default NavigationSelects;
