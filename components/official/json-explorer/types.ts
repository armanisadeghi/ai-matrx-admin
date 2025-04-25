export type PathSegment = [number, string]; // [rowIndex, selectedKey]
export type PathArray = PathSegment[];

export interface Bookmark {
  path: string;
  name: string;
  description?: string;
  segments: {
    type: string;
    value: string | number;
  }[];
}

export interface BookmarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPath: PathArray;
  bookmarkName: string;
  setBookmarkName: (name: string) => void;
  bookmarkDescription: string;
  setBookmarkDescription: (description: string) => void;
  onSave: () => void;
}

export interface BookmarksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookmarks: Bookmark[];
  onJumpToBookmark: (bookmark: Bookmark) => void;
  onDeleteBookmark: (index: number) => void;
}

export interface NavigationRowsProps {
  originalData: any;
  currentPath: PathArray;
  onKeySelect: (rowIndex: number, key: string) => void;
}

export interface ActionButtonsProps {
  bookmarks: Bookmark[];
  jsonStr: string;
  currentPath: PathArray;
  onExportBookmarks: () => void;
  onOpenBookmarksDialog: () => void;
  onOpenBookmarkDialog: () => void;
  onCopyPath: () => void;
  onReset: () => void;
} 