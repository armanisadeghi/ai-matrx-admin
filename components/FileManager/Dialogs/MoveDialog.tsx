// components/FileManager/Dialogs/MoveDialog.tsx
import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {ScrollArea} from "@/components/ui/scroll-area";
import {useFileSystem} from '@/providers/FileSystemProvider';
import {FolderIcon, ChevronRight, Loader2} from 'lucide-react';
import {BucketTreeStructure} from '@/utils/file-operations';

interface MoveDialogProps {
    isOpen: boolean;
    onClose: () => void;
    sourcePath: string;
    type: 'file' | 'folder';
    mode: 'move' | 'copy';
    bucketName: string;
}

export const MoveDialog: React.FC<MoveDialogProps> = (
    {
        isOpen,
        onClose,
        sourcePath,
        type,
        mode,
        bucketName,
    }) => {
    const {moveFile, copyFile, getBucketStructure} = useFileSystem();
    const [selectedPath, setSelectedPath] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const structure = getBucketStructure(bucketName);

    const handleOperation = async () => {
        if (!selectedPath) return;

        const fileName = sourcePath.split('/').pop();
        const destinationPath = selectedPath
            ? `${selectedPath}/${fileName}`
            : fileName;

        setLoading(true);
        try {
            if (mode === 'move') {
                await moveFile(bucketName, sourcePath, destinationPath);
            } else {
                await copyFile(bucketName, sourcePath, destinationPath);
            }
            onClose();
        } catch (error) {
            console.error(`Error ${mode}ing file:`, error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'move' ? 'Move' : 'Copy'} {type}
                    </DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[300px] w-full pr-4">
                    <div className="space-y-2">
                        <div
                            className={`
                                flex items-center p-2 rounded-lg cursor-pointer
                                ${selectedPath === '' ? 'bg-accent' : 'hover:bg-accent/50'}
                            `}
                            onClick={() => setSelectedPath('')}
                        >
                            <FolderIcon className="h-4 w-4 mr-2"/>
                            <span>Root</span>
                        </div>
                        {getFolderList(structure).map((folder) => (
                            <div
                                key={folder.path}
                                className={`
                                    flex items-center p-2 rounded-lg cursor-pointer
                                    ${selectedPath === folder.path ? 'bg-accent' : 'hover:bg-accent/50'}
                                `}
                                onClick={() => setSelectedPath(folder.path)}
                            >
                                <FolderIcon className="h-4 w-4 mr-2"/>
                                <span>{folder.path}</span>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleOperation} disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                {mode === 'move' ? 'Moving...' : 'Copying...'}
                            </>
                        ) : (
                            mode === 'move' ? 'Move' : 'Copy'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// Helper function to get flat list of folders
const getFolderList = (structure: BucketTreeStructure | undefined) => {
    if (!structure) return [];

    return structure.contents
        .filter(item => item.type === 'FOLDER')
        .sort((a, b) => a.path.localeCompare(b.path));
};