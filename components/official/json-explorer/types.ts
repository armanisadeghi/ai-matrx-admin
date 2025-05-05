export type PathSegment = [number, string]; // [rowIndex, selectedKey]
export type PathArray = PathSegment[];

export interface JSONNodeValue {
    value: any;
    type: string;
    name?: string;
}

export interface PathBookmarkSegment {
    type: 'key' | 'index';
    value: string | number;
}

export interface Bookmark {
    id: string;
    name: string;
    description?: string;
    path: string;
    segments: PathBookmarkSegment[];
    createdAt: number;
}

export interface BookmarkDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentPath: PathArray;
    bookmarkName: string;
    setBookmarkName: (name: string) => void;
    bookmarkDescription: string;
    setBookmarkDescription: (desc: string) => void;
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
  onContextMenu?: (e: React.MouseEvent, path: PathArray) => void;
  hiddenPaths?: string[];
  isPathHidden?: (path: PathArray) => boolean;
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