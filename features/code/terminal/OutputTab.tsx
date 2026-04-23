"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectTerminalLines } from "../redux";

interface OutputTabProps {
  className?: string;
}

export const OutputTab: React.FC<OutputTabProps> = ({ className }) => {
  const lines = useAppSelector(selectTerminalLines);
  const outputLines = useMemo(
    () => lines.filter((l) => l.tab === "output"),
    [lines],
  );

  return (
    <div
      className={cn(
        "h-full overflow-y-auto bg-white px-3 py-2 font-mono text-[12px] text-neutral-800 dark:bg-[#181818] dark:text-neutral-200",
        className,
      )}
    >
      {outputLines.length === 0 ? (
        <div className="text-neutral-500">
          No output. Workspace tasks (build, lint, test) will stream here.
        </div>
      ) : (
        outputLines.map((line) => (
          <div key={line.id} className="whitespace-pre-wrap">
            {line.text}
          </div>
        ))
      )}
    </div>
  );
};
