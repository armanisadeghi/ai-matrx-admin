"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@ai-matrx/design-system/controls";
import { CopyIcon, RefreshCw, BookmarkIcon, Brackets, BookMarked } from "lucide-react";
import { ActionButtonsProps } from "./types";
import { generateAccessPath } from "./json-utils";
import BookmarkManagerActions from "@/features/scraper/parts/BookmarkManagerActions";
import { copyToClipboard } from "@/features/scraper/utils/scraper-utils";

const ActionButtons: React.FC<ActionButtonsProps> = ({
  bookmarks,
  jsonStr,
  currentPath,
  onExportBookmarks,
  onOpenBookmarksDialog,
  onOpenBookmarkDialog,
  onCopyPath,
  onReset,
  onOpenCopyPathObjectDialog,
  ignorePrefix,
  onIgnorePrefixChange,
}) => {
  return (
    <div className="flex items-center">
      {onIgnorePrefixChange && (
        <Input
          value={ignorePrefix || ""}
          onChange={(e) => onIgnorePrefixChange(e.target.value)}
          placeholder="Ignore prefix..."
          className="w-32"
          title="Path prefix to ignore when copying path objects"
        />
      )}
      {onOpenCopyPathObjectDialog && (
        <Button
          icon={<Brackets />}
          variant="outline"
          onClick={onOpenCopyPathObjectDialog}
          title="Copy Path Object"
        >
          Path Object
        </Button>
      )}

      <BookmarkManagerActions jsonStr={jsonStr} />

      <Button
        icon={<BookMarked />}
        variant="outline"
        onClick={onOpenBookmarksDialog}
        title="View Saved Paths"
      >
        Paths
      </Button>

      {bookmarks.length > 0 && (
        <Button
          variant="outline"
          onClick={onExportBookmarks}
          title="Export All Bookmarks"
        >
          Export
        </Button>
      )}

      {generateAccessPath(currentPath) !== "data" && (
        <>
          <Button
            icon={<BookmarkIcon />}
            variant="outline"
            onClick={onOpenBookmarkDialog}
            title="Save Current Path"
          >
            Save
          </Button>

          <Button
            variant="outline"
            onClick={onCopyPath}
            title="Copy Access Path"
          >
            Path
          </Button>
        </>
      )}

      <Button icon={<RefreshCw />} aria-label="Reset" variant="outline" onClick={onReset} title="Reset" />

      <Button
        icon={<CopyIcon />} aria-label="Copy JSON"
        variant="outline"
        onClick={() => copyToClipboard(jsonStr)}
        title="Copy JSON"
      />
    </div>
  );
};

export default ActionButtons;
