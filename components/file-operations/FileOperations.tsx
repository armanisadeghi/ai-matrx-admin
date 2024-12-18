// components/file-operations/FileOperations.tsx
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UseStorageExplorerReturn } from "@/hooks/file-operations/useStorageExplorer";
import { MoveFileOperation } from './MoveFileOperation';
import { CopyFileOperation } from './CopyFileOperation';
import { FileUploader } from './FileUploader';
import FileTree from "@/components/file-operations/FileTree";

interface FileOperationsProps {
    explorer: UseStorageExplorerReturn;
}

export default function FileOperations({ explorer }: FileOperationsProps) {
    const [activeOperation, setActiveOperation] = useState<'none' | 'move' | 'copy'>('none');

    const {
        currentBucket,
        currentPath,
        selectedItem,
        setSelectedItem,
        isLoading,
    } = explorer;

    if (!currentBucket) {
        return (
            <Alert>
                <AlertDescription>
                    Please select a bucket first to perform file operations.
                </AlertDescription>
            </Alert>
        );
    }

    const handleOperationComplete = () => {
        setSelectedItem(null);
        setActiveOperation('none');
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">
                                Current Location: /{currentPath.join('/')}
                            </h3>
                            <FileUploader explorer={explorer} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">Files and Folders</h3>
                            {selectedItem && (
                                <div className="space-x-2">
                                    <Button
                                        variant={activeOperation === 'move' ? 'default' : 'outline'}
                                        onClick={() => setActiveOperation(
                                            activeOperation === 'move' ? 'none' : 'move'
                                        )}
                                    >
                                        Move
                                    </Button>
                                    <Button
                                        variant={activeOperation === 'copy' ? 'default' : 'outline'}
                                        onClick={() => setActiveOperation(
                                            activeOperation === 'copy' ? 'none' : 'copy'
                                        )}
                                    >
                                        Copy
                                    </Button>
                                </div>
                            )}
                        </div>
                        <FileTree explorer={explorer} />
                    </div>
                </CardContent>
            </Card>

            {selectedItem && activeOperation !== 'none' && (
                <Card>
                    <CardContent className="pt-6">
                        {activeOperation === 'move' ? (
                            <MoveFileOperation
                                explorer={explorer}
                                onComplete={handleOperationComplete}
                            />
                        ) : (
                            <CopyFileOperation
                                explorer={explorer}
                                onComplete={handleOperationComplete}
                            />
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}