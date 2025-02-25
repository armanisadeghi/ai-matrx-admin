"use client";
import React from "react";
import { safeStringify } from "../utils/scraper-utils";

/**
 * Component for displaying structured data
 */
const StructuredData = ({ structuredData }) => {
  if (!structuredData || Object.keys(structuredData).length === 0) {
    return <div className="p-4 text-gray-500 dark:text-gray-400">No structured data available</div>;
  }
  
  return (
    <div className="p-4">
      <pre className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-4 rounded-md text-sm text-gray-800 dark:text-gray-200 overflow-auto">
        {safeStringify(structuredData)}
      </pre>
    </div>
  );
};

export default StructuredData;