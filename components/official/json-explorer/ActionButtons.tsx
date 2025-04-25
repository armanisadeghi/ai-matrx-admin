"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { CopyIcon, RefreshCw, BookmarkIcon } from "lucide-react";
import { IoBookmarks } from "react-icons/io5";
import { ActionButtonsProps } from "./types";
import { generateAccessPath } from "./json-utils";
import BookmarkManagerActions from "../../../features/scraper/parts/BookmarkManagerActions";
import { copyToClipboard } from "../../../features/scraper/utils/scraper-utils";

const ActionButtons: React.FC<ActionButtonsProps> = ({
  bookmarks,
  jsonStr,
  currentPath,
  onExportBookmarks,
  onOpenBookmarksDialog,
  onOpenBookmarkDialog,
  onCopyPath,
  onReset
}) => {
  return (
    <div className="flex gap-2">
      <BookmarkManagerActions jsonStr={jsonStr} />
      
      <Button
        size="sm"
        variant="outline"
        onClick={onOpenBookmarksDialog}
        title="View Saved Paths"
        className="text-xs"
      >
        <IoBookmarks className="w-3 h-3 mr-1" />
        Paths
      </Button>

      {bookmarks.length > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={onExportBookmarks}
          title="Export All Bookmarks"
          className="text-xs"
        >
          Export
        </Button>
      )}

      {generateAccessPath(currentPath) !== "data" && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenBookmarkDialog}
            title="Save Current Path"
            className="text-xs"
          >
            <BookmarkIcon className="w-3 h-3 mr-1" />
            Save
          </Button>

          <Button 
            size="sm" 
            variant="outline" 
            onClick={onCopyPath} 
            title="Copy Access Path" 
            className="text-xs"
          >
            Copy Path
          </Button>
        </>
      )}

      <Button 
        size="sm" 
        variant="ghost" 
        onClick={onReset} 
        title="Reset"
      >
        <RefreshCw className="w-4 h-4" />
      </Button>

      <Button 
        size="sm" 
        variant="ghost" 
        onClick={() => copyToClipboard(jsonStr)} 
        title="Copy JSON"
      >
        <CopyIcon className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default ActionButtons; 