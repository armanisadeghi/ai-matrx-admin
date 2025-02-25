"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { formatTextData, copyToClipboard } from "../utils/scraper-utils";

/**
 * Component for displaying text content
 */
const TextContent = ({ textData }) => {
  const lines = formatTextData(textData);
  
  if (lines.length === 0) {
    return <div className="p-4 text-gray-500 dark:text-gray-400">No text content available</div>;
  }
  
  return (
    <div className="p-4 space-y-4">
      <div className="mb-4 flex justify-end">
        <Button size="sm" variant="outline" onClick={() => copyToClipboard(textData)}>
          Copy Text
        </Button>
      </div>
      <div className="space-y-4">
        {lines.map((line, index) => (
          <p key={index} className="text-gray-700 dark:text-gray-300">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
};

export default TextContent;