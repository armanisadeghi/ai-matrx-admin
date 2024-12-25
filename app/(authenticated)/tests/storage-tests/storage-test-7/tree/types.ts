// /types.ts
export type TreeItem = {
  name: string;
  id: string | null;
  type: "file" | "folder";
  metadata?: {
    size?: number;
    mimetype?: string;
    [key: string]: unknown;
  } | null;
};

export type FileSelectHandler = (path: string, file: TreeItem) => void;

export type TreeNodeProps = {
  item: TreeItem;
  path: string;
  bucketName: string;
  onFileSelect: (path: string, file: TreeItem) => void;
  level?: number;
};
