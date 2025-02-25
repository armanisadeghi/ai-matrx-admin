"use client";
import React from "react";

/**
 * Component for displaying content hashes
 */
const HashesContent = ({ hashes }) => {
  if (!hashes || hashes.length === 0) {
    return <div className="p-4 text-gray-500 dark:text-gray-400">No hashes available</div>;
  }
  
  return (
    <div className="p-4">
      <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Content Hashes</h3>
      <div className="space-y-2">
        {hashes.map((hash, index) => (
          <div
            key={index}
            className="font-mono text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded-md text-gray-700 dark:text-gray-300"
          >
            {hash}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HashesContent;