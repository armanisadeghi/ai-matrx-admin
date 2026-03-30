"use client";
import React from "react";

interface ScrapedResultHashes {
  minhash?: number[] | string;
  simhash?: number | string;
  outline_simhash?: number | string;
}

const HASH_LABELS: Record<string, string> = {
  minhash: "MinHash",
  simhash: "SimHash",
  outline_simhash: "Outline SimHash",
};

function formatHashValue(value: number[] | number | string): string {
  if (Array.isArray(value)) {
    return `[${value.length} values] ${value.slice(0, 4).join(", ")}...`;
  }
  return String(value);
}

const HashesContent = ({ hashes }: { hashes?: ScrapedResultHashes | null }) => {
  if (!hashes || Object.keys(hashes).length === 0) {
    return (
      <div className="p-4 text-gray-500 dark:text-gray-400">
        No hashes available
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">
        Content Hashes
      </h3>
      <div className="space-y-3">
        {Object.entries(hashes)
          .filter(([, value]) => value != null)
          .map(([key, value]) => (
            <div key={key} className="space-y-1">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {HASH_LABELS[key] ?? key}
              </p>
              <div className="font-mono text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded-md text-gray-700 dark:text-gray-300 break-all">
                {formatHashValue(value as number[] | number | string)}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default HashesContent;
