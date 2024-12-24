import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFileSystem } from '@/providers/FileSystemProvider';
import { FolderIcon, Loader2 } from 'lucide-react';

interface MoveDialogProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'move' | 'copy';
    onSubmit: (destinationPath: string) => Promise<void>;
}

export const MoveDialog: React.FC<MoveDialogProps> = ({
    isOpen,
    onClose,
    mode,
    onSubmit
}) => {
    const { isLoading, getFolderStructure } = useFileSystem();
    const [selectedPath, setSelectedPath] = React.useState('');
    const folders = getFolderStructure();

    const handleOperation = async () => {
        await onSubmit(selectedPath);
        setSelectedPath('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'move' ? 'Move' : 'Copy'} file
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
                        {folders.map(({ path, name }) => (
                            <div
                                key={path}
                                className={`
                                    flex items-center p-2 rounded-lg cursor-pointer
                                    ${selectedPath === path ? 'bg-accent' : 'hover:bg-accent/50'}
                                `}
                                onClick={() => setSelectedPath(path)}
                            >
                                <FolderIcon className="h-4 w-4 mr-2"/>
                                <span>{name}</span>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleOperation} disabled={isLoading}>
                        {isLoading ? (
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