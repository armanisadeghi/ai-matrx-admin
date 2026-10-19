"use client";

/**
 * Memory Lab — the trial's sandbox store: the file tree and one file's content, at any point in
 * the trial (the current store, or the files after any step).
 */
import { useState } from "react";
import { FileText, FolderTree } from "lucide-react";

import { Button, EmptyState, Select } from "@ai-matrx/design-system/controls";
import { ROLE_LABEL, type MemoryTrialStep } from "../types";

const CURRENT = "current";

export function MemoryFilesPanel({
  currentFiles,
  steps,
}: {
  currentFiles: Record<string, string>;
  steps: MemoryTrialStep[];
}) {
  const [at, setAt] = useState<string>(CURRENT);
  const [openPath, setOpenPath] = useState<string | null>(null);

  const step = at === CURRENT ? null : steps.find((s) => s.id === at);
  const files = step ? step.filesAfter : currentFiles;
  const paths = Object.keys(files).sort();
  const shownPath = openPath && openPath in files ? openPath : (paths[0] ?? null);

  const options = [
    { value: CURRENT, label: "Current store" },
    ...[...steps].reverse().map((s) => ({ value: s.id, label: `After step ${s.seq} · ${ROLE_LABEL[s.role]}` })),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <Select value={at} options={options} onValueChange={setAt} aria-label="Store at step" />
      {paths.length === 0 ? (
        <EmptyState icon={<FolderTree />} title="The store is empty" line="Edits the agents apply appear here." />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <ul className="flex max-h-48 shrink-0 flex-col overflow-y-auto rounded-md border border-border bg-card py-1">
            {paths.map((path) => {
              const depth = path.split("/").length - 3;
              const selected = path === shownPath;
              return (
                <li key={path} style={{ paddingLeft: `${Math.max(0, depth) * 12}px` }}>
                  <Button
                    variant="quiet"
                    pressed={selected}
                    icon={<FileText />}
                    onClick={() => setOpenPath(path)}
                    className="w-full"
                  >
                    {path.replace(/^\/memories\//, "")}
                  </Button>
                </li>
              );
            })}
          </ul>
          {shownPath ? (
            <div className="flex min-h-0 flex-1 flex-col rounded-md border border-border bg-card">
              <div className="border-b border-border px-2 py-1 type-caption font-mono text-muted-foreground">
                {shownPath}
              </div>
              <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-2 font-mono type-body text-foreground">
                {files[shownPath]}
              </pre>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
