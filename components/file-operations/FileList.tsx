// components/file-operations/FileList.tsx
import { UseStorageExplorerReturn } from "@/hooks/file-operations/useStorageExplorer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderIcon } from "lucide-react";
import {
    formatFileSize,
    getFileIcon,
    formatLastModified,
    isPreviewable,
    getFileTypeInfo
} from "./utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface FileListProps {
    explorer: UseStorageExplorerReturn;
}

export default function FileList({ explorer }: FileListProps) {
    const {
        items,
        selectedItem,
        setSelectedItem,
        navigateToFolder,
        isLoading,
        downloadItem,
    } = explorer;

    if (isLoading) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                Loading...
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No files or folders found in this location
            </div>
        );
    }

    return (
        <ScrollArea className="h-[500px] rounded-md border p-4">
            <div className="space-y-2">
                {items.map((item) => {
                    const fileInfo = item.isFolder ? null : getFileTypeInfo(item.name);
                    const canPreview = !item.isFolder && isPreviewable(item.name);

                    return (
                        <div
                            key={item.id}
                            className={`
                                flex items-center justify-between p-2 rounded-lg
                                hover:bg-muted/50 cursor-pointer
                                ${selectedItem?.id === item.id ? 'bg-muted' : ''}
                            `}
                            onClick={() => setSelectedItem(item)}
                            onDoubleClick={() => {
                                if (item.isFolder) {
                                    navigateToFolder(item.name);
                                }
                            }}
                        >
                            <div className="flex items-center space-x-2 flex-1">
                                {item.isFolder ? (
                                    <FolderIcon className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    getFileIcon(item.name)
                                )}
                                <Tooltip>
                                    <TooltipTrigger>
                                        <span className="font-mono truncate max-w-[200px]">
                                            {item.name}
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <div className="space-y-1">
                                            <div>{item.name}</div>
                                            {fileInfo && (
                                                <div className="text-xs text-muted-foreground">
                                                    {fileInfo.description}
                                                </div>
                                            )}
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </div>

                            <div className="flex items-center space-x-4">
                                {item.updatedAt && (
                                    <span className="text-sm text-muted-foreground">
                                        {formatLastModified(item.updatedAt)}
                                    </span>
                                )}
                                {item.size && (
                                    <span className="text-sm text-muted-foreground">
                                        {formatFileSize(item.size)}
                                    </span>
                                )}
                                {!item.isFolder && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            downloadItem(item);
                                        }}
                                    >
                                        Download
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </ScrollArea>
    );
}