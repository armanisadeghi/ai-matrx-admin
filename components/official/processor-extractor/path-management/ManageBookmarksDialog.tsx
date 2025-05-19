"use client";
import React from "react";
import UnifiedBookmarkManager from "./UnifiedBookmarkManager";
import { Bookmark } from "../types";

export interface BookmarksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookmarks: Bookmark[];
  onJumpToBookmark: (bookmark: Bookmark) => void;
  onDeleteBookmark: (index: number) => void;
  configKey?: string;
}


const ManageBookmarksDialog: React.FC<BookmarksDialogProps> = ({
  open,
  onOpenChange,
  bookmarks,
  onJumpToBookmark,
  onDeleteBookmark,
  configKey
}) => {
  // Now we just wrap the UnifiedBookmarkManager
  return (
    <UnifiedBookmarkManager
      open={open}
      onOpenChange={onOpenChange}
      onJumpToBookmark={onJumpToBookmark}
      isDialog={true}
      currentConfigKey={configKey}
    />
  );
};

export default ManageBookmarksDialog; 