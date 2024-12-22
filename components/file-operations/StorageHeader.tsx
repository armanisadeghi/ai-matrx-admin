import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

import { UseStorageExplorerReturn } from "@/hooks/file-operations/useStorageExplorer";
import {
    Database as BucketIcon,
    Folder as FolderIcon,
    RefreshCw as RefreshIcon,
    ChevronUp as UpIcon
} from 'lucide-react';
import MatrxBreadcrumb from "@/components/matrx/navigation/breadcumbs/MatrxBreadcrumb";

export interface StorageHeaderProps {
    explorer: UseStorageExplorerReturn;
    logs: Array<{ message: string; type: string; timestamp: string; }>;
}

export default function StorageHeader({ explorer, logs }: StorageHeaderProps) {
    const {
        currentBucket,
        currentPath,
        setCurrentBucket,
        navigateToFolder,
        navigateUp,
        navigateToRoot,
        refresh,
        isLoading,
        buckets,
    } = explorer;

    const breadcrumbItems = [
        {
            id: 'root',
            label: currentBucket,
            icon: <BucketIcon className="h-4 w-4" />,
            isCurrent: currentPath.length === 0
        },
        ...currentPath.map((folder, index) => ({
            id: folder,
            label: folder,
            icon: <FolderIcon className="h-4 w-4" />,
            isCurrent: index === currentPath.length - 1
        }))
    ];

    const handleBreadcrumbAction = (key: string) => {
        if (key === 'root') {
            navigateToRoot();
        } else {
            const index = currentPath.findIndex(p => p === key);
            if (index !== -1) {
                const newPath = currentPath.slice(0, index + 1);
                navigateToFolder(newPath.join('/'));
            }
        }
    };

    return (
        <div className="border-b">
            <div className="flex items-center h-12 px-4">
                <Select value={currentBucket} onValueChange={setCurrentBucket}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select bucket">
                            {currentBucket || "Select bucket"}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {buckets.map((bucket) => (
                            <SelectItem key={bucket.name} value={bucket.name}>
                                {bucket.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={refresh}
                    disabled={isLoading || !currentBucket}
                    className="ml-2"
                >
                    <RefreshIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''} mr-2`} />
                    {isLoading ? 'Loading...' : 'Refresh'}
                </Button>

                {currentPath.length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={navigateUp}
                        className="ml-2"
                    >
                        <UpIcon className="h-4 w-4 mr-2" />
                        Up
                    </Button>
                )}

                {currentBucket && (
                    <MatrxBreadcrumb
                        items={breadcrumbItems}
                        onNavigate={handleBreadcrumbAction}
                        className="ml-4"
                    />
                )}
            </div>

            {logs.length > 0 && logs[0].type === 'error' && (
                <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
                    {logs[0].message}
                </div>
            )}
        </div>
    );
}