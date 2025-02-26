export type IFileSystemNode = {
    name: string;
    type: "file" | "folder";
    content?: string;
    children?: IFileSystemNode[];
    isOpen?: boolean; // For folders
};
