"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { NavigationRowsProps } from "./types";
import { getKeysAtPath } from "./json-utils";

const NavigationRows: React.FC<NavigationRowsProps> = ({ originalData, currentPath, onKeySelect }) => {
  if (!originalData) return null;

  // Create array of rows to render (including placeholders)
  const rowsToRender = [];

  // Add actual navigation rows
  currentPath.forEach(([rowIndex, selectedKey], idx) => {
    // Calculate the path up to this row for getting available keys
    const pathToHere = currentPath.slice(0, idx).map(([_, key]) => key);
    const keysForThisRow = getKeysAtPath(originalData, pathToHere);

    rowsToRender.push(
      <div key={`row-${rowIndex}`} className="flex flex-wrap gap-2 mb-2">
        {keysForThisRow.map((key) => (
          <Button
            key={key}
            size="sm"
            variant={selectedKey === key ? "default" : "outline"}
            onClick={() => onKeySelect(rowIndex, key)}
            className="text-xs"
          >
            {key}
          </Button>
        ))}
      </div>
    );
  });

  // Add placeholder rows to minimize UI shifts (up to 3 rows total)
  const placeholdersNeeded = Math.max(0, 3 - rowsToRender.length);
  for (let i = 0; i < placeholdersNeeded; i++) {
    rowsToRender.push(
      <div key={`placeholder-${i}`} className="h-10 mb-2 invisible">
        {/* Invisible placeholder with same height as a row */}
      </div>
    );
  }

  return (
    <div className="mb-4 border-b pb-4 border-gray-200 dark:border-gray-700">
      {rowsToRender}
    </div>
  );
};

export default NavigationRows; 