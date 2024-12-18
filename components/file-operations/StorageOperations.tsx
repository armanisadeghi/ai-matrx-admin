// components/file-operations/StorageOperations.tsx
import { useState } from 'react';
import { UseStorageExplorerReturn } from "@/hooks/file-operations/useStorageExplorer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import FileOperations from './FileOperations';
import FileList from './FileList';
import { FileUploader } from './FileUploader';

interface StorageOperationsProps {
    explorer: UseStorageExplorerReturn;
}

export default function StorageOperations({ explorer }: StorageOperationsProps) {
    const [activeTab, setActiveTab] = useState<'browse' | 'upload' | 'operations'>('browse');
    const {
        currentBucket,
        currentPath,
        items,
        selectedItem,
        setSelectedItem,
        isLoading,
    } = explorer;

    return (
        <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="browse">Browse Files</TabsTrigger>
                    <TabsTrigger value="upload">Upload</TabsTrigger>
                    <TabsTrigger
                        value="operations"
                        disabled={!selectedItem}
                    >
                        File Operations
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="browse">
                    <FileList
                        explorer={explorer}
                    />
                </TabsContent>

                <TabsContent value="upload">
                    <FileUploader
                        explorer={explorer}
                    />
                </TabsContent>

                <TabsContent value="operations">
                    <FileOperations
                        explorer={explorer}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}


