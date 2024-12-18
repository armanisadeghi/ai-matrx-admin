// components/file-operations/StatusDisplay.tsx
import {Card, CardContent} from "@/components/ui/card";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Separator} from "@/components/ui/separator";
import {StorageItem} from "@/types/file-operations.types";
import {formatItemDetails, formatFileSize} from "./utils";
import {Badge} from "@/components/ui/badge";
import {cn} from "@/lib/utils";

interface StatusDisplayProps {
    currentBucket: string;
    currentPath: string[];
    items: StorageItem[];
    selectedItem: StorageItem | null;
    className?: string;
}

interface StatusItemProps {
    label: string;
    value: React.ReactNode;
    isMono?: boolean;
    isHighlighted?: boolean;
}

const StatusItem = ({label, value, isMono = false, isHighlighted = false}: StatusItemProps) => (
    <div className="flex justify-between items-start py-1 gap-2">
        <span className="text-muted-foreground text-sm whitespace-nowrap">{label}:</span>
        <span className={cn(
            "text-sm text-right",
            isMono && "font-mono",
            isHighlighted && "text-primary font-medium"
        )}>
            {value}
        </span>
    </div>
);

export function StatusDisplay(
    {
        currentBucket,
        currentPath,
        items,
        selectedItem,
        className
    }: StatusDisplayProps) {
    const folderCount = items.filter(item => item.isFolder).length;
    const fileCount = items.length - folderCount;
    const totalSize = items.reduce((acc, item) => acc + (item.size || 0), 0);

    return (
        <Card className={cn("", className)}>
            <CardContent className="p-4 space-y-4">
                {/* Basic Status */}
                <div>
                    <h3 className="font-medium mb-2">Current Status</h3>
                    <div className="space-y-1">
                        <StatusItem
                            label="Bucket"
                            value={currentBucket || 'None selected'}
                            isMono
                            isHighlighted
                        />
                        <StatusItem
                            label="Path"
                            value={
                                currentPath.length > 0
                                    ? `/${currentPath.join('/')}`
                                    : '/'
                            }
                            isMono
                        />
                        <StatusItem
                            label="Contents"
                            value={
                                <div className="flex gap-2 justify-end">
                                    <Badge variant="outline">
                                        {folderCount} folders
                                    </Badge>
                                    <Badge variant="outline">
                                        {fileCount} files
                                    </Badge>
                                </div>
                            }
                        />
                        <StatusItem
                            label="Total Size"
                            value={formatFileSize(totalSize)}
                        />
                    </div>
                </div>

                {/* Selected Item Details */}
                {selectedItem && (
                    <>
                        <Separator/>
                        <div>
                            <h3 className="font-medium mb-2">Selected Item</h3>
                            <ScrollArea className="h-[200px] pr-4">
                                <div className="space-y-1">
                                    {Object.entries(formatItemDetails(selectedItem)).map(([key, value]) => (
                                        <StatusItem
                                            key={key}
                                            label={key}
                                            value={value}
                                            isMono={key === 'Name' || key === 'Location'}
                                        />
                                    ))}
                                    {selectedItem.metadata && (
                                        <>
                                            <Separator className="my-2"/>
                                            <div className="space-y-1">
                                                {Object.entries(selectedItem.metadata)
                                                    .filter(([key]) => !['isDirectory', 'childCount'].includes(key))
                                                    .map(([key, value]) => (
                                                        <StatusItem
                                                            key={key}
                                                            label={key}
                                                            value={
                                                                typeof value === 'object'
                                                                    ? JSON.stringify(value)
                                                                    : String(value)
                                                            }
                                                            isMono={typeof value === 'object'}
                                                        />
                                                    ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

export function ItemDetailsDisplay({ item }: { item: StorageItem }) {
    return (
        <Card>
            <CardContent className="p-4">
                <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                        {/* Basic Info */}
                        <div>
                            <h3 className="font-medium mb-2">Basic Information</h3>
                            <div className="space-y-1">
                                <StatusItem label="Name" value={item.name} isMono />
                                <StatusItem label="Type" value={item.isFolder ? 'Folder' : 'File'} />
                                <StatusItem label="Category" value={item.category} />
                                <StatusItem label="Size" value={formatFileSize(item.size)} />
                            </div>
                        </div>

                        <Separator />

                        {/* Timestamps */}
                        <div>
                            <h3 className="font-medium mb-2">Timestamps</h3>
                            <div className="space-y-1">
                                <StatusItem
                                    label="Created"
                                    value={new Date(item.createdAt).toLocaleString()}
                                />
                                <StatusItem
                                    label="Updated"
                                    value={new Date(item.updatedAt).toLocaleString()}
                                />
                                <StatusItem
                                    label="Accessed"
                                    value={new Date(item.lastAccessedAt).toLocaleString()}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Technical Details */}
                        <div>
                            <h3 className="font-medium mb-2">Technical Details</h3>
                            <div className="space-y-1">
                                <StatusItem label="ID" value={item.id} isMono />
                                <StatusItem label="Path" value={item.path} isMono />
                                {!item.isFolder && (
                                    <>
                                        <StatusItem label="Extension" value={item.extension} />
                                        <StatusItem
                                            label="MIME Type"
                                            value={item.metadata.mimetype}
                                            isMono
                                        />
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Metadata */}
                        {Object.keys(item.metadata).length > 0 && (
                            <>
                                <Separator />
                                <div>
                                    <h3 className="font-medium mb-2">Metadata</h3>
                                    <div className="space-y-1">
                                        {Object.entries(item.metadata).map(([key, value]) => (
                                            <StatusItem
                                                key={key}
                                                label={key}
                                                value={
                                                    typeof value === 'object'
                                                        ? JSON.stringify(value, null, 2)
                                                        : String(value)
                                                }
                                                isMono={typeof value === 'object'}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
