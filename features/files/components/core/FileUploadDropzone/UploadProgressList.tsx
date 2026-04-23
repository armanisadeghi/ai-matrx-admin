/**
 * features/files/components/core/FileUploadDropzone/UploadProgressList.tsx
 *
 * Live progress cards for active uploads. Reads from the `uploads` map via
 * `useAppSelector`; independent from the Dropzone above so it can also be
 * rendered standalone.
 */

"use client";

import { memo } from "react";
import { AlertCircle, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/lib/redux/hooks";
import { clearUpload } from "../../../redux/slice";
import { formatFileSize } from "../../../utils/format";
import type { UploadState } from "../../../types";

export interface UploadProgressListProps {
  uploads: UploadState[];
  className?: string;
}

function UploadProgressListImpl({
  uploads,
  className,
}: UploadProgressListProps) {
  const dispatch = useAppDispatch();
  if (uploads.length === 0) return null;

  return (
    <ul
      className={cn(
        "space-y-2 rounded-md border bg-background/95 p-3 shadow-md backdrop-blur",
        className,
      )}
      aria-label="Active uploads"
    >
      {uploads.map((u) => {
        const percent =
          u.fileSize > 0
            ? Math.min(100, Math.round((u.bytesUploaded / u.fileSize) * 100))
            : 0;
        return (
          <li key={u.requestId} className="flex items-center gap-2 text-xs">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="truncate">{u.fileName}</span>
                <span className="tabular-nums text-muted-foreground">
                  {u.status === "error"
                    ? "Failed"
                    : u.status === "success"
                      ? "Done"
                      : `${percent}%`}
                </span>
              </div>
              <div className="mt-1 h-1 w-full rounded bg-muted">
                <div
                  className={cn(
                    "h-1 rounded transition-all",
                    u.status === "error" && "bg-destructive",
                    u.status === "success" && "bg-emerald-500",
                    (u.status === "uploading" || u.status === "pending") &&
                      "bg-primary",
                  )}
                  style={{
                    width:
                      u.status === "error" || u.status === "success"
                        ? "100%"
                        : `${percent}%`,
                  }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>
                  {formatFileSize(u.bytesUploaded)} /{" "}
                  {formatFileSize(u.fileSize)}
                </span>
                {u.error ? (
                  <span className="text-destructive truncate max-w-[50%]">
                    {u.error}
                  </span>
                ) : null}
              </div>
            </div>

            {u.status === "success" ? (
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : u.status === "error" ? (
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            ) : null}

            {u.status !== "uploading" && u.status !== "pending" ? (
              <button
                type="button"
                onClick={() =>
                  dispatch(clearUpload({ requestId: u.requestId }))
                }
                aria-label="Dismiss"
                className="flex h-5 w-5 items-center justify-center rounded hover:bg-accent"
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export const UploadProgressList = memo(UploadProgressListImpl);
