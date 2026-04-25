/**
 * features/files/components/core/FileBreadcrumbs/FileBreadcrumbs.tsx
 *
 * Path breadcrumbs — root → current folder. Clicking a segment navigates to
 * that ancestor; responsibility is on the host (each surface wires its own
 * onNavigate).
 */

"use client";

import { useMemo } from "react";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAllFoldersMap } from "@/features/files/redux/selectors";
import { getFolderAncestors } from "@/features/files/redux/tree-utils";

export interface FileBreadcrumbsProps {
  /** The current folder. Pass null for "Home". */
  folderId: string | null;
  onNavigate: (folderId: string | null) => void;
  className?: string;
  /** Max segments before truncation with "…" ellipsis. Default 5. */
  maxSegments?: number;
}

export function FileBreadcrumbs({
  folderId,
  onNavigate,
  className,
  maxSegments = 5,
}: FileBreadcrumbsProps) {
  const foldersById = useAppSelector(selectAllFoldersMap);

  const ancestors = useMemo(() => {
    if (!folderId) return [];
    return getFolderAncestors(foldersById, folderId);
  }, [foldersById, folderId]);

  const segments: { id: string | null; label: React.ReactNode; onClick: () => void }[] = [
    {
      id: null,
      label: (
        <span className="inline-flex items-center">
          <Home className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      ),
      onClick: () => onNavigate(null),
    },
    ...ancestors.map((folder) => ({
      id: folder.id,
      label: folder.folderName,
      onClick: () => onNavigate(folder.id),
    })),
  ];

  // Truncate middle segments if over the cap.
  const shown =
    segments.length <= maxSegments
      ? segments
      : [
          segments[0],
          { id: "__ellipsis__", label: "…", onClick: () => {} },
          ...segments.slice(-2),
        ];

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center gap-1 text-sm text-muted-foreground",
        className,
      )}
    >
      {shown.map((segment, idx) => {
        const isLast = idx === shown.length - 1;
        const isEllipsis = segment.id === "__ellipsis__";
        return (
          <div key={`${segment.id}-${idx}`} className="flex items-center gap-1">
            {idx > 0 ? (
              <ChevronRight
                className="h-3.5 w-3.5 opacity-50"
                aria-hidden="true"
              />
            ) : null}
            {isLast || isEllipsis ? (
              <span
                className={cn(
                  "truncate max-w-[12ch] md:max-w-[20ch]",
                  isLast && "text-foreground font-medium",
                )}
              >
                {segment.label}
              </span>
            ) : (
              <button
                type="button"
                onClick={segment.onClick}
                className="truncate max-w-[12ch] md:max-w-[20ch] rounded px-1 py-0.5 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {segment.label}
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
